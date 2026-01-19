interface LogContext {
  spotId?: string
  spotName?: string
  operation?: string
  attempt?: number
  latency?: number
  [key: string]: any
}

export function logInfo(message: string, context?: LogContext) {
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  console.log(`[INFO] ${message}${ctx}`)
}

export function logWarn(message: string, context?: LogContext) {
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  console.warn(`[WARN] ${message}${ctx}`)
}

export function logError(message: string, context?: LogContext) {
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  console.error(`[ERROR] ${message}${ctx}`)
}

export function logSuccess(message: string, context?: LogContext) {
  const ctx = context ? ` ${JSON.stringify(context)}` : ''
  console.log(`[SUCCESS] ${message}${ctx}`)
}








