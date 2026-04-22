'use client'

import * as SecureStore from 'expo-secure-store'
import type { DeviceIdStorage } from 'shared/surf-engine'

export const transferStorage: DeviceIdStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
}

