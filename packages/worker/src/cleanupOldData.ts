import 'dotenv/config'
import mongoose from 'mongoose'
import { SpotConditionsHourly } from './models/SpotConditionsHourly'
import { logInfo, logError, logSuccess } from './utils/logger'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'surf-ai'

const RETENTION_DAYS = Math.max(1, Math.min(365, parseInt(process.env.RETENTION_DAYS || '30', 10) || 30))

if (!MONGODB_URI) {
  logError('MONGODB_URI environment variable is required')
  process.exit(1)
}

async function cleanupOldData() {
  try {
    await mongoose.connect(MONGODB_URI as string, {
      dbName: MONGODB_DATABASE,
    })

    const cutoffDate = new Date()
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - RETENTION_DAYS)
    cutoffDate.setUTCHours(0, 0, 0, 0)

    logInfo(`Deleting SpotConditionsHourly older than ${cutoffDate.toISOString()} (${RETENTION_DAYS} days)...`)

    const result = await SpotConditionsHourly.deleteMany({
      timestamp: { $lt: cutoffDate },
    })

    logSuccess(`Cleanup complete`, { deletedCount: result.deletedCount, retentionDays: RETENTION_DAYS })
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

