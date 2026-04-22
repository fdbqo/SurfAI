import type { DeviceIdStorage } from './deviceId'

export const SURF_ENGINE_DEVICE_TOKEN_STORAGE_KEY = 'surf-engine-device-token'

export async function getDeviceToken(storage: DeviceIdStorage): Promise<string | null> {
  const t = await storage.getItem(SURF_ENGINE_DEVICE_TOKEN_STORAGE_KEY)
  const trimmed = (t || '').trim()
  return trimmed ? trimmed : null
}

export async function setDeviceToken(storage: DeviceIdStorage, token: string): Promise<void> {
  await storage.setItem(SURF_ENGINE_DEVICE_TOKEN_STORAGE_KEY, token)
}

export async function clearDeviceToken(storage: DeviceIdStorage): Promise<void> {
  await storage.setItem(SURF_ENGINE_DEVICE_TOKEN_STORAGE_KEY, '')
}

