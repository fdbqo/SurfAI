import type { DeviceIdStorage } from './deviceId'
import { clearStableDeviceId } from './deviceId'
import { clearDeviceToken } from './deviceToken'
import { clearCanonicalUserId } from './userId'

/**
 * Clears local Surf Engine identity for *this device*.
 * - Next/Expo will mint a new stable deviceId + userId on next registration.
 * - This does NOT delete other devices on the server; it’s purely local.
 */
export async function resetLocalEngineIdentity(storage: DeviceIdStorage): Promise<void> {
  await Promise.all([clearStableDeviceId(storage), clearCanonicalUserId(storage), clearDeviceToken(storage)])
}

