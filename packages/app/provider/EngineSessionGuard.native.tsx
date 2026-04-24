'use client'

import { useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import {
  createEngineClient,
  formatMobileDeviceId,
  getDeviceToken,
  getEngineBaseUrl,
  getOrCreateStableDeviceId,
  resetLocalEngineIdentity,
  type DeviceIdStorage,
} from 'shared/surf-engine'
import { clearDevicePrefsStorage, DEVICE_PREFS_STORAGE_KEY } from './device-prefs'

const EXPO_TOKEN_STORAGE_KEY = 'surf-engine-expo-push-token'

const secureStoreAdapter: DeviceIdStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
}

function isAuthGoneError(msg: string): boolean {
  return msg.startsWith('Surf Engine 401:') || msg.startsWith('Surf Engine 404:')
}

export function EngineSessionGuard() {
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const token = await getDeviceToken(secureStoreAdapter)

        // No engine auth token: if local prefs exist, treat as local-only session and reset.
        if (!token) {
          const rawPrefs = await AsyncStorage.getItem(DEVICE_PREFS_STORAGE_KEY)
          if (rawPrefs) {
            if (cancelled) return
            await AsyncStorage.removeItem(EXPO_TOKEN_STORAGE_KEY)
            await resetLocalEngineIdentity(secureStoreAdapter)
            await clearDevicePrefsStorage()
          }
          return
        }

        const stableId = await getOrCreateStableDeviceId(secureStoreAdapter)
        const deviceId = formatMobileDeviceId(stableId)

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

        await AsyncStorage.removeItem(EXPO_TOKEN_STORAGE_KEY)
        await resetLocalEngineIdentity(secureStoreAdapter)
        await clearDevicePrefsStorage()
        // No forced restart here; the app will behave "new" after next navigation/app restart.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

