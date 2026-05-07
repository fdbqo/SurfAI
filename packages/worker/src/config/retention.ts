/**
 * Retention config for time-based collections.
 * All values in days. Env overrides for production.
 */
const envInt = (key: string, defaultVal: number, min: number, max: number): number => {
  const raw = process.env[key]
  const n = raw !== undefined ? parseInt(raw, 10) : defaultVal
  if (Number.isNaN(n)) return defaultVal
  return Math.max(min, Math.min(max, n))
}

export const retention = {
  /** Hourly conditions: keep this many days (e.g. 7–14). */
  conditionsHourlyDays: envInt('RETENTION_CONDITIONS_HOURLY_DAYS', 7, 1, 90),
  /** Daily history (SpotForecastDaily past dates): keep this many days back. */
  conditionsDailyDays: envInt('RETENTION_CONDITIONS_DAILY_DAYS', 30, 7, 365),
  /** 3h forecast blocks: delete blocks older than this (e.g. 8 keeps ~7 days). */
  forecast3hDays: envInt('RETENTION_FORECAST_3H_DAYS', 8, 1, 30),
} as const
