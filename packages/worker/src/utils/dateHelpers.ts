export function normalizeToUTCMidnight(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function normalizeToLocalMidnight(date: Date, timezone: string = 'UTC'): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getDayIndex(date: Date, referenceDate?: Date): number {
  const ref = referenceDate ? normalizeToUTCMidnight(referenceDate) : normalizeToUTCMidnight(new Date())
  const target = normalizeToUTCMidnight(date)
  return Math.floor((target.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))
}








