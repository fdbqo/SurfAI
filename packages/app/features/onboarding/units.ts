export type WaveUnit = 'ft' | 'm'
export type WindUnit = 'knots' | 'kmh'
export type DistanceUnit = 'km' | 'mi'

export function ftToM(ft: number): number {
  return ft * 0.3048
}
export function mToFt(m: number): number {
  return m / 0.3048
}

export function knotsToKmh(knots: number): number {
  return knots * 1.852
}
export function kmhToKnots(kmh: number): number {
  return kmh / 1.852
}

export function kmToMi(km: number): number {
  return km * 0.621371
}
export function miToKm(mi: number): number {
  return mi / 0.621371
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

