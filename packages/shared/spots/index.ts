import type { Spot } from './Spot'

// --- Ireland ---
import { connachtSpots } from './ireland/connacht'
// Add new regions here ↓

export const allSpots: Spot[] = [
  ...connachtSpots,
  // Add new regions here ↓
]

export function getSpotById(id: string): Spot | undefined {
  return allSpots.find((s) => s.id === id)
}

export function getSpotsByRegion(region: string): Spot[] {
  return allSpots.filter((s) => s.region === region)
}

export function getSpotsByCountry(country: string): Spot[] {
  return allSpots.filter((s) => s.country === country)
}

export type { Spot } from './Spot'

