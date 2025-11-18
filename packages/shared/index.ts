export * from './types'
export * from './scoring'
export * from './wind-correction'

// Static spot data
export * from './spots'

// Legacy export for backward compatibility
import irelandSpotsData from './spots/ireland.json'
export const irelandSpots = irelandSpotsData
export type { SpotLocation } from './types'

