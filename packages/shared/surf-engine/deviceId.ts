export const SURF_ENGINE_DEVICE_ID_STORAGE_KEY = 'surf-engine-stable-device-id'

export type DeviceIdStorage = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

function randomUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Create or read a stable id; caller prefixes with `web:` or `mobile:` for the API. */
export async function getOrCreateStableDeviceId(storage: DeviceIdStorage): Promise<string> {
  const existing = await storage.getItem(SURF_ENGINE_DEVICE_ID_STORAGE_KEY)
  if (existing) return existing
  const id = randomUuidV4()
  await storage.setItem(SURF_ENGINE_DEVICE_ID_STORAGE_KEY, id)
  return id
}

export function formatWebDeviceId(stableId: string): string {
  return `web:${stableId}`
}

export function formatMobileDeviceId(stableId: string): string {
  return `mobile:${stableId}`
}
