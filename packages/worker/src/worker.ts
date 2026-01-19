import 'dotenv/config'
import { updateConditions } from './updateConditions'
import { updateForecast } from './updateForecast'
import { aggregateDaily } from './aggregateDaily'
import { cleanupOldData } from './cleanupOldData'

const command = process.argv[2]

async function runWorker() {
  try {
    switch (command) {
      case 'update-conditions':
        console.log('Running: update-conditions')
        await updateConditions()
        break

      case 'update-forecast':
        console.log('Running: update-forecast')
        await updateForecast()
        break

      case 'aggregate-daily':
        console.log('Running: aggregate-daily')
        await aggregateDaily()
        break

      case 'cleanup-old':
        console.log('Running: cleanup-old')
        await cleanupOldData()
        break

      default:
        console.error(`Unknown command: ${command}`)
        console.log('Usage: tsx src/worker.ts <command>')
        console.log('Commands:')
        console.log('  update-conditions  - Fetch and store current hourly conditions')
        console.log('  update-forecast   - Fetch and store 3h blocks (3-7d) and daily forecasts (7-15d)')
        console.log('  aggregate-daily   - Aggregate yesterday\'s hourly data into daily summaries')
        console.log('  cleanup-old       - Delete raw hourly data older than RETENTION_DAYS')
        process.exit(1)
    }
  } catch (error) {
    console.error('Worker error:', error)
    process.exit(1)
  }
}

runWorker()

