/**
 * Get timezone offset in hours for a given latitude/longitude
 * This is a simplified version - for production, consider using a proper timezone library
 * For Ireland (lat ~53-55, lon ~-6 to -10), timezone is Europe/Dublin (GMT/IST)
 */
export function getTimezoneOffset(lat: number, lon: number): number {
  // Ireland timezone: GMT (UTC+0) in winter, IST (UTC+1) in summer
  // For simplicity, we'll use UTC+0 (GMT) as base
  // In production, use a library like 'node-timezone' or calculate DST properly
  return 0
}

/**
 * Convert UTC date to local time string and hour
 * For Ireland, we'll use Europe/Dublin timezone
 */
export function getLocalTime(utcDate: Date, lat: number, lon: number): { localTime: string; localHour: number } {
  // For Ireland, timezone is Europe/Dublin
  // GMT in winter (UTC+0), IST in summer (UTC+1)
  // For now, we'll use a simple approach: check if DST is active
  const isDST = isDaylightSavingTime(utcDate)
  const offsetHours = isDST ? 1 : 0
  
  const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000)
  const localTime = localDate.toISOString().replace('Z', `+0${offsetHours}:00`)
  const localHour = localDate.getUTCHours()
  
  return { localTime, localHour }
}

/**
 * Simple DST check for Ireland (Europe/Dublin)
 * DST: Last Sunday in March to last Sunday in October
 */
function isDaylightSavingTime(date: Date): boolean {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() // 0-11
  
  // Before March or after October: no DST
  if (month < 2 || month > 9) return false
  
  // April to September: always DST
  if (month > 2 && month < 9) return true
  
  // March: check if after last Sunday
  if (month === 2) {
    const lastSunday = getLastSundayOfMonth(year, 2)
    return date.getUTCDate() >= lastSunday.getUTCDate()
  }
  
  // October: check if before last Sunday
  if (month === 9) {
    const lastSunday = getLastSundayOfMonth(year, 9)
    return date.getUTCDate() < lastSunday.getUTCDate()
  }
  
  return false
}

function getLastSundayOfMonth(year: number, month: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)) // Last day of month
  const dayOfWeek = lastDay.getUTCDay() // 0 = Sunday
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek
  return new Date(Date.UTC(year, month, lastDay.getUTCDate() - daysToSubtract))
}






