import 'dotenv/config'
import mongoose from 'mongoose'
import { allSpots, type Spot } from '../../shared/spots/index'
import { windAt2m, scoreSpot } from '../../shared/index'
import { SpotForecast3h } from './models/SpotForecast3h'
import { SpotForecastDaily } from './models/SpotForecastDaily'
import { SpotForecastRuns } from './models/SpotForecastRuns'
import { fetchWithRetry } from './utils/retry'
import { normalizeToUTCMidnight, getDayIndex } from './utils/dateHelpers'
import { validateConditions, validateSwellHeight, validateSwellPeriod, validateDirection } from './utils/validation'
import { logInfo, logWarn, logError, logSuccess } from './utils/logger'
import { calculateForecastStability } from './utils/stability'
import { getLocalTime } from './utils/timezone'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'surf-ai'
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

function calculateDominantDirection(directions: number[]): number {
  if (directions.length === 0) return 0
  
  const radians = directions.map(d => (d * Math.PI) / 180)
  const sinSum = radians.reduce((sum, r) => sum + Math.sin(r), 0)
  const cosSum = radians.reduce((sum, r) => sum + Math.cos(r), 0)
  const avgRad = Math.atan2(sinSum / directions.length, cosSum / directions.length)
  let avgDeg = (avgRad * 180) / Math.PI
  if (avgDeg < 0) avgDeg += 360
  return Math.round(avgDeg)
}

function calculateForecastConfidence(dayIndex: number): number {
  return Math.max(0, 1 - dayIndex * 0.07)
}

function inferBestWindow(windTrend: number[], swellTrend: number[]): "morning" | "midday" | "afternoon" | undefined {
  // Simple heuristic: find window with best conditions
  // Morning: hours 5-11, Midday: 11-15, Afternoon: 15-20
  const morningScores: number[] = []
  const middayScores: number[] = []
  const afternoonScores: number[] = []
  
  for (let i = 0; i < 24; i++) {
    const wind = windTrend[i] || 0
    const swell = swellTrend[i] || 0
    const score = swell - (wind * 0.1) // Higher swell, lower wind = better
    
    if (i >= 5 && i < 11) morningScores.push(score)
    else if (i >= 11 && i < 15) middayScores.push(score)
    else if (i >= 15 && i < 20) afternoonScores.push(score)
  }
  
  const morningAvg = morningScores.length > 0 ? morningScores.reduce((a, b) => a + b, 0) / morningScores.length : -Infinity
  const middayAvg = middayScores.length > 0 ? middayScores.reduce((a, b) => a + b, 0) / middayScores.length : -Infinity
  const afternoonAvg = afternoonScores.length > 0 ? afternoonScores.reduce((a, b) => a + b, 0) / afternoonScores.length : -Infinity
  
  const max = Math.max(morningAvg, middayAvg, afternoonAvg)
  if (max === morningAvg) return 'morning'
  if (max === middayAvg) return 'midday'
  if (max === afternoonAvg) return 'afternoon'
  return undefined
}

async function fetchHourlyForecast(lat: number, lon: number, days: number = 7) {
  const forecastUrl =
    `https://marine-api.open-meteo.com/v1/marine?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,` +
    `secondary_swell_wave_height,secondary_swell_wave_period,secondary_swell_wave_direction,` +
    `wave_height,wave_period` +
    `&forecast_days=${days}&timezone=GMT`

  const windForecastUrl =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m` +
    `&forecast_days=${days}&timezone=GMT`

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

  return {
    hourly: {
      time: forecast.hourly.time as string[],
      swell_wave_height: forecast.hourly.swell_wave_height as number[],
      swell_wave_period: forecast.hourly.swell_wave_period as number[],
      swell_wave_direction: forecast.hourly.swell_wave_direction as number[],
      secondary_swell_wave_height: forecast.hourly.secondary_swell_wave_height as number[] | undefined,
      secondary_swell_wave_period: forecast.hourly.secondary_swell_wave_period as number[] | undefined,
      secondary_swell_wave_direction: forecast.hourly.secondary_swell_wave_direction as number[] | undefined,
      wave_height: forecast.hourly.wave_height as number[],
      wave_period: forecast.hourly.wave_period as number[],
    },
    windHourly: {
      wind_speed_10m: windForecast.hourly.wind_speed_10m as number[],
      wind_direction_10m: windForecast.hourly.wind_direction_10m as number[],
    },
    latency,
  }
}

async function fetchDailyForecast(lat: number, lon: number) {
  // Use hourly data and aggregate to daily (since daily API doesn't support secondary swell)
  const hourlyData = await fetchHourlyForecast(lat, lon, 15)
  
  // Aggregate hourly to daily
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

  for (let i = 0; i < hourlyData.hourly.time.length; i++) {
    const timeStr = hourlyData.hourly.time[i]
    if (!timeStr) continue
    
    const date = new Date(timeStr)
    const dayKey = date.toISOString().split('T')[0]
    
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
    
    if (hourlyData.hourly.swell_wave_height?.[i] !== undefined) {
      dayData.swell_wave_height.push(hourlyData.hourly.swell_wave_height[i])
    }
    if (hourlyData.hourly.swell_wave_period?.[i] !== undefined) {
      dayData.swell_wave_period.push(hourlyData.hourly.swell_wave_period[i])
    }
    if (hourlyData.hourly.swell_wave_direction?.[i] !== undefined) {
      dayData.swell_wave_direction.push(hourlyData.hourly.swell_wave_direction[i])
    }
    if (hourlyData.hourly.secondary_swell_wave_height?.[i] !== undefined) {
      dayData.secondary_swell_wave_height.push(hourlyData.hourly.secondary_swell_wave_height[i])
    }
    if (hourlyData.hourly.secondary_swell_wave_period?.[i] !== undefined) {
      dayData.secondary_swell_wave_period.push(hourlyData.hourly.secondary_swell_wave_period[i])
    }
    if (hourlyData.hourly.secondary_swell_wave_direction?.[i] !== undefined) {
      dayData.secondary_swell_wave_direction.push(hourlyData.hourly.secondary_swell_wave_direction[i])
    }
    if (hourlyData.hourly.wave_height?.[i] !== undefined) {
      dayData.wave_height.push(hourlyData.hourly.wave_height[i])
    }
    if (hourlyData.hourly.wave_period?.[i] !== undefined) {
      dayData.wave_period.push(hourlyData.hourly.wave_period[i])
    }
    if (hourlyData.windHourly.wind_speed_10m?.[i] !== undefined) {
      dayData.wind_speed_10m.push(hourlyData.windHourly.wind_speed_10m[i])
    }
    if (hourlyData.windHourly.wind_direction_10m?.[i] !== undefined) {
      dayData.wind_direction_10m.push(hourlyData.windHourly.wind_direction_10m[i])
    }
  }

  const sortedDays = Array.from(dailyMap.keys()).sort()
  const dailyData: Array<{
    date: string
    swellHeightMax: number
    swellPeriodMax: number
    swellDirectionDominant: number
    secondarySwellHeightMax?: number
    secondarySwellPeriodMax?: number
    secondarySwellDirectionDominant?: number
    waveHeightMax: number
    wavePeriodMax?: number
    windSpeedAvg: number
    windDirectionDominant: number
  }> = []

  for (const dayKey of sortedDays) {
    const dayData = dailyMap.get(dayKey)!
    dailyData.push({
      date: dayKey,
      swellHeightMax: dayData.swell_wave_height.length > 0 ? Math.max(...dayData.swell_wave_height) : 0,
      swellPeriodMax: dayData.swell_wave_period.length > 0 ? Math.max(...dayData.swell_wave_period) : 0,
      swellDirectionDominant: dayData.swell_wave_direction.length > 0
        ? calculateDominantDirection(dayData.swell_wave_direction)
        : 0,
      secondarySwellHeightMax: dayData.secondary_swell_wave_height.length > 0
        ? Math.max(...dayData.secondary_swell_wave_height)
        : undefined,
      secondarySwellPeriodMax: dayData.secondary_swell_wave_period.length > 0
        ? Math.max(...dayData.secondary_swell_wave_period)
        : undefined,
      secondarySwellDirectionDominant: dayData.secondary_swell_wave_direction.length > 0
        ? calculateDominantDirection(dayData.secondary_swell_wave_direction)
        : undefined,
      waveHeightMax: dayData.wave_height.length > 0 ? Math.max(...dayData.wave_height) : 0,
      wavePeriodMax: dayData.wave_period.length > 0 ? Math.max(...dayData.wave_period) : undefined,
      windSpeedAvg: dayData.wind_speed_10m.length > 0
        ? dayData.wind_speed_10m.reduce((a, b) => a + b, 0) / dayData.wind_speed_10m.length
        : 0,
      windDirectionDominant: dayData.wind_direction_10m.length > 0
        ? calculateDominantDirection(dayData.wind_direction_10m)
        : 0,
    })
  }

  return { dailyData, hourlyData }
}

function roundTo3Hours(date: Date): Date {
  const rounded = new Date(date)
  const hours = rounded.getUTCHours()
  const roundedHours = Math.floor(hours / 3) * 3
  rounded.setUTCHours(roundedHours, 0, 0, 0)
  return rounded
}

async function updateSpotForecast(spot: Spot, modelRunTime: Date) {
  const spotStartTime = Date.now()

  try {
    logInfo(`Fetching forecast`, { spotId: spot.id, spotName: spot.name, operation: 'fetch' })
    
    const { dailyData, hourlyData } = await fetchDailyForecast(spot.lat, spot.lon)
    const today = normalizeToUTCMidnight(new Date())

    // Process 3-7 day horizon: aggregate into 3-hour blocks
    const threeHourBlocks: Array<{
      blockStart: Date
      swellHeight: number
      swellPeriod: number
      swellDirection: number
      secondarySwellHeight?: number
      secondarySwellPeriod?: number
      secondarySwellDirection?: number
      waveHeight: number
      wavePeriod: number
      windSpeed10m: number
      windSpeed2m: number
      windDirection: number
      blockScore: number
      localHour: number
    }> = []

    for (let i = 0; i < hourlyData.hourly.time.length; i++) {
      const timeStr = hourlyData.hourly.time[i]
      if (!timeStr) continue
      
      const hourDate = new Date(timeStr)
      const dayIndex = getDayIndex(hourDate, today)
      
      // Only process days 3-7
      if (dayIndex < 3 || dayIndex > 7) continue
      
      const blockStart = roundTo3Hours(hourDate)
      const { localHour } = getLocalTime(blockStart, spot.lat, spot.lon)
      
      const swellHeight = hourlyData.hourly.swell_wave_height?.[i] ?? 0
      const swellPeriod = hourlyData.hourly.swell_wave_period?.[i] ?? 0
      const swellDirection = hourlyData.hourly.swell_wave_direction?.[i] ?? 0
      const waveHeight = hourlyData.hourly.wave_height?.[i] ?? 0
      const wavePeriod = hourlyData.hourly.wave_period?.[i] ?? 0
      const windSpeed10m = hourlyData.windHourly.wind_speed_10m?.[i] ?? 0
      const windSpeed2m = windAt2m(windSpeed10m)
      const windDirection = hourlyData.windHourly.wind_direction_10m?.[i] ?? 0

      const score = scoreSpot({
        swellHeight,
        swellPeriod,
        swellDirection,
        waveHeight,
        wavePeriod,
        windSpeed2m,
        windSpeed10m,
        windDirection,
        spotOrientation: spot.orientation,
        ability: 'intermediate',
        localHour,
      })

      threeHourBlocks.push({
        blockStart,
        swellHeight: Math.round(swellHeight * 100) / 100,
        swellPeriod: Math.round(swellPeriod * 100) / 100,
        swellDirection: Math.round(swellDirection),
        secondarySwellHeight: hourlyData.hourly.secondary_swell_wave_height?.[i] !== undefined
          ? Math.round((hourlyData.hourly.secondary_swell_wave_height[i] || 0) * 100) / 100
          : undefined,
        secondarySwellPeriod: hourlyData.hourly.secondary_swell_wave_period?.[i] !== undefined
          ? Math.round((hourlyData.hourly.secondary_swell_wave_period[i] || 0) * 100) / 100
          : undefined,
        secondarySwellDirection: hourlyData.hourly.secondary_swell_wave_direction?.[i] !== undefined
          ? Math.round(hourlyData.hourly.secondary_swell_wave_direction[i] || 0)
          : undefined,
        waveHeight: Math.round(waveHeight * 100) / 100,
        wavePeriod: Math.round(wavePeriod * 100) / 100,
        windSpeed10m: Math.round(windSpeed10m * 10) / 10,
        windSpeed2m: Math.round(windSpeed2m * 10) / 10,
        windDirection: Math.round(windDirection),
        blockScore: score.score,
        localHour,
      })
    }

    // Group 3-hour blocks and aggregate
    const blockMap = new Map<string, typeof threeHourBlocks>()
    for (const block of threeHourBlocks) {
      const key = block.blockStart.toISOString()
      if (!blockMap.has(key)) {
        blockMap.set(key, [])
      }
      blockMap.get(key)!.push(block)
    }

    // Store 3-hour blocks
    let threeHourCount = 0
    for (const [key, blocks] of blockMap.entries()) {
      if (blocks.length === 0) continue
      
      // Average values for the block
      const avgBlock = {
        blockStart: blocks[0].blockStart,
        swellHeight: blocks.reduce((sum, b) => sum + b.swellHeight, 0) / blocks.length,
        swellPeriod: blocks.reduce((sum, b) => sum + b.swellPeriod, 0) / blocks.length,
        swellDirection: calculateDominantDirection(blocks.map(b => b.swellDirection)),
        secondarySwellHeight: blocks.some(b => b.secondarySwellHeight !== undefined)
          ? blocks.filter(b => b.secondarySwellHeight !== undefined).reduce((sum, b) => sum + (b.secondarySwellHeight || 0), 0) / blocks.filter(b => b.secondarySwellHeight !== undefined).length
          : undefined,
        secondarySwellPeriod: blocks.some(b => b.secondarySwellPeriod !== undefined)
          ? blocks.filter(b => b.secondarySwellPeriod !== undefined).reduce((sum, b) => sum + (b.secondarySwellPeriod || 0), 0) / blocks.filter(b => b.secondarySwellPeriod !== undefined).length
          : undefined,
        secondarySwellDirection: blocks.some(b => b.secondarySwellDirection !== undefined)
          ? calculateDominantDirection(blocks.filter(b => b.secondarySwellDirection !== undefined).map(b => b.secondarySwellDirection!))
          : undefined,
        waveHeight: blocks.reduce((sum, b) => sum + b.waveHeight, 0) / blocks.length,
        wavePeriod: blocks.reduce((sum, b) => sum + b.wavePeriod, 0) / blocks.length,
        windSpeed10m: blocks.reduce((sum, b) => sum + b.windSpeed10m, 0) / blocks.length,
        windSpeed2m: blocks.reduce((sum, b) => sum + b.windSpeed2m, 0) / blocks.length,
        windDirection: calculateDominantDirection(blocks.map(b => b.windDirection)),
        blockScore: blocks.reduce((sum, b) => sum + b.blockScore, 0) / blocks.length,
        localHour: blocks[0].localHour,
      }

      await SpotForecast3h.updateOne(
        { spotId: spot.id, blockStart: avgBlock.blockStart },
        {
          $set: {
            spotId: spot.id,
            blockStart: avgBlock.blockStart,
            modelRunTime,
            swellHeight: Math.round(avgBlock.swellHeight * 100) / 100,
            swellPeriod: Math.round(avgBlock.swellPeriod * 100) / 100,
            swellDirection: Math.round(avgBlock.swellDirection),
            secondarySwellHeight: avgBlock.secondarySwellHeight !== undefined
              ? validateSwellHeight(Math.round(avgBlock.secondarySwellHeight * 100) / 100)
              : undefined,
            secondarySwellPeriod: avgBlock.secondarySwellPeriod !== undefined
              ? validateSwellPeriod(Math.round(avgBlock.secondarySwellPeriod * 100) / 100)
              : undefined,
            secondarySwellDirection: avgBlock.secondarySwellDirection !== undefined
              ? validateDirection(Math.round(avgBlock.secondarySwellDirection))
              : undefined,
            waveHeight: Math.round(avgBlock.waveHeight * 100) / 100,
            wavePeriod: Math.round(avgBlock.wavePeriod * 100) / 100,
            windSpeed10m: Math.round(avgBlock.windSpeed10m * 10) / 10,
            windSpeed2m: Math.round(avgBlock.windSpeed2m * 10) / 10,
            windDirection: Math.round(avgBlock.windDirection),
            blockScore: Math.round(avgBlock.blockScore * 10) / 10,
            localHour: avgBlock.localHour,
          },
        },
        { upsert: true }
      )
      threeHourCount++
    }

    // Process 7-15 day horizon: daily forecasts
    let dailyCount = 0
    let forecastRunCount = 0

    for (const day of dailyData) {
      const forecastDate = normalizeToUTCMidnight(new Date(day.date + 'T00:00:00.000Z'))
      if (isNaN(forecastDate.getTime())) continue
      
      const dayIndex = Math.max(0, getDayIndex(forecastDate, today))
      
      // Only process days 7-15
      if (dayIndex < 7 || dayIndex > 15) continue

      const confidence = calculateForecastConfidence(dayIndex)
      const validated = validateConditions({
        swellHeight: day.swellHeightMax,
        swellPeriod: day.swellPeriodMax,
        swellDirection: day.swellDirectionDominant,
        waveHeight: day.waveHeightMax,
        wavePeriod: day.wavePeriodMax || 0,
        windSpeed10m: day.windSpeedAvg,
        windDirection: day.windDirectionDominant,
      })

      const dailyScore = scoreSpot({
        swellHeight: validated.swellHeight || 0,
        swellPeriod: validated.swellPeriod || 0,
        swellDirection: validated.swellDirection || 0,
        waveHeight: validated.waveHeight || 0,
        wavePeriod: validated.wavePeriod || 0,
        windSpeed2m: windAt2m(day.windSpeedAvg),
        windSpeed10m: day.windSpeedAvg,
        windDirection: day.windDirectionDominant,
        spotOrientation: spot.orientation,
        ability: 'intermediate',
      })

      const existingForecast = await SpotForecastDaily.findOne({
        spotId: spot.id,
        date: forecastDate,
      }).lean()

      const stability = existingForecast
        ? calculateForecastStability(existingForecast, {
            swellHeight: validated.swellHeight,
            swellPeriod: validated.swellPeriod,
            swellDirection: validated.swellDirection,
            waveHeight: validated.waveHeight,
            windSpeed10m: day.windSpeedAvg,
          })
        : 0.5

      // Simple best window estimate (would need hourly data for better heuristic)
      const bestWindowEstimate = inferBestWindow(
        hourlyData.windHourly.wind_speed_10m || [],
        hourlyData.hourly.swell_wave_height || []
      )

      // Store in SpotForecastDaily
      await SpotForecastDaily.updateOne(
        { spotId: spot.id, date: forecastDate },
        {
          $set: {
            spotId: spot.id,
            date: forecastDate,
            dayIndex,
            swellHeightMax: Math.round((validated.swellHeight || 0) * 100) / 100,
            swellPeriodMax: Math.round((validated.swellPeriod || 0) * 100) / 100,
            swellDirection: Math.round(validated.swellDirection || 0),
            secondarySwellHeight: day.secondarySwellHeightMax !== undefined
              ? validateSwellHeight(Math.round(day.secondarySwellHeightMax * 100) / 100)
              : undefined,
            secondarySwellPeriod: day.secondarySwellPeriodMax !== undefined
              ? validateSwellPeriod(Math.round(day.secondarySwellPeriodMax * 100) / 100)
              : undefined,
            secondarySwellDirection: day.secondarySwellDirectionDominant !== undefined
              ? validateDirection(Math.round(day.secondarySwellDirectionDominant))
              : undefined,
            waveHeightMax: Math.round((validated.waveHeight || 0) * 100) / 100,
            wavePeriod: day.wavePeriodMax !== undefined ? Math.round(day.wavePeriodMax * 100) / 100 : undefined,
            windSpeedAvg: Math.round(day.windSpeedAvg * 10) / 10,
            windDirectionDominant: Math.round(day.windDirectionDominant),
            dailyScore: dailyScore.score,
            confidence,
            bestWindowEstimate,
            stability,
            source: 'forecast' as const,
          },
        },
        { upsert: true }
      )
      dailyCount++

      // Store in SpotForecastRuns (append-only history)
      await SpotForecastRuns.create({
        spotId: spot.id,
        modelRunTime,
        date: forecastDate,
        dayIndex,
        swellHeightMax: Math.round((validated.swellHeight || 0) * 100) / 100,
        swellPeriodMax: Math.round((validated.swellPeriod || 0) * 100) / 100,
        waveHeightMax: Math.round((validated.waveHeight || 0) * 100) / 100,
        windSpeedAvg: Math.round(day.windSpeedAvg * 10) / 10,
        windDirectionDominant: Math.round(day.windDirectionDominant),
        confidence,
      })
      forecastRunCount++
    }

    const totalLatency = Date.now() - spotStartTime
    logSuccess(`Spot forecast updated`, {
      spotId: spot.id,
      spotName: spot.name,
      latency: totalLatency,
      threeHourBlocks: threeHourCount,
      dailyForecasts: dailyCount,
      forecastRuns: forecastRunCount,
    })
  } catch (error) {
    const totalLatency = Date.now() - spotStartTime
    logError(`Spot forecast failed`, {
      spotId: spot.id,
      spotName: spot.name,
      error: error instanceof Error ? error.message : String(error),
      latency: totalLatency,
    })
    throw error
  }
}

async function updateForecast() {
  const overallStartTime = Date.now()

  try {
    await getMongoConnection()

    const modelRunTime = new Date()
    const spots: Spot[] = [...allSpots]

    logInfo(`Starting update forecast`, {
      spotCount: spots.length,
      batchSize: BATCH_SIZE,
      modelRunTime: modelRunTime.toISOString(),
    })

    for (let i = 0; i < spots.length; i += BATCH_SIZE) {
      const batch = spots.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map((spot) =>
        updateSpotForecast(spot, modelRunTime).catch((err) => {
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
    logSuccess(`Forecast update complete`, { totalLatency, spotCount: spots.length })
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
  updateForecast()
}

export { updateForecast }

