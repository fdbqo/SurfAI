import 'dotenv/config'
import mongoose from 'mongoose'
import { allSpots, type Spot } from '../../shared/spots/index'
import { windAt2m, scoreSpot } from '../../shared/index'
import { SpotConditionsHourly } from './models/SpotConditionsHourly'
import { fetchWithRetry } from './utils/retry'
import { validateConditions } from './utils/validation'
import { logInfo, logWarn, logError, logSuccess } from './utils/logger'
import { getLocalTime } from './utils/timezone'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'surf-ai'
const STORMGLASS_API_KEY = process.env.STORMGLASS_API_KEY
const BATCH_SIZE = Math.max(1, Math.min(50, parseInt(process.env.BATCH_SIZE || '5', 10) || 5))

let mongooseConnection: typeof mongoose | null = null

async function getMongoConnection() {
  if (!mongooseConnection || mongoose.connection.readyState !== 1) {
    if (!MONGODB_URI) {
      logError('MONGODB_URI environment variable is required')
      process.exit(1)
    }
    try {
      await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DATABASE })
      mongooseConnection = mongoose
      logInfo('MongoDB connected', { database: MONGODB_DATABASE })
    } catch (error) {
      logError('Failed to connect to MongoDB', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
  return mongooseConnection
}

if (!MONGODB_URI) {
  logError('MONGODB_URI environment variable is required')
  process.exit(1)
}

async function fetchTideData(lat: number, lon: number) {
  if (!STORMGLASS_API_KEY) {
    return null
  }

  try {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 2)

    const tideUrl =
      `https://api.stormglass.io/v2/tide/extreme?` +
      `lat=${lat}&lng=${lon}` +
      `&start=${Math.floor(now.getTime() / 1000)}` +
      `&end=${Math.floor(tomorrow.getTime() / 1000)}`

    const startTime = Date.now()
    const tideRes = await fetchWithRetry(tideUrl, {
      headers: {
        'Authorization': STORMGLASS_API_KEY,
      },
    }).catch(() => null)
    
    const latency = Date.now() - startTime

    if (!tideRes || !tideRes.ok) {
      logWarn(`Stormglass API request failed: ${tideRes?.status || 'network error'}`, { latency })
      return null
    }

    const tideData = await tideRes.json()

    if (!tideData.data || tideData.data.length === 0) {
      return null
    }

    const nowTimestamp = Math.floor(now.getTime() / 1000)
    const upcomingExtremes = tideData.data.filter((extreme: any) => 
      extreme.time >= nowTimestamp
    ).sort((a: any, b: any) => a.time - b.time)

    const nextHigh = upcomingExtremes.find((extreme: any) => extreme.type === 'high')
    const nextLow = upcomingExtremes.find((extreme: any) => extreme.type === 'low')

    const pastExtremes = tideData.data.filter((extreme: any) => 
      extreme.time < nowTimestamp
    ).sort((a: any, b: any) => b.time - a.time)

    const lastExtreme = pastExtremes[0]
    let tideState: "rising" | "falling" | "high" | "low" | undefined

    if (lastExtreme) {
      if (lastExtreme.type === 'high') {
        tideState = 'falling'
      } else {
        tideState = 'rising'
      }
    }

    let tideHeight: number | undefined
    if (lastExtreme && nextHigh && nextLow) {
      const timeBetween = lastExtreme.type === 'low' 
        ? (nextHigh.time - lastExtreme.time)
        : (nextLow.time - lastExtreme.time)
      if (timeBetween <= 0) {
        tideHeight = lastExtreme.height
      } else {
        const elapsed = nowTimestamp - lastExtreme.time
        const progress = Math.min(Math.max(elapsed / timeBetween, 0), 1)
      
        if (lastExtreme.type === 'low') {
          tideHeight = lastExtreme.height + (nextHigh.height - lastExtreme.height) * progress
        } else {
          tideHeight = lastExtreme.height - (lastExtreme.height - nextLow.height) * progress
        }
        if (tideHeight !== undefined) {
          tideHeight = Math.round(tideHeight * 100) / 100
        }
      }
    } else if (lastExtreme) {
      tideHeight = lastExtreme.height
    }

    return {
      tideHeight,
      tideState,
      nextHigh: nextHigh ? new Date(nextHigh.time * 1000) : undefined,
      nextLow: nextLow ? new Date(nextLow.time * 1000) : undefined,
    }
  } catch (error) {
    logWarn(`Failed to fetch tide data`, { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

async function fetchSpotConditions(lat: number, lon: number) {
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,` +
    `swell_wave_peak_period,` +
    `secondary_swell_wave_height,secondary_swell_wave_period,secondary_swell_wave_direction,` +
    `wave_height,wave_period,wave_direction,` +
    `sea_surface_temperature` +
    `&forecast_days=1&timezone=GMT`

  const windUrl =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m,` +
    `surface_pressure,visibility` +
    `&forecast_days=1&timezone=GMT`

  const startTime = Date.now()
  const [marineRes, windRes] = await Promise.all([
    fetchWithRetry(marineUrl).catch(async (err) => {
      const errorText = err instanceof Error ? err.message : String(err)
      logError(`Marine API failed`, { url: marineUrl, error: errorText })
      throw new Error(`Marine API failed: ${errorText}`)
    }),
    fetchWithRetry(windUrl).catch(async (err) => {
      const errorText = err instanceof Error ? err.message : String(err)
      logError(`Wind API failed`, { url: windUrl, error: errorText })
      throw new Error(`Wind API failed: ${errorText}`)
    }),
  ])

  const latency = Date.now() - startTime

  if (!marineRes.ok || !windRes.ok) {
    const errorText = !marineRes.ok ? await marineRes.text() : await windRes.text()
    const status = !marineRes.ok ? marineRes.status : windRes.status
    logError(`API request failed`, { status, latency, error: errorText.substring(0, 200) })
    throw new Error(`API request failed: ${status}`)
  }

  const [marine, wind] = await Promise.all([marineRes.json(), windRes.json()])

  if (!marine.hourly || !wind.hourly) {
    logError('Missing hourly data', {
      marineHasHourly: !!marine.hourly,
      windHasHourly: !!wind.hourly,
      latency,
    })
    throw new Error('Missing hourly data in API response')
  }

  const idx = 0
  const windSpeed10m = Math.round((wind.hourly.wind_speed_10m?.[idx] ?? 0) * 10) / 10
  const windSpeed2m = Math.round(windAt2m(windSpeed10m) * 10) / 10

  const rawConditions = {
    swellHeight: Math.round((marine.hourly.swell_wave_height?.[idx] ?? 0) * 10) / 10,
    swellPeriod: Math.round((marine.hourly.swell_wave_period?.[idx] ?? 0) * 10) / 10,
    swellDirection: Math.round(marine.hourly.swell_wave_direction?.[idx] ?? 0),
    swellPeakPeriod: marine.hourly.swell_wave_peak_period?.[idx] 
      ? Math.round((marine.hourly.swell_wave_peak_period[idx] ?? 0) * 10) / 10
      : undefined,
    secondarySwellHeight: marine.hourly.secondary_swell_wave_height?.[idx] !== undefined
      ? Math.round((marine.hourly.secondary_swell_wave_height[idx] ?? 0) * 10) / 10
      : undefined,
    secondarySwellPeriod: marine.hourly.secondary_swell_wave_period?.[idx] !== undefined
      ? Math.round((marine.hourly.secondary_swell_wave_period[idx] ?? 0) * 10) / 10
      : undefined,
    secondarySwellDirection: marine.hourly.secondary_swell_wave_direction?.[idx] !== undefined
      ? Math.round(marine.hourly.secondary_swell_wave_direction[idx] ?? 0)
      : undefined,
    secondarySwellPeakPeriod: undefined,
    waveHeight: Math.round((marine.hourly.wave_height?.[idx] ?? 0) * 10) / 10,
    wavePeriod: Math.round((marine.hourly.wave_period?.[idx] ?? 0) * 10) / 10,
    waveDirection: marine.hourly.wave_direction?.[idx] !== undefined
      ? Math.round(marine.hourly.wave_direction[idx] ?? 0)
      : undefined,
    windSpeed10m,
    windSpeed2m,
    windDirection: Math.round(wind.hourly.wind_direction_10m?.[idx] ?? 0),
    seaTemperature: marine.hourly.sea_surface_temperature?.[idx] !== undefined
      ? Math.round((marine.hourly.sea_surface_temperature[idx] ?? 0) * 10) / 10
      : undefined,
    pressure: wind.hourly.surface_pressure?.[idx] !== undefined
      ? Math.round((wind.hourly.surface_pressure[idx] ?? 0) * 10) / 10
      : undefined,
    visibility: wind.hourly.visibility?.[idx] !== undefined
      ? Math.round((wind.hourly.visibility[idx] ?? 0) * 10) / 10
      : undefined,
    sourceModel: 'open-meteo' as const,
  }

  const validatedConditions = validateConditions(rawConditions)
  logInfo('Fetched spot conditions', { latency, ...validatedConditions })
  
  return validatedConditions
}

type ForecastData = {
  daily: {
    time: string[]
    swell_wave_height_max?: number[]
    swell_wave_period_max?: number[]
    swell_wave_direction_dominant?: number[]
    secondary_swell_wave_height_max?: number[]
    secondary_swell_wave_period_max?: number[]
    secondary_swell_wave_direction_dominant?: number[]
    wave_height_max?: number[]
    wave_period_max?: number[]
  }
  windDaily: {
    wind_speed_10m_max?: number[]
    wind_direction_10m_dominant?: number[]
  }
  maxLength: number
}

function calculateDominantDirection(directions: number[]): number {
  if (directions.length === 0) return 0
  
  // Convert to radians, calculate average, convert back
  const radians = directions.map(d => (d * Math.PI) / 180)
  const sinSum = radians.reduce((sum, r) => sum + Math.sin(r), 0)
  const cosSum = radians.reduce((sum, r) => sum + Math.cos(r), 0)
  const avgRad = Math.atan2(sinSum / directions.length, cosSum / directions.length)
  let avgDeg = (avgRad * 180) / Math.PI
  if (avgDeg < 0) avgDeg += 360
  return Math.round(avgDeg)
}

function aggregateHourlyToDaily(
  hourlyTimes: string[],
  hourlyData: { [key: string]: number[] | undefined }
): {
  time: string[]
  swell_wave_height_max: number[]
  swell_wave_period_max: number[]
  swell_wave_direction_dominant: number[]
  secondary_swell_wave_height_max?: number[]
  secondary_swell_wave_period_max?: number[]
  secondary_swell_wave_direction_dominant?: number[]
  wave_height_max: number[]
  wave_period_max: number[]
  wind_speed_10m_max: number[]
  wind_direction_10m_dominant: number[]
} {
  const dailyMap = new Map<string, {
    swell_wave_height: number[]
    swell_wave_period: number[]
    swell_wave_direction: number[]
    secondary_swell_wave_height: number[]
    secondary_swell_wave_period: number[]
    secondary_swell_wave_direction: number[]
    wave_height: number[]
    wave_period: number[]
    wind_speed_10m: number[]
    wind_direction_10m: number[]
  }>()

  // Group hourly data by day
  for (let i = 0; i < hourlyTimes.length; i++) {
    const timeStr = hourlyTimes[i]
    if (!timeStr) continue
    
    const date = new Date(timeStr)
    const dayKey = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, {
        swell_wave_height: [],
        swell_wave_period: [],
        swell_wave_direction: [],
        secondary_swell_wave_height: [],
        secondary_swell_wave_period: [],
        secondary_swell_wave_direction: [],
        wave_height: [],
        wave_period: [],
        wind_speed_10m: [],
        wind_direction_10m: [],
      })
    }
    
    const dayData = dailyMap.get(dayKey)!
    
    if (hourlyData.swell_wave_height?.[i] !== undefined) {
      dayData.swell_wave_height.push(hourlyData.swell_wave_height[i])
    }
    if (hourlyData.swell_wave_period?.[i] !== undefined) {
      dayData.swell_wave_period.push(hourlyData.swell_wave_period[i])
    }
    if (hourlyData.swell_wave_direction?.[i] !== undefined) {
      dayData.swell_wave_direction.push(hourlyData.swell_wave_direction[i])
    }
    if (hourlyData.secondary_swell_wave_height?.[i] !== undefined) {
      dayData.secondary_swell_wave_height.push(hourlyData.secondary_swell_wave_height[i])
    }
    if (hourlyData.secondary_swell_wave_period?.[i] !== undefined) {
      dayData.secondary_swell_wave_period.push(hourlyData.secondary_swell_wave_period[i])
    }
    if (hourlyData.secondary_swell_wave_direction?.[i] !== undefined) {
      dayData.secondary_swell_wave_direction.push(hourlyData.secondary_swell_wave_direction[i])
    }
    if (hourlyData.wave_height?.[i] !== undefined) {
      dayData.wave_height.push(hourlyData.wave_height[i])
    }
    if (hourlyData.wave_period?.[i] !== undefined) {
      dayData.wave_period.push(hourlyData.wave_period[i])
    }
    if (hourlyData.wind_speed_10m?.[i] !== undefined) {
      dayData.wind_speed_10m.push(hourlyData.wind_speed_10m[i])
    }
    if (hourlyData.wind_direction_10m?.[i] !== undefined) {
      dayData.wind_direction_10m.push(hourlyData.wind_direction_10m[i])
    }
  }

  // Calculate daily aggregations
  const sortedDays = Array.from(dailyMap.keys()).sort()
  const dailyTime: string[] = []
  const dailySwellHeightMax: number[] = []
  const dailySwellPeriodMax: number[] = []
  const dailySwellDirectionDominant: number[] = []
  const dailySecondarySwellHeightMax: number[] = []
  const dailySecondarySwellPeriodMax: number[] = []
  const dailySecondarySwellDirectionDominant: number[] = []
  const dailyWaveHeightMax: number[] = []
  const dailyWavePeriodMax: number[] = []
  const dailyWindSpeedMax: number[] = []
  const dailyWindDirectionDominant: number[] = []

  for (const dayKey of sortedDays) {
    const dayData = dailyMap.get(dayKey)!
    dailyTime.push(dayKey)
    
    dailySwellHeightMax.push(dayData.swell_wave_height.length > 0 
      ? Math.max(...dayData.swell_wave_height) 
      : 0)
    dailySwellPeriodMax.push(dayData.swell_wave_period.length > 0 
      ? Math.max(...dayData.swell_wave_period) 
      : 0)
    dailySwellDirectionDominant.push(dayData.swell_wave_direction.length > 0
      ? calculateDominantDirection(dayData.swell_wave_direction)
      : 0)
    
    if (dayData.secondary_swell_wave_height.length > 0) {
      dailySecondarySwellHeightMax.push(Math.max(...dayData.secondary_swell_wave_height))
    }
    if (dayData.secondary_swell_wave_period.length > 0) {
      dailySecondarySwellPeriodMax.push(Math.max(...dayData.secondary_swell_wave_period))
    }
    if (dayData.secondary_swell_wave_direction.length > 0) {
      dailySecondarySwellDirectionDominant.push(calculateDominantDirection(dayData.secondary_swell_wave_direction))
    }
    
    dailyWaveHeightMax.push(dayData.wave_height.length > 0 
      ? Math.max(...dayData.wave_height) 
      : 0)
    dailyWavePeriodMax.push(dayData.wave_period.length > 0 
      ? Math.max(...dayData.wave_period) 
      : 0)
    dailyWindSpeedMax.push(dayData.wind_speed_10m.length > 0 
      ? Math.max(...dayData.wind_speed_10m) 
      : 0)
    dailyWindDirectionDominant.push(dayData.wind_direction_10m.length > 0
      ? calculateDominantDirection(dayData.wind_direction_10m)
      : 0)
  }

  return {
    time: dailyTime,
    swell_wave_height_max: dailySwellHeightMax,
    swell_wave_period_max: dailySwellPeriodMax,
    swell_wave_direction_dominant: dailySwellDirectionDominant,
    secondary_swell_wave_height_max: dailySecondarySwellHeightMax.length > 0 ? dailySecondarySwellHeightMax : undefined,
    secondary_swell_wave_period_max: dailySecondarySwellPeriodMax.length > 0 ? dailySecondarySwellPeriodMax : undefined,
    secondary_swell_wave_direction_dominant: dailySecondarySwellDirectionDominant.length > 0 ? dailySecondarySwellDirectionDominant : undefined,
    wave_height_max: dailyWaveHeightMax,
    wave_period_max: dailyWavePeriodMax,
    wind_speed_10m_max: dailyWindSpeedMax,
    wind_direction_10m_dominant: dailyWindDirectionDominant,
  }
}

async function fetchForecast(lat: number, lon: number): Promise<ForecastData> {
  const forecastUrl =
    `https://marine-api.open-meteo.com/v1/marine?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,` +
    `secondary_swell_wave_height,secondary_swell_wave_period,secondary_swell_wave_direction,` +
    `wave_height,wave_period` +
    `&forecast_days=16&timezone=GMT`

  const windForecastUrl =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m` +
    `&forecast_days=16&timezone=GMT`

  const startTime = Date.now()
  const [forecastRes, windForecastRes] = await Promise.all([
    fetchWithRetry(forecastUrl).catch(async (err) => {
      const errorText = err instanceof Error ? err.message : String(err)
      logError(`Forecast API failed`, { url: forecastUrl, error: errorText })
      throw new Error(`Forecast API failed: ${errorText}`)
    }),
    fetchWithRetry(windForecastUrl).catch(async (err) => {
      const errorText = err instanceof Error ? err.message : String(err)
      logError(`Wind Forecast API failed`, { url: windForecastUrl, error: errorText })
      throw new Error(`Wind Forecast API failed: ${errorText}`)
    }),
  ])

  const latency = Date.now() - startTime

  if (!forecastRes.ok || !windForecastRes.ok) {
    const errorText = !forecastRes.ok ? await forecastRes.text() : await windForecastRes.text()
    const status = !forecastRes.ok ? forecastRes.status : windForecastRes.status
    logError(`Forecast API request failed`, { status, latency, error: errorText.substring(0, 200) })
    throw new Error(`Forecast API request failed: ${status}`)
  }

  const [forecast, windForecast] = await Promise.all([
    forecastRes.json(),
    windForecastRes.json(),
  ])

  if (!forecast.hourly || !windForecast.hourly) {
    logError('Missing hourly data in forecast API response', { latency })
    throw new Error('Missing hourly data in forecast API response')
  }

  if (!forecast.hourly.time || forecast.hourly.time.length === 0) {
    logError('Empty time array in forecast API response', { latency })
    throw new Error('Empty time array in forecast API response')
  }

  // Aggregate hourly data to daily
  const aggregated = aggregateHourlyToDaily(forecast.hourly.time, {
    swell_wave_height: forecast.hourly.swell_wave_height,
    swell_wave_period: forecast.hourly.swell_wave_period,
    swell_wave_direction: forecast.hourly.swell_wave_direction,
    secondary_swell_wave_height: forecast.hourly.secondary_swell_wave_height,
    secondary_swell_wave_period: forecast.hourly.secondary_swell_wave_period,
    secondary_swell_wave_direction: forecast.hourly.secondary_swell_wave_direction,
    wave_height: forecast.hourly.wave_height,
    wave_period: forecast.hourly.wave_period,
    wind_speed_10m: windForecast.hourly.wind_speed_10m,
    wind_direction_10m: windForecast.hourly.wind_direction_10m,
  })

  const maxLength = aggregated.time.length

  if (maxLength === 0) {
    logError('All forecast arrays are empty', { latency })
    throw new Error('All forecast arrays are empty')
  }

  logInfo('Fetched forecast data', { days: maxLength, latency })

  return {
    daily: {
      time: aggregated.time,
      swell_wave_height_max: aggregated.swell_wave_height_max,
      swell_wave_period_max: aggregated.swell_wave_period_max,
      swell_wave_direction_dominant: aggregated.swell_wave_direction_dominant,
      secondary_swell_wave_height_max: aggregated.secondary_swell_wave_height_max,
      secondary_swell_wave_period_max: aggregated.secondary_swell_wave_period_max,
      secondary_swell_wave_direction_dominant: aggregated.secondary_swell_wave_direction_dominant,
      wave_height_max: aggregated.wave_height_max,
      wave_period_max: aggregated.wave_period_max,
    },
    windDaily: {
      wind_speed_10m_max: aggregated.wind_speed_10m_max,
      wind_direction_10m_dominant: aggregated.wind_direction_10m_dominant,
    },
    maxLength,
  }
}

function hasForecastChanged(existing: any, newData: any): boolean {
  if (!existing) return true

  const fieldsToCompare = [
    'swellHeight',
    'swellPeriod',
    'swellDirection',
    'waveHeight',
    'wavePeriod',
    'windSpeed10m',
    'windDirection',
  ]

  for (const field of fieldsToCompare) {
    const existingVal = existing[field]
    const newVal = newData[field]
    if (existingVal !== newVal && Math.abs((existingVal || 0) - (newVal || 0)) > 0.01) {
      return true
    }
  }

  if (existing.secondarySwellHeight !== newData.secondarySwellHeight ||
      existing.secondarySwellPeriod !== newData.secondarySwellPeriod ||
      existing.secondarySwellDirection !== newData.secondarySwellDirection) {
    return true
  }

  return false
}

function calculateForecastConfidence(dayIndex: number): number {
  return Math.max(0, 1 - dayIndex * 0.07)
}

async function updateSpotConditions(spot: Spot, SpotConditionsHourly: any, modelRun: string) {
  const spotStartTime = Date.now()

  try {
    logInfo(`Fetching conditions`, { spotId: spot.id, spotName: spot.name, operation: 'fetch' })
    
    const [conditions, tideData] = await Promise.all([
      fetchSpotConditions(spot.lat, spot.lon),
      fetchTideData(spot.lat, spot.lon),
    ])

    const combinedConditions = {
      ...conditions,
      ...(tideData || {}),
      sourceModel: tideData ? ('combined' as const) : (conditions?.sourceModel || 'open-meteo' as const),
    }

    const validatedConditions = validateConditions(combinedConditions)
    
    // Calculate local time
    const timestamp = new Date()
    const { localTime, localHour } = getLocalTime(timestamp, spot.lat, spot.lon)

    const dbWriteStart = Date.now()
    // Append-only: always create new document
    await SpotConditionsHourly.create({
      spotId: spot.id,
      timestamp,
      modelRun,
      localTime,
      localHour,
      ...validatedConditions,
    })
    const dbLatency = Date.now() - dbWriteStart

    logInfo(`Stored hourly conditions`, {
      spotId: spot.id,
      spotName: spot.name,
      latency: dbLatency,
      operation: 'write',
      localHour,
    })

    const totalLatency = Date.now() - spotStartTime
    logSuccess(`Spot updated`, {
      spotId: spot.id,
      spotName: spot.name,
      latency: totalLatency,
    })
  } catch (error) {
    const totalLatency = Date.now() - spotStartTime
    logError(`Spot update failed`, {
      spotId: spot.id,
      spotName: spot.name,
      error: error instanceof Error ? error.message : String(error),
      latency: totalLatency,
    })
    throw error
  }
}

async function updateConditions() {
  const overallStartTime = Date.now()

  try {
    await getMongoConnection()

    const modelRun = new Date().toISOString()

    const spots: Spot[] = [...allSpots]

    logInfo(`Starting update conditions`, {
      spotCount: spots.length,
      batchSize: BATCH_SIZE,
    })

    for (let i = 0; i < spots.length; i += BATCH_SIZE) {
      const batch = spots.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map((spot) =>
        updateSpotConditions(spot, SpotConditionsHourly, modelRun).catch((err) => {
          logError(`Spot failed in batch`, {
            spotId: spot.id,
            spotName: spot.name,
            error: err instanceof Error ? err.message : String(err),
          })
          return null
        })
      )

      await Promise.all(batchPromises)
      logInfo(`Batch completed`, { batchNumber: Math.floor(i / BATCH_SIZE) + 1, batchSize: batch.length })
    }

    const totalLatency = Date.now() - overallStartTime
    logSuccess(`Update complete`, { totalLatency, spotCount: spots.length })
  } catch (error) {
    const totalLatency = Date.now() - overallStartTime
    logError(`Fatal error`, {
      error: error instanceof Error ? error.message : String(error),
      totalLatency,
    })
    process.exit(1)
  } finally {
    if (mongooseConnection) {
      await mongoose.disconnect()
      mongooseConnection = null
    }
    process.exit(0)
  }
}

if (require.main === module) {
  updateConditions()
}

export { updateConditions }

