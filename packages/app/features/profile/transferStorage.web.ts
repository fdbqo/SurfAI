'use client'

import type { DeviceIdStorage } from 'shared/surf-engine'

export const transferStorage: DeviceIdStorage = {
  async getItem(key: string) {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  },
}

