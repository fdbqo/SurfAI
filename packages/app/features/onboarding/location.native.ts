export type LocationPoint = { lat: number; lon: number }

export async function getCurrentLocation(): Promise<LocationPoint> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Location = require('expo-location') as typeof import('expo-location')

  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Location permission denied')
  }

  // On Android emulators (and some devices), `getCurrentPositionAsync` can hang
  // indefinitely if there's no GPS fix. Always fail fast so UI doesn't "freeze".
  const last = await Location.getLastKnownPositionAsync()
  if (last?.coords?.latitude != null && last?.coords?.longitude != null) {
    return { lat: last.coords.latitude, lon: last.coords.longitude }
  }

  const timeoutMs = 12_000
  const pos = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out getting GPS fix. Try again (or set emulator location).')), timeoutMs)
    ),
  ])

  return { lat: pos.coords.latitude, lon: pos.coords.longitude }
}

