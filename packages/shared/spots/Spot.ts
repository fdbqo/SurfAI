export interface Spot {
  id: string
  name: string
  lat: number
  lon: number
  orientation: number
  type: 'beach' | 'reef' | 'harbour' | 'bay' | 'island'
  country: string
  county: string
  region: string
}

