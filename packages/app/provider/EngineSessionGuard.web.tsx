'use client'

import { useEffect } from 'react'
import {
  createEngineClient,
  formatWebDeviceId,
  getDeviceToken,
  getEngineBaseUrl,
  getOrCreateStableDeviceId,
  resetLocalEngineIdentity,
  type DeviceIdStorage,
} from 'shared/surf-engine'
import { clearDevicePrefsStorage, DEVICE_PREFS_STORAGE_KEY } from './device-prefs'

const WEB_PUSH_ENDPOINT_KEY = 'surf-engine-webpush-endpoint'

const webLocalStorage: DeviceIdStorage = {
  async getItem(key: string) {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  },
}

function isAuthGoneError(msg: string): boolean {
  return msg.startsWith('Surf Engine 401:') || msg.startsWith('Surf Engine 404:')
}

export function EngineSessionGuard() {
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const token = await getDeviceToken(webLocalStorage)

        // If we have no engine auth but still have local prefs, treat as local-only session and reset.
        if (!token) {
          const hasPrefs =
            typeof localStorage !== 'undefined' && !!localStorage.getItem(DEVICE_PREFS_STORAGE_KEY)
          if (hasPrefs) {
            await resetLocalEngineIdentity(webLocalStorage)
            await clearDevicePrefsStorage()
            if (typeof localStorage !== 'undefined') localStorage.removeItem(WEB_PUSH_ENDPOINT_KEY)
            if (typeof window !== 'undefined') window.location.reload()
          }
          return
        }

        const stableId = await getOrCreateStableDeviceId(webLocalStorage)
        const deviceId = formatWebDeviceId(stableId)

        const baseUrl = getEngineBaseUrl()
        const client = createEngineClient({
          baseUrl,
          getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
        })

        await client.getMe(deviceId)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!isAuthGoneError(msg)) return
        if (cancelled) return

        await resetLocalEngineIdentity(webLocalStorage)
        await clearDevicePrefsStorage()
        if (typeof localStorage !== 'undefined') localStorage.removeItem(WEB_PUSH_ENDPOINT_KEY)

        // Force a clean boot on next paint.
        if (typeof window !== 'undefined') window.location.reload()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

