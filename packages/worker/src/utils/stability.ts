export function calculateStabilityScore(oldValue: number | undefined, newValue: number | undefined): number {
  if (oldValue === undefined || newValue === undefined) {
    return 0.5
  }

  const delta = Math.abs(newValue - oldValue)
  const maxDelta = Math.max(Math.abs(oldValue), Math.abs(newValue), 1)

  const stability = 1 - Math.min(delta / maxDelta, 1)
  return Math.max(0, Math.min(1, stability))
}

export function calculateForecastStability(
  oldForecast: {
    swellHeight?: number
    swellPeriod?: number
    swellDirection?: number
    waveHeight?: number
    windSpeed10m?: number
    [key: string]: any
  },
  newForecast: {
    swellHeight?: number
    swellPeriod?: number
    swellDirection?: number
    waveHeight?: number
    windSpeed10m?: number
    [key: string]: any
  }
): number {
  if (!oldForecast) {
    return 0.5
  }

  const fields = [
    { key: 'swellHeight', weight: 0.25 },
    { key: 'swellPeriod', weight: 0.2 },
    { key: 'swellDirection', weight: 0.15, isDirection: true },
    { key: 'waveHeight', weight: 0.25 },
    { key: 'windSpeed10m', weight: 0.15 },
  ]

  let totalStability = 0
  let totalWeight = 0

  for (const field of fields) {
    const oldVal = oldForecast[field.key]
    const newVal = newForecast[field.key]

    if (oldVal !== undefined && newVal !== undefined) {
      let delta: number
      if (field.isDirection) {
        delta = Math.min(Math.abs(newVal - oldVal), 360 - Math.abs(newVal - oldVal))
      } else {
        delta = Math.abs(newVal - oldVal)
      }

      const maxDelta = field.isDirection ? 180 : Math.max(Math.abs(oldVal), Math.abs(newVal), 1)
      const stability = 1 - Math.min(delta / maxDelta, 1)
      
      totalStability += stability * field.weight
      totalWeight += field.weight
    }
  }

  if (totalWeight === 0) {
    return 0.5
  }

  return Math.max(0, Math.min(1, totalStability / totalWeight))
}








