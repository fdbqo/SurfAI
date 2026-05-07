/** Web Push subscription shape (PushSubscription.toJSON()). */
export interface WebPushSubscriptionJson {
  endpoint: string
  expirationTime: number | null
  keys: { p256dh: string; auth: string }
}

/** Matches the app’s stored surf preferences (see `app/provider/device-prefs`). */
export type RegisterDevicePreferencesPayload = {
  skill: 'beginner' | 'intermediate' | 'advanced'
  riskTolerance: 'low' | 'medium' | 'high'
  notifyStrictness?: 'strict' | 'moderate' | 'lenient'
  minWaveHeightFt?: number | null
  maxWaveHeightFt?: number | null
  maxWindSpeedKnots?: number | null
  maxDistanceKm?: number | null
  minSwellPeriodSec?: number | null
  reefAllowed?: boolean
  sandAllowed?: boolean
  freeText?: string
}

export type RegisterDeviceUnitPrefs = {
  waveHeight: 'ft' | 'm'
  windSpeed: 'knots' | 'kmh'
  distance: 'km' | 'mi'
}

export type RegisterDeviceUsualLocation = { lat: number; lon: number }

export type RegisterDeviceLastLocation = {
  lat: number
  lon: number
  source: 'gps' | 'ip' | 'manual'
  confidence: 'high' | 'low'
  updatedAt: string
}

export interface RegisterDeviceWebPushBody {
  userId: string
  channel: 'webpush'
  platform: 'web'
  deviceId: string
  subscription: WebPushSubscriptionJson
  /** Optional: seed/update server-side device prefs at registration time. */
  preferences?: RegisterDevicePreferencesPayload
  /**
   * @deprecated Old compact shape. Prefer `preferences` (full `DevicePreferences`).
   * Kept for backwards compatibility with older deploys.
   */
  legacyPreferences?: {
    maxComfortableWave?: number
    riskTolerance?: 'low' | 'medium' | 'high'
    avoidReefs?: boolean
    notifyStrictness?: 'harsh' | 'lenient'
  }
  notificationSettings?: { enabled?: boolean }
  onboardingCompleted?: boolean
  units?: RegisterDeviceUnitPrefs
  usualLocation?: RegisterDeviceUsualLocation
  lastLocation?: RegisterDeviceLastLocation
}

export interface RegisterDeviceExpoBody {
  userId: string
  channel: 'expo'
  platform: 'android' | 'ios'
  deviceId: string
  expoToken: string
  /** Optional: seed/update server-side device prefs at registration time. */
  preferences?: RegisterDevicePreferencesPayload
  legacyPreferences?: {
    maxComfortableWave?: number
    riskTolerance?: 'low' | 'medium' | 'high'
    avoidReefs?: boolean
    notifyStrictness?: 'harsh' | 'lenient'
  }
  notificationSettings?: { enabled?: boolean }
  onboardingCompleted?: boolean
  units?: RegisterDeviceUnitPrefs
  usualLocation?: RegisterDeviceUsualLocation
  lastLocation?: RegisterDeviceLastLocation
}

/**
 * Minimal "init auth" registration (no push channel). Used to mint a deviceToken
 * without requiring webpush subscription or Expo token.
 */
export interface RegisterDeviceInitAuthBody {
  userId: string
  deviceId: string
  channel: 'device'
  platform: 'web' | 'android' | 'ios'
}

export type RegisterDeviceBody = RegisterDeviceWebPushBody | RegisterDeviceExpoBody | RegisterDeviceInitAuthBody

export type RegisterDeviceResponse = {
  ok: boolean
  /** First-time device auth mint (new backend). */
  deviceToken?: string
}

export interface DisableDeviceWebBody {
  channel: 'webpush'
  endpoint: string
}

export interface DisableDeviceExpoBody {
  channel: 'expo'
  expoToken: string
}

export type DisableDeviceBody = DisableDeviceWebBody | DisableDeviceExpoBody

export interface VapidPublicKeyResponse {
  publicKey: string
}

export type TransferCreateBody = {
  userId: string
  deviceId: string
  ttlMinutes: number
}

export type TransferCreateResponse = {
  ok: boolean
  code?: string
  expiresAt?: string
}

export type TransferRedeemBody = {
  code: string
  deviceId: string
  /** Redeem still works if omitted; engine re-keys from deviceId. */
  currentUserId?: string
}

/**
 * Public device profile (no `deviceAuthHash`) as returned from transfer/redeem or GET /api/v1/profile.
 * May include a few top-level denormalized fields (e.g. `skill`) depending on engine serialization.
 */
export type EnginePublicDeviceProfile = {
  userId?: string
  onboardingCompleted?: boolean
  units?: RegisterDeviceUnitPrefs
  preferences?: RegisterDevicePreferencesPayload
  notificationSettings?: { enabled?: boolean }
  usualLocation?: RegisterDeviceUsualLocation
  lastLocation?: RegisterDeviceLastLocation | null
  /** Some engine builds expose these at top level; prefer merging into `preferences`. */
  skill?: RegisterDevicePreferencesPayload['skill']
  riskTolerance?: RegisterDevicePreferencesPayload['riskTolerance']
  usualRegions?: unknown
}

export type TransferRedeemResponse = {
  ok: boolean
  userId?: string
  /** Post-transaction snapshot for the redeeming `deviceId` (instant hydrate on second device). */
  profile?: EnginePublicDeviceProfile
}

export type GetDeviceProfileResponse = {
  ok: boolean
  profile?: EnginePublicDeviceProfile
}

export type GetMeResponse = {
  ok: boolean
  userId?: string
  deleted?: boolean
}
