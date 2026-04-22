export interface SpotLocation {
  id: string
  name: string
  lat: number
  lon: number
  orientation: number // degrees (0 = North)
  type: 'beach' | 'reef' | 'harbour' | 'bay' | 'island'
  country: string
  county: string
  region: string
}

export interface SpotConditions {
  spotId: string
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  waveHeight: number
  wavePeriod: number
  windSpeed: number // km/h at 2m
  windSpeed10m: number // km/h at 10m
  windSpeed2m: number // km/h at 2m
  windDirection: number
  score?: number
  aiReasoning?: string
}

export interface SurfScore {
  score: number
  reasons: string[]
}

/** Single 3h block for agent/API (from SpotForecast3h). */
export interface ForecastBlock3h {
  blockStart: string
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  waveHeight: number
  wavePeriod: number
  windSpeed10m: number
  windDirection: number
  blockScore?: number
  localHour: number
}

/** Single day for agent/API (from SpotForecastDaily). */
export interface ForecastDay {
  date: string
  dayIndex: number
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  secondarySwellHeight?: number
  secondarySwellPeriod?: number
  secondarySwellDirection?: number
  waveHeight: number
  wavePeriod?: number
  windSpeed10m: number
  windDirection: number
  dailyScore?: number
  confidence?: number
  stability?: number
  bestWindowEstimate?: 'morning' | 'midday' | 'afternoon'
  bestHour?: number
  source?: 'forecast' | 'aggregate'
}

/** Full forecast for one spot: 3h blocks (days 0–6) + daily (days 0–13). */
export interface SpotForecastView {
  spotId: string
  forecast3h: ForecastBlock3h[]
  forecastDaily: ForecastDay[]
}

/** Latest conditions for one spot (from SpotConditionsHourly). */
export interface SpotConditionsView {
  spotId: string
  timestamp: string
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  waveHeight: number
  wavePeriod: number
  windSpeed10m: number
  windSpeed2m: number
  windDirection: number
  score?: number
}

/** Historical daily aggregates for one spot. */
export interface SpotHistoryView {
  spotId: string
  days: ForecastDay[]
}

