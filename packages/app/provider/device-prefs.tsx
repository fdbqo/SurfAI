import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type DevicePreferences = {
  // required
  skill: 'beginner' | 'intermediate' | 'advanced'
  riskTolerance: 'low' | 'medium' | 'high'

  // optional (null = no constraint)
  notifyStrictness?: 'strict' | 'moderate' | 'lenient'
  minWaveHeightFt?: number | null
  maxWaveHeightFt?: number | null
  maxWindSpeedKnots?: number | null
  maxDistanceKm?: number | null
  minSwellPeriodSec?: number | null

  // optional flags
  reefAllowed?: boolean
  sandAllowed?: boolean

  // optional notes
  freeText?: string
}

export type DeviceNotificationSettings = { enabled: boolean }

export type DeviceUnitPrefs = {
  waveHeight: 'ft' | 'm'
  windSpeed: 'knots' | 'kmh'
  distance: 'km' | 'mi'
}

export type UsualLocation = { lat: number; lon: number }

export type UserLocation = {
  lat: number
  lon: number
  source: 'gps' | 'ip' | 'manual'
  confidence: 'high' | 'low'
  updatedAt: string
}

export type DevicePrefs = {
  version: 1
  onboardingCompleted: boolean
  units: DeviceUnitPrefs
  preferences: DevicePreferences
  notificationSettings: DeviceNotificationSettings
  usualLocation?: UsualLocation
  lastLocation?: UserLocation
}

export const DEFAULT_DEVICE_PREFS: DevicePrefs = {
  version: 1,
  onboardingCompleted: false,
  units: { waveHeight: 'ft', windSpeed: 'knots', distance: 'km' },
  preferences: {
    // conservative defaults ("minimum")
    skill: 'beginner',
    riskTolerance: 'low',
    notifyStrictness: 'strict',
    minWaveHeightFt: null,
    maxWaveHeightFt: 3,
    maxWindSpeedKnots: 12,
    maxDistanceKm: 15,
    minSwellPeriodSec: 8,
    reefAllowed: false,
    sandAllowed: true,
    freeText: '',
  },
  notificationSettings: { enabled: true },
}

const STORAGE_KEY = 'surf_device_prefs_v1'
const TRANSFER_PREFIX = 'surf_prefs_v1:'

export const DEVICE_PREFS_STORAGE_KEY = STORAGE_KEY

export async function clearDevicePrefsStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    return
  }
  await AsyncStorage.removeItem(STORAGE_KEY)
}

type Ctx = {
  loading: boolean
  prefs: DevicePrefs
  setPrefs: (next: DevicePrefs) => Promise<void>
  patchPrefs: (patch: Partial<DevicePrefs>) => Promise<void>
  exportTransferCode: () => string
  importTransferCode: (code: string) => Promise<void>
}

const DevicePrefsContext = createContext<Ctx | null>(null)

async function readStorage(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY)
  }
  return AsyncStorage.getItem(STORAGE_KEY)
}

async function writeStorage(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, value)
    return
  }
  await AsyncStorage.setItem(STORAGE_KEY, value)
}

function applyDevicePrefsPatch(prev: DevicePrefs, patch: Partial<DevicePrefs>): DevicePrefs {
  const p = patch as Partial<DevicePrefs> & {
    preferences?: Partial<DevicePreferences>
    units?: Partial<DeviceUnitPrefs>
    notificationSettings?: Partial<DeviceNotificationSettings>
  }
  return {
    ...prev,
    ...patch,
    units: p.units ? { ...prev.units, ...p.units } : prev.units,
    preferences: p.preferences
      ? { ...prev.preferences, ...p.preferences }
      : prev.preferences,
    notificationSettings: p.notificationSettings
      ? { ...prev.notificationSettings, ...p.notificationSettings }
      : prev.notificationSettings,
  }
}

export function DevicePrefsProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefsState] = useState<DevicePrefs>(DEFAULT_DEVICE_PREFS)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await readStorage()
        if (!raw) return
        const parsed = JSON.parse(raw) as unknown
        if (
          typeof parsed === 'object' &&
          parsed &&
          (parsed as any).version === 1 &&
          typeof (parsed as any).preferences === 'object'
        ) {
          // Merge to fill any new defaults as schema evolves.
          setPrefsState({ ...DEFAULT_DEVICE_PREFS, ...(parsed as DevicePrefs) })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setPrefs = useCallback(async (next: DevicePrefs) => {
    prefsRef.current = next
    setPrefsState(next)
    await writeStorage(JSON.stringify(next))
  }, [])

  const patchPrefs = useCallback(async (patch: Partial<DevicePrefs>) => {
    const next = applyDevicePrefsPatch(prefsRef.current, patch)
    prefsRef.current = next
    setPrefsState(next)
    await writeStorage(JSON.stringify(next))
  }, [])

  const exportTransferCode = useCallback(() => {
    return `${TRANSFER_PREFIX}${encodeURIComponent(JSON.stringify(prefs))}`
  }, [prefs])

  const importTransferCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim()
      if (!trimmed.startsWith(TRANSFER_PREFIX)) {
        throw new Error('Invalid code (wrong prefix)')
      }
      const payload = trimmed.slice(TRANSFER_PREFIX.length)
      const decoded = JSON.parse(decodeURIComponent(payload)) as unknown
      if (
        typeof decoded !== 'object' ||
        !decoded ||
        (decoded as any).version !== 1 ||
        typeof (decoded as any).preferences !== 'object' ||
        typeof (decoded as any).notificationSettings !== 'object'
      ) {
        throw new Error('Invalid code (bad payload)')
      }
      await setPrefs(decoded as DevicePrefs)
    },
    [setPrefs]
  )

  const value = useMemo<Ctx>(
    () => ({ loading, prefs, setPrefs, patchPrefs, exportTransferCode, importTransferCode }),
    [loading, prefs, setPrefs, patchPrefs, exportTransferCode, importTransferCode]
  )

  return <DevicePrefsContext.Provider value={value}>{children}</DevicePrefsContext.Provider>
}

export function useDevicePrefs(): Ctx {
  const ctx = useContext(DevicePrefsContext)
  if (!ctx) throw new Error('useDevicePrefs must be used within DevicePrefsProvider')
  return ctx
}

