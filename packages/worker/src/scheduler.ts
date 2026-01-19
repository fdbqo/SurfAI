import 'dotenv/config'
import cron from 'node-cron'
import { updateConditions } from './updateConditions'
import { updateForecast } from './updateForecast'
import { aggregateDaily } from './aggregateDaily'
import { cleanupOldData } from './cleanupOldData'
import { logInfo, logError, logSuccess } from './utils/logger'

// Schedule tasks matching GitHub Actions workflows
// All times are in UTC

// Update conditions every hour (matches update-conditions.yml)
cron.schedule('0 * * * *', async () => {
  logInfo('🔄 Scheduled: update-conditions')
  try {
    await updateConditions()
    logSuccess('✅ Scheduled update-conditions completed')
  } catch (error) {
    logError('❌ Scheduled update-conditions failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// Update forecast daily at 3 AM UTC (matches update-forecast.yml)
cron.schedule('0 3 * * *', async () => {
  logInfo('🔄 Scheduled: update-forecast')
  try {
    await updateForecast()
    logSuccess('✅ Scheduled update-forecast completed')
  } catch (error) {
    logError('❌ Scheduled update-forecast failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// Aggregate daily data at 1 AM UTC (matches aggregate-daily.yml)
cron.schedule('0 1 * * *', async () => {
  logInfo('🔄 Scheduled: aggregate-daily')
  try {
    await aggregateDaily()
    logSuccess('✅ Scheduled aggregate-daily completed')
  } catch (error) {
    logError('❌ Scheduled aggregate-daily failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

// Cleanup old data weekly on Sunday at 2 AM UTC (matches cleanup-old.yml)
cron.schedule('0 2 * * 0', async () => {
  logInfo('🔄 Scheduled: cleanup-old')
  try {
    await cleanupOldData()
    logSuccess('✅ Scheduled cleanup-old completed')
  } catch (error) {
    logError('❌ Scheduled cleanup-old failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

logInfo('📅 Scheduler started - tasks will run automatically:')
logInfo('  • update-conditions: Every hour at :00')
logInfo('  • update-forecast: Daily at 3:00 AM UTC')
logInfo('  • aggregate-daily: Daily at 1:00 AM UTC')
logInfo('  • cleanup-old: Weekly on Sunday at 2:00 AM UTC')
logInfo('')
logInfo('Press Ctrl+C to stop the scheduler')

// Keep the process alive
process.on('SIGINT', () => {
  logInfo('🛑 Scheduler stopping...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logInfo('🛑 Scheduler stopping...')
  process.exit(0)
})
