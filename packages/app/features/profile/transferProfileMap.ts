import { DEFAULT_DEVICE_PREFS, type DevicePrefs } from 'app/provider/device-prefs'
import type { EnginePublicDeviceProfile } from 'shared/surf-engine'

function isUserLocation(
  v: EnginePublicDeviceProfile['lastLocation']
): v is NonNullable<typeof v> {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.lat === 'number' &&
    typeof o.lon === 'number' &&
    (o.source === 'gps' || o.source === 'ip' || o.source === 'manual') &&
    (o.confidence === 'high' || o.confidence === 'low') &&
    typeof o.updatedAt === 'string'
  )
}

/**
 * Map engine public profile (redeem or GET /api/v1/profile) into the local `DevicePrefs` shape.
 */
export function mapEngineProfileToDevicePrefs(profile: EnginePublicDeviceProfile | null | undefined): DevicePrefs {
  if (!profile) {
    return { ...DEFAULT_DEVICE_PREFS, onboardingCompleted: true }
  }

  const preferences = {
    ...DEFAULT_DEVICE_PREFS.preferences,
    ...(profile.preferences || {}),
  }
  if (profile.skill) preferences.skill = profile.skill
  if (profile.riskTolerance) preferences.riskTolerance = profile.riskTolerance

  const next: DevicePrefs = {
    version: 1,
    onboardingCompleted: profile.onboardingCompleted ?? true,
    units: { ...DEFAULT_DEVICE_PREFS.units, ...(profile.units || {}) },
    preferences,
    notificationSettings: {
      ...DEFAULT_DEVICE_PREFS.notificationSettings,
      ...(profile.notificationSettings || {}),
    },
  }

  if (profile.usualLocation && typeof profile.usualLocation.lat === 'number' && typeof profile.usualLocation.lon === 'number') {
    next.usualLocation = { lat: profile.usualLocation.lat, lon: profile.usualLocation.lon }
  }
  if (isUserLocation(profile.lastLocation)) {
    next.lastLocation = { ...profile.lastLocation }
  }

  return next
}
