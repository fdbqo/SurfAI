# Worker Package

Railway cron job worker that updates surf conditions.

## Local Development

1. Create `.env` file in this directory:
   ```
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=surf-ai
   ```

2. Run:
   ```bash
   yarn update-conditions
   ```

## Railway Deployment

### Setup

1. **Create a new Railway service** for the worker
2. **Set root directory** to `packages/worker`
3. **Set environment variables** in Railway dashboard:
   - `MONGODB_URI` - Your MongoDB connection string
   - `MONGODB_DATABASE` - Database name (default: `surf-ai`)

### Cron Job Configuration

In Railway, set up a cron job with:

- **Command**: `yarn update-conditions`
- **Schedule**: e.g., `0 * * * *` (every hour) or `*/30 * * * *` (every 30 minutes)

### Notes

- Script terminates after completion (Railway-compatible)
- Uses append-only design (creates new records, never updates)
- Handles errors gracefully (continues with other spots if one fails)

