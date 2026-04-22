export type LocationPoint = { lat: number; lon: number }

export async function getCurrentLocation(): Promise<LocationPoint> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation not supported in this browser')
  }
  return new Promise<LocationPoint>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Failed to read location')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  })
}

