import type { DeviceIdStorage } from './deviceId'

export const SURF_ENGINE_USER_ID_STORAGE_KEY = 'surf-engine-canonical-user-id'

/**
 * Canonical userId is shared across devices after transfer/redeem.
 * - deviceId: per-device stable id (web:... / mobile:...)
 * - userId: can be reassigned to match another device’s userId
 */
export async function getOrCreateCanonicalUserId(
  storage: DeviceIdStorage,
  defaultUserId: string
): Promise<string> {
  const existing = await storage.getItem(SURF_ENGINE_USER_ID_STORAGE_KEY)
  if (existing) return existing
  await storage.setItem(SURF_ENGINE_USER_ID_STORAGE_KEY, defaultUserId)
  return defaultUserId
}

export async function setCanonicalUserId(storage: DeviceIdStorage, userId: string): Promise<void> {
  await storage.setItem(SURF_ENGINE_USER_ID_STORAGE_KEY, userId)
}

