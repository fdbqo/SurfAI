import 'dotenv/config'
import mongoose from 'mongoose'
import { SpotConditionsHourly } from './models/SpotConditionsHourly'
import { SpotForecastDaily } from './models/SpotForecastDaily'
import { allSpots } from '../../shared/spots/index'
import { scoreSpot } from '../../shared/index'
import { validateSwellHeight, validateSwellPeriod, validateDirection } from './utils/validation'
import { logInfo, logWarn, logError, logSuccess } from './utils/logger'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'surf-ai'

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required')
  process.exit(1)
}

async function aggregateDaily() {
  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DATABASE,
    })

    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(0, 0, 0, 0)

    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setUTCHours(23, 59, 59, 999)

    logInfo(`Aggregating data for ${yesterday.toISOString().split('T')[0]}...`)

    const spots = await SpotConditionsHourly.distinct('spotId')
    if (spots.length === 0) {
      logInfo('No spots found in database')
      return
    }
    logInfo(`Processing ${spots.length} spots...`)

    for (const spotId of spots) {
      const spot = allSpots.find((s) => s.id === spotId)
      if (!spot) {
        logWarn(`Spot not found: ${spotId}`)
        continue
      }

      const samples = await SpotConditionsHourly.find({
        spotId,
        timestamp: {
          $gte: yesterday,
          $lte: yesterdayEnd,
        },
      }).lean()

      if (samples.length === 0) continue

      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      yesterday.setUTCHours(0, 0, 0, 0)
      const dayIndex = Math.floor((yesterday.getTime() - today.getTime()) / 86400000)

      const avgSwellHeight =
        samples.reduce((sum, s) => sum + (s.swellHeight || 0), 0) / samples.length
      const avgSwellPeriod =
        samples.reduce((sum, s) => sum + (s.swellPeriod || 0), 0) / samples.length
      const avgSwellDirection =
        samples.reduce((sum, s) => sum + (s.swellDirection || 0), 0) / samples.length

      const secondarySwellHeightSamples = samples
        .map((s) => s.secondarySwellHeight)
        .filter((h) => h !== undefined && h !== null) as number[]
      const avgSecondarySwellHeight =
        secondarySwellHeightSamples.length > 0
          ? secondarySwellHeightSamples.reduce((sum, h) => sum + h, 0) / secondarySwellHeightSamples.length
          : undefined

      const secondarySwellPeriodSamples = samples
        .map((s) => s.secondarySwellPeriod)
        .filter((p) => p !== undefined && p !== null) as number[]
      const avgSecondarySwellPeriod =
        secondarySwellPeriodSamples.length > 0
          ? secondarySwellPeriodSamples.reduce((sum, p) => sum + p, 0) / secondarySwellPeriodSamples.length
          : undefined

      const secondarySwellDirectionSamples = samples
        .map((s) => s.secondarySwellDirection)
        .filter((d) => d !== undefined && d !== null) as number[]
      const avgSecondarySwellDirection =
        secondarySwellDirectionSamples.length > 0
          ? secondarySwellDirectionSamples.reduce((sum, d) => sum + d, 0) / secondarySwellDirectionSamples.length
          : undefined

      const avgWaveHeight =
        samples.reduce((sum, s) => sum + (s.waveHeight || 0), 0) / samples.length
      const avgWavePeriod =
        samples.reduce((sum, s) => sum + (s.wavePeriod || 0), 0) / samples.length

      const avgWindSpeed10m =
        samples.reduce((sum, s) => sum + (s.windSpeed10m || 0), 0) / samples.length

      const windDirections = samples.map((s) => s.windDirection || 0)
      const directionCounts = new Map<number, number>()
      for (const dir of windDirections) {
        directionCounts.set(dir, (directionCounts.get(dir) || 0) + 1)
      }
      let maxCount = 0
      let dominantWindDirection = windDirections[0] || 0
      for (const [dir, count] of directionCounts.entries()) {
        if (count > maxCount) {
          maxCount = count
          dominantWindDirection = dir
        }
      }

      const score = scoreSpot({
        swellHeight: avgSwellHeight,
        swellPeriod: avgSwellPeriod,
        swellDirection: avgSwellDirection,
        waveHeight: avgWaveHeight,
        wavePeriod: avgWavePeriod,
        windSpeed2m: samples.reduce((sum, s) => sum + (s.windSpeed2m || 0), 0) / samples.length,
        windSpeed10m: avgWindSpeed10m,
        windDirection: dominantWindDirection,
        spotOrientation: spot.orientation,
        ability: 'intermediate',
      })

      let bestHour: number | undefined
      let bestScore = -1

      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(yesterday)
        hourStart.setUTCHours(hour, 0, 0, 0)

        const hourEnd = new Date(yesterday)
        hourEnd.setUTCHours(hour, 59, 59, 999)

        const hourSamples = samples.filter(
          (s) => {
            const sampleTime = new Date(s.timestamp)
            return sampleTime >= hourStart && sampleTime <= hourEnd
          }
        )

        if (hourSamples.length === 0) continue

        const hourAvgSwellHeight =
          hourSamples.reduce((sum, s) => sum + (s.swellHeight || 0), 0) / hourSamples.length
        const hourAvgSwellPeriod =
          hourSamples.reduce((sum, s) => sum + (s.swellPeriod || 0), 0) / hourSamples.length
        const hourAvgSwellDirection =
          hourSamples.reduce((sum, s) => sum + (s.swellDirection || 0), 0) / hourSamples.length
        const hourAvgWaveHeight =
          hourSamples.reduce((sum, s) => sum + (s.waveHeight || 0), 0) / hourSamples.length
        const hourAvgWavePeriod =
          hourSamples.reduce((sum, s) => sum + (s.wavePeriod || 0), 0) / hourSamples.length
        const hourWindSpeed2m = hourSamples.length > 0
          ? hourSamples.reduce((sum, s) => sum + (s.windSpeed2m || 0), 0) / hourSamples.length
          : 0
        const hourWindSpeed10m =
          hourSamples.reduce((sum, s) => sum + (s.windSpeed10m || 0), 0) / hourSamples.length
        const hourWindDirection =
          hourSamples.reduce((sum, s) => sum + (s.windDirection || 0), 0) / hourSamples.length

        const hourScore = scoreSpot({
          swellHeight: hourAvgSwellHeight,
          swellPeriod: hourAvgSwellPeriod,
          swellDirection: hourAvgSwellDirection,
          waveHeight: hourAvgWaveHeight,
          wavePeriod: hourAvgWavePeriod,
          windSpeed2m: hourWindSpeed2m,
          windSpeed10m: hourWindSpeed10m,
          windDirection: hourWindDirection,
          spotOrientation: spot.orientation,
          ability: 'intermediate',
        })

        if (hourScore.score > bestScore) {
          bestScore = hourScore.score
          bestHour = hour
        }
      }

      await SpotForecastDaily.findOneAndUpdate(
        {
          spotId,
          date: yesterday,
        },
        {
          $set: {
            spotId,
            date: yesterday,
            dayIndex,
            swellHeightMax: Math.round(avgSwellHeight * 100) / 100,
            swellPeriodMax: Math.round(avgSwellPeriod * 100) / 100,
            swellDirection: Math.round(avgSwellDirection),
            secondarySwellHeight: avgSecondarySwellHeight
              ? validateSwellHeight(Math.round(avgSecondarySwellHeight * 100) / 100)
              : undefined,
            secondarySwellPeriod: avgSecondarySwellPeriod
              ? validateSwellPeriod(Math.round(avgSecondarySwellPeriod * 100) / 100)
              : undefined,
            secondarySwellDirection: avgSecondarySwellDirection
              ? validateDirection(Math.round(avgSecondarySwellDirection))
              : undefined,
            waveHeightMax: Math.round(avgWaveHeight * 100) / 100,
            wavePeriod: Math.round(avgWavePeriod * 100) / 100,
            windSpeedAvg: Math.round(avgWindSpeed10m * 100) / 100,
            windDirectionDominant: Math.round(dominantWindDirection),
            bestHour,
            dailyScore: score.score,
            score: score.score, // Keep for backward compatibility
            confidence: samples.length > 0 ? Math.min(samples.length / 24, 1) : undefined,
            source: 'aggregate' as const,
          },
        },
        {
          upsert: true,
        }
      )

      logSuccess(`Daily aggregated`, {
        spotId,
        spotName: spot.name,
        score: score.score,
        bestHour,
      })
    }

    logSuccess('Daily aggregation complete')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

if (require.main === module) {
  aggregateDaily()
}

export { aggregateDaily }

