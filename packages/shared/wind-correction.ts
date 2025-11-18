// convert wind from 10m height to 2m height using log-wind profile
export function windAt2m(U10: number, z0: number = 0.001): number {
  if (U10 <= 0) return 0
  
  const z = 2
  const z10 = 10
  const ratio = Math.log(z / z0) / Math.log(z10 / z0)
  return U10 * ratio
}

// get wind reduction factor
export function getWindCorrectionFactor(U10: number): number {
  if (U10 <= 0) return 1
  return windAt2m(U10) / U10
}



