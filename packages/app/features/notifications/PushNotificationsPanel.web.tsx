'use client'

import { Button, Paragraph, YStack } from '@my/ui'
import { useEffect, useState } from 'react'
import { useDevicePrefs } from 'app/provider/device-prefs'
import {
  createEngineClient,
  formatWebDeviceId,
  getEngineBaseUrl,
  getOrCreateStableDeviceId,
  getOrCreateCanonicalUserId,
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

  // SSR + first client paint must match (mounted === false) to avoid hydration mismatch.
  if (!mounted) {
    return (
      <YStack gap="$2" p="$3" borderWidth={1} borderColor="$borderColor" rounded="$4" maxWidth={400}>
        <Paragraph fontWeight="600">Surf Engine notifications (web)</Paragraph>
        <Paragraph size="$2" color="$color10">
          Preparing notification setup…
        </Paragraph>
      </YStack>
    )
  }

  if (!supportsPush) {
    return (
      <YStack gap="$2" p="$3" borderWidth={1} borderColor="$borderColor" rounded="$4" maxWidth={400}>
        <Paragraph fontWeight="600">Surf Engine notifications (web)</Paragraph>
        <Paragraph size="$3" color="$color10">
          Push notifications need a secure context (HTTPS) and a browser that supports the Push API.
        </Paragraph>
      </YStack>
    )
  }

  return (
    <YStack gap="$3" p="$3" borderWidth={1} borderColor="$borderColor" rounded="$4" maxWidth={400}>
      <Paragraph fontWeight="600">Surf Engine notifications (web)</Paragraph>
      <Paragraph size="$2" color="$color10">
        {`Engine: ${getEngineBaseUrl()}`}
      </Paragraph>
      <Button disabled={busy} onPress={enableWebPush}>
        Enable notifications
      </Button>
      <Button disabled={busy} variant="outlined" onPress={disableWebPush}>
        Disable notifications
      </Button>
      {status ? (
        <Paragraph size="$2" color="$color11">
          {status}
        </Paragraph>
      ) : null}
    </YStack>
  )
}
