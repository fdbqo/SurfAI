import 'dotenv/config'
import mongoose from 'mongoose'
import { SpotConditionsHourly } from './models/SpotConditionsHourly'
import { SpotForecast3h } from './models/SpotForecast3h'
import { SpotForecastDaily } from './models/SpotForecastDaily'
import { retention } from './config/retention'
import { logInfo, logError, logSuccess } from './utils/logger'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'surf-ai'

if (!MONGODB_URI) {
  logError('MONGODB_URI environment variable is required')
  process.exit(1)
}

async function cleanupOldData() {
  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DATABASE,
    })

    const results: Record<string, number> = {}

    // 1. SpotConditionsHourly: by timestamp
    const hourlyCutoff = new Date()
    hourlyCutoff.setUTCDate(hourlyCutoff.getUTCDate() - retention.conditionsHourlyDays)
    hourlyCutoff.setUTCHours(0, 0, 0, 0)
    logInfo(`Cleaning SpotConditionsHourly older than ${hourlyCutoff.toISOString()} (${retention.conditionsHourlyDays} days)...`)
    const r1 = await SpotConditionsHourly.deleteMany({ timestamp: { $lt: hourlyCutoff } })
    results.spotconditionshourly = r1.deletedCount

    // 2. SpotForecast3h: by blockStart (keep last ~7 days of 3h blocks)
    const threeHourCutoff = new Date()
    threeHourCutoff.setUTCDate(threeHourCutoff.getUTCDate() - retention.forecast3hDays)
    threeHourCutoff.setUTCHours(0, 0, 0, 0)
    logInfo(`Cleaning SpotForecast3h with blockStart before ${threeHourCutoff.toISOString()} (${retention.forecast3hDays} days)...`)
    const r2 = await SpotForecast3h.deleteMany({ blockStart: { $lt: threeHourCutoff } })
    results.spotforecast3hs = r2.deletedCount

    // 3. SpotForecastDaily: by date (past dates only; keeps last N days history)
    const dailyCutoff = new Date()
    dailyCutoff.setUTCDate(dailyCutoff.getUTCDate() - retention.conditionsDailyDays)
    dailyCutoff.setUTCHours(0, 0, 0, 0)
    logInfo(`Cleaning SpotForecastDaily with date before ${dailyCutoff.toISOString()} (${retention.conditionsDailyDays} days)...`)
    const r3 = await SpotForecastDaily.deleteMany({ date: { $lt: dailyCutoff } })
    results.spotforecastdailies = r3.deletedCount

    logSuccess('Cleanup complete', results)
  } catch (error) {
    logError('Fatal error', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

if (require.main === module) {
  cleanupOldData()
}

export { cleanupOldData }
