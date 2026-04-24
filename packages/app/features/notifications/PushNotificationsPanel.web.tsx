'use client'

import { Button, Paragraph, YStack } from '@my/ui'
import { useEffect, useState } from 'react'
import { clearDevicePrefsStorage, useDevicePrefs } from 'app/provider/device-prefs'
import { profileCard, profilePrimaryButton } from 'app/features/profile/profileScreenStyles'
import {
  createEngineClient,
  formatWebDeviceId,
  getEngineBaseUrl,
  getOrCreateStableDeviceId,
  getOrCreateCanonicalUserId,
  getDeviceToken,
  resetLocalEngineIdentity,
  setDeviceToken,
  urlBase64ToUint8Array,
  type DeviceIdStorage,
} from 'shared/surf-engine'

const WEB_PUSH_ENDPOINT_KEY = 'surf-engine-webpush-endpoint'

/** Bump `SW_SCRIPT_VERSION` after SW changes so browsers fetch a new script (not a stale worker). */
const SW_SCRIPT_VERSION = 3
const PUSH_SERVICE_WORKER_URL = `/push-service-worker.js?v=${SW_SCRIPT_VERSION}`

const webLocalStorage: DeviceIdStorage = {
  async getItem(key: string) {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  },
}

export function PushNotificationsPanel() {
  const { prefs } = useDevicePrefs()
  const [mounted, setMounted] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const supportsPush =
    mounted &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  async function enableWebPush() {
    setBusy(true)
    setStatus('')
    try {
      const baseUrl = getEngineBaseUrl()
      const client = createEngineClient({ baseUrl })
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('Notification permission denied.')
        return
      }

      await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_URL, { scope: '/' })
      const reg = await navigator.serviceWorker.ready

      const publicKey = await client.getVapidPublicKey()
      const keyBytes = urlBase64ToUint8Array(publicKey)
      const applicationServerKey = keyBytes.buffer.slice(
        keyBytes.byteOffset,
        keyBytes.byteOffset + keyBytes.byteLength
      ) as ArrayBuffer
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })

      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setStatus('Invalid push subscription.')
        return
      }

      const stableId = await getOrCreateStableDeviceId(webLocalStorage)
      const deviceId = formatWebDeviceId(stableId)
      const userId = await getOrCreateCanonicalUserId(webLocalStorage, deviceId)

      const regRes = await client.registerDevice({
        userId,
        channel: 'webpush',
        platform: 'web',
        deviceId,
        subscription: {
          endpoint: json.endpoint,
          expirationTime: json.expirationTime ?? null,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
        preferences: prefs.preferences,
        notificationSettings: prefs.notificationSettings,
        onboardingCompleted: prefs.onboardingCompleted,
        units: prefs.units,
        usualLocation: prefs.usualLocation,
        lastLocation: prefs.lastLocation,
      })
      if (regRes.deviceToken) {
        await setDeviceToken(webLocalStorage, regRes.deviceToken)
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WEB_PUSH_ENDPOINT_KEY, json.endpoint)
      }
      setStatus('Web push registered with Surf Engine.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function disableWebPush() {
    setBusy(true)
    setStatus('')
    try {
      const baseUrl = getEngineBaseUrl()
      const client = createEngineClient({ baseUrl })
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const endpoint =
        sub?.endpoint ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem(WEB_PUSH_ENDPOINT_KEY) : null)
      if (!endpoint) {
        setStatus('No subscription to disable.')
        return
      }
      await client.disableDevice({ channel: 'webpush', endpoint })
      await sub?.unsubscribe()
      if (typeof localStorage !== 'undefined') localStorage.removeItem(WEB_PUSH_ENDPOINT_KEY)
      setStatus('Web push disabled.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function resetThisDevice() {
    setBusy(true)
    setStatus('')
    try {
      const stableId = await getOrCreateStableDeviceId(webLocalStorage)
      const deviceId = formatWebDeviceId(stableId)
      const token = await getDeviceToken(webLocalStorage)

      // Best-effort: delete the device server-side if we have auth; fall back to disable.
      try {
        const baseUrl = getEngineBaseUrl()
        const client = createEngineClient({
          baseUrl,
          getAuthHeaders: async () => (token ? { Authorization: `Bearer ${token}` } : undefined),
        })
        if (token) {
          await client.deleteDevice(deviceId)
        } else {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          const endpoint =
            sub?.endpoint ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem(WEB_PUSH_ENDPOINT_KEY) : null)
          if (endpoint) await client.disableDevice({ channel: 'webpush', endpoint })
        }
      } catch {
        // ignore: still clear local state below
      }

      // Always unsubscribe locally.
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        await sub?.unsubscribe()
      } catch {
        // ignore
      }

      if (typeof localStorage !== 'undefined') localStorage.removeItem(WEB_PUSH_ENDPOINT_KEY)

      // Unregister the push SW if it’s currently registered.
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          regs.map(async (r) => {
            const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || ''
            if (url.includes('/push-service-worker.js')) {
              await r.unregister()
            }
          })
        )
      } catch {
        // ignore
      }

      await resetLocalEngineIdentity(webLocalStorage)
      await clearDevicePrefsStorage()
      setStatus('This device was reset. Re-enable notifications to re-register.')
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function deleteAllMyDevices() {
    setBusy(true)
    setStatus('')
    try {
      const stableId = await getOrCreateStableDeviceId(webLocalStorage)
      const deviceId = formatWebDeviceId(stableId)
      const token = await getDeviceToken(webLocalStorage)
      if (!token) {
        setStatus('Missing device auth. Reset this device or re-enable notifications first.')
        return
      }
      const baseUrl = getEngineBaseUrl()
      const client = createEngineClient({
        baseUrl,
        getAuthHeaders: async () => ({ Authorization: `Bearer ${token}` }),
      })
      await client.deleteMe(deviceId)
      await resetLocalEngineIdentity(webLocalStorage)
      await clearDevicePrefsStorage()
      if (typeof localStorage !== 'undefined') localStorage.removeItem(WEB_PUSH_ENDPOINT_KEY)
      setStatus('Deleted all devices for this user. This device is now reset.')
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/\\b404\\b/.test(msg)) {
        await resetLocalEngineIdentity(webLocalStorage)
        await clearDevicePrefsStorage()
        if (typeof localStorage !== 'undefined') localStorage.removeItem(WEB_PUSH_ENDPOINT_KEY)
        setStatus('Account already deleted. This device is now reset.')
        if (typeof window !== 'undefined') window.location.reload()
        return
      }
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  // SSR + first client paint must match (mounted === false) to avoid hydration mismatch.
  if (!mounted) {
    return (
      <YStack gap="$2" p="$3" maxWidth={400} {...profileCard}>
        <Paragraph fontWeight="600">Surf Engine notifications (web)</Paragraph>
        <Paragraph size="$2" color="$color10">
          Preparing notification setup…
        </Paragraph>
      </YStack>
    )
  }

  if (!supportsPush) {
    return (
      <YStack gap="$2" p="$3" maxWidth={400} {...profileCard}>
        <Paragraph fontWeight="600">Surf Engine notifications (web)</Paragraph>
        <Paragraph size="$3" color="$color10">
          Push notifications need a secure context (HTTPS) and a browser that supports the Push API.
        </Paragraph>
      </YStack>
    )
  }

  return (
    <YStack gap="$3" p="$3" maxWidth={400} {...profileCard}>
      <Paragraph fontWeight="600">Surf Engine notifications (Web)</Paragraph>
      <Paragraph size="$2" color="$color10">
      </Paragraph>
      <Button {...profilePrimaryButton} disabled={busy} onPress={enableWebPush}>
        Enable notifications
      </Button>
      <Button {...profilePrimaryButton} disabled={busy} onPress={disableWebPush}>
        Disable notifications
      </Button>
      <Button {...profilePrimaryButton} disabled={busy} onPress={resetThisDevice}>
        Reset this device
      </Button>
      <Button {...profilePrimaryButton} disabled={busy} onPress={deleteAllMyDevices}>
        Delete all my devices (GDPR)
      </Button>
      {status ? (
        <Paragraph size="$2" color="$color11">
          {status}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
