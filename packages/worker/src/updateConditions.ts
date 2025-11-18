import 'dotenv/config'
import mongoose from 'mongoose'
import { allSpots, type Spot } from '../../shared/spots/index'
import { windAt2m } from '../../shared/index'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'surf-ai'

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required')
  process.exit(1)
}

async function fetchSpotConditions(lat: number, lon: number) {
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,` +
    `wave_height,wave_period,wave_direction` +
    `&forecast_days=1&timezone=GMT`

  const windUrl =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m` +
    `&forecast_days=1&timezone=GMT`

  const [marineRes, windRes] = await Promise.all([
    fetch(marineUrl),
    fetch(windUrl),
  ])

  if (!marineRes.ok || !windRes.ok) {
    throw new Error(`API request failed: ${marineRes.status} / ${windRes.status}`)
  }

  const [marine, wind] = await Promise.all([marineRes.json(), windRes.json()])

  if (!marine.hourly || !wind.hourly) {
    throw new Error('Missing hourly data in API response')
  }

  const idx = 0
  const windSpeed10m = Math.round((wind.hourly.wind_speed_10m?.[idx] ?? 0) * 10) / 10
  const windSpeed2m = Math.round(windAt2m(windSpeed10m) * 10) / 10

  return {
    swellHeight: Math.round((marine.hourly.swell_wave_height?.[idx] ?? 0) * 10) / 10,
    swellPeriod: Math.round((marine.hourly.swell_wave_period?.[idx] ?? 0) * 10) / 10,
    swellDirection: Math.round(marine.hourly.swell_wave_direction?.[idx] ?? 0),
    waveHeight: Math.round((marine.hourly.wave_height?.[idx] ?? 0) * 10) / 10,
    wavePeriod: Math.round((marine.hourly.wave_period?.[idx] ?? 0) * 10) / 10,
    windSpeed10m,
    windSpeed2m,
    windDirection: Math.round(wind.hourly.wind_direction_10m?.[idx] ?? 0),
  }
}

async function updateConditions() {
  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DATABASE,
    })

    const { SpotConditions } = await import('./models/SpotConditions')
    const modelRun = new Date().toISOString()

    const spots: Spot[] = [...allSpots]

    console.log(`Updating conditions for ${spots.length} spots...`)

    for (const spot of spots) {
      try {
        const conditions = await fetchSpotConditions(spot.lat, spot.lon)

        await SpotConditions.create({
          spotId: spot.id,
          timestamp: new Date(),
          ...conditions,
          modelRun,
        })

        console.log(`✓ ${spot.name} - conditions updated`)
      } catch (error) {
        console.error(`✗ ${spot.name} - failed:`, error instanceof Error ? error.message : String(error))
      }
    }

    console.log('Update complete')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

updateConditions()

