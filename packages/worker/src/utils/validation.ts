export function validateSwellHeight(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined
  if (value < 0 || value > 50) {
    console.warn(`Invalid swellHeight: ${value}, clamping to valid range`)
    return Math.max(0, Math.min(50, value))
  }
  return value
}

export function validateSwellPeriod(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined
  if (value <= 0 || value > 60) {
    console.warn(`Invalid swellPeriod: ${value}, clamping to valid range`)
    return Math.max(1, Math.min(60, value))
  }
  return value
}

export function validateDirection(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined
  if (value < 0 || value > 360) {
    const normalized = ((value % 360) + 360) % 360
    console.warn(`Invalid direction: ${value}, normalized to ${normalized}`)
    return normalized
  }
  return value
}

export function validateWaveHeight(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined
  if (value < 0 || value > 50) {
    console.warn(`Invalid waveHeight: ${value}, clamping to valid range`)
    return Math.max(0, Math.min(50, value))
  }
  return value
}

export function validateWindSpeed(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined
  if (value < 0 || value > 200) {
    console.warn(`Invalid windSpeed: ${value}, clamping to valid range`)
    return Math.max(0, Math.min(200, value))
  }
  return value
}

export function validateConditions(conditions: {
  swellHeight?: number
  swellPeriod?: number
  swellDirection?: number
  waveHeight?: number
  windSpeed10m?: number
  windDirection?: number
  [key: string]: any
}): typeof conditions {
  return {
    ...conditions,
    swellHeight: validateSwellHeight(conditions.swellHeight),
    swellPeriod: validateSwellPeriod(conditions.swellPeriod),
    swellDirection: validateDirection(conditions.swellDirection),
    waveHeight: validateWaveHeight(conditions.waveHeight),
    windSpeed10m: validateWindSpeed(conditions.windSpeed10m),
    windDirection: validateDirection(conditions.windDirection),
  }
}








