export type LocationPoint = { lat: number; lon: number }

function rejectAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms)
  })
}

export async function getCurrentLocation(): Promise<LocationPoint> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Location = require('expo-location') as typeof import('expo-location')

  // If the native permission dialog never completes, callers would await forever
  // and UI (e.g. wizard buttons) stays disabled — bound wait time.
  const { status } = await Promise.race([
    Location.requestForegroundPermissionsAsync(),
    rejectAfter(120_000, 'Location permission request timed out.'),
  ])
  if (status !== 'granted') {
    throw new Error('Location permission denied')
  }

  // `getLastKnownPositionAsync` can also stall on some emulators; don't block GPS path.
  const last = await Promise.race([
    Location.getLastKnownPositionAsync(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4_000)),
  ])
  if (last?.coords?.latitude != null && last?.coords?.longitude != null) {
    return { lat: last.coords.latitude, lon: last.coords.longitude }
  }

  // On Android emulators (and some devices), `getCurrentPositionAsync` can hang
  // indefinitely if there's no GPS fix. Always fail fast so UI doesn't "freeze".
  const timeoutMs = 12_000
  const pos = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    rejectAfter(timeoutMs, 'Timed out getting GPS fix. Try again (or set emulator location).'),
  ])

  return { lat: pos.coords.latitude, lon: pos.coords.longitude }
}

