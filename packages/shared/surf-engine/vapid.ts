/**
 * Convert URL-safe base64 VAPID public key to Uint8Array for PushManager.subscribe.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  if (typeof globalThis.atob !== 'function') {
    throw new Error('urlBase64ToUint8Array requires atob (use on web only)')
  }
  const rawData = globalThis.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
