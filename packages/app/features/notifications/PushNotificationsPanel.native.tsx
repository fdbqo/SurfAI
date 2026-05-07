import { Button, Paragraph, YStack } from '@my/ui'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { useState } from 'react'
import { Platform } from 'react-native'
import { clearDevicePrefsStorage, useDevicePrefs } from 'app/provider/device-prefs'
import { profileCard, profilePrimaryButton } from 'app/features/profile/profileScreenStyles'
import {
  createEngineClient,
  formatMobileDeviceId,
  getEngineBaseUrl,
  getDeviceToken,
  getOrCreateStableDeviceId,
  getOrCreateCanonicalUserId,
  resetLocalEngineIdentity,
  setDeviceToken,
  type DeviceIdStorage,
} from 'shared/surf-engine'
import type { PushNotificationsPanelProps } from './PushNotificationsPanel'

const EXPO_TOKEN_STORAGE_KEY = 'surf-engine-expo-push-token'

const asyncStorageAdapter: DeviceIdStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
}

const secureStoreAdapter: DeviceIdStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

export function PushNotificationsPanel({ registrationOnboardingCompletedOverride }: PushNotificationsPanelProps) {
  const { prefs } = useDevicePrefs()
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  async function enableExpoPush() {
    setBusy(true)
    setStatus('')
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      }

      const { status: existing } = await Notifications.getPermissionsAsync()
      let final = existing
      if (existing !== 'granted') {
        const req = await Notifications.requestPermissionsAsync()
        final = req.status
      }
      if (final !== 'granted') {
        setStatus('Notification permission denied.')
        return
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId

      const tokenRes = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      )
      const expoToken = tokenRes.data
      if (!expoToken?.startsWith('ExponentPushToken')) {
        setStatus('Could not read Expo push token.')
        return
      }

      const baseUrl = getEngineBaseUrl()
      const client = createEngineClient({ baseUrl })
      const stableId = await getOrCreateStableDeviceId(secureStoreAdapter)
      const deviceId = formatMobileDeviceId(stableId)
      const userId = await getOrCreateCanonicalUserId(secureStoreAdapter, deviceId)
      const platform = Platform.OS === 'ios' ? 'ios' : 'android'

      const regRes = await client.registerDevice({
        userId,
        channel: 'expo',
        platform,
        deviceId,
        expoToken,
        preferences: prefs.preferences,
        notificationSettings: prefs.notificationSettings,
        onboardingCompleted: registrationOnboardingCompletedOverride ?? prefs.onboardingCompleted,
        units: prefs.units,
        usualLocation: prefs.usualLocation,
        lastLocation: prefs.lastLocation,
      })
      if (regRes.deviceToken) {
        await setDeviceToken(secureStoreAdapter, regRes.deviceToken)
      }

      await AsyncStorage.setItem(EXPO_TOKEN_STORAGE_KEY, expoToken)
      setStatus('Expo push registered with Surf Engine.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function disableExpoPush() {
    setBusy(true)
    setStatus('')
    try {
      const stored = await AsyncStorage.getItem(EXPO_TOKEN_STORAGE_KEY)
      if (!stored) {
        setStatus('No Expo token stored to disable.')
        return
      }
      const baseUrl = getEngineBaseUrl()
      const client = createEngineClient({ baseUrl })
      await client.disableDevice({ channel: 'expo', expoToken: stored })
      await AsyncStorage.removeItem(EXPO_TOKEN_STORAGE_KEY)
      setStatus('Expo push disabled (server).')
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
      const stableId = await getOrCreateStableDeviceId(secureStoreAdapter)
      const deviceId = formatMobileDeviceId(stableId)
      const token = await getDeviceToken(secureStoreAdapter)

      // Best-effort: delete the device server-side if we have auth; fall back to disable.
      try {
        const stored = await AsyncStorage.getItem(EXPO_TOKEN_STORAGE_KEY)
        const baseUrl = getEngineBaseUrl()
        const client = createEngineClient({
          baseUrl,
          getAuthHeaders: async () => (token ? { Authorization: `Bearer ${token}` } : undefined),
        })
        if (token) {
          await client.deleteDevice(deviceId)
        } else if (stored) {
          await client.disableDevice({ channel: 'expo', expoToken: stored })
        }
      } catch {
        // ignore
      }

      await AsyncStorage.removeItem(EXPO_TOKEN_STORAGE_KEY)
      await resetLocalEngineIdentity(secureStoreAdapter)
      await clearDevicePrefsStorage()
      setStatus('This device was reset. Re-open the app to start fresh.')
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
      const stableId = await getOrCreateStableDeviceId(secureStoreAdapter)
      const deviceId = formatMobileDeviceId(stableId)
      const token = await getDeviceToken(secureStoreAdapter)
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
      await AsyncStorage.removeItem(EXPO_TOKEN_STORAGE_KEY)
      await resetLocalEngineIdentity(secureStoreAdapter)
      await clearDevicePrefsStorage()
      setStatus('Deleted all devices for this user. Re-open the app to start fresh.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/\\b404\\b/.test(msg)) {
        await AsyncStorage.removeItem(EXPO_TOKEN_STORAGE_KEY)
        await resetLocalEngineIdentity(secureStoreAdapter)
        await clearDevicePrefsStorage()
        setStatus('Account already deleted. Re-open the app to start fresh.')
        return
      }
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <YStack gap="$3" p="$3" maxWidth={400} {...profileCard}>
      <Paragraph fontWeight="600">Surf Engine notifications (Mobile)</Paragraph>
      <Paragraph size="$2" color="$color10">
        Due to the functionality of the app, you must register and allow notifications for it to work.
      </Paragraph>
      <Button {...profilePrimaryButton} disabled={busy} onPress={enableExpoPush}>
        Enable notifications
      </Button>
      <Button {...profilePrimaryButton} disabled={busy} onPress={disableExpoPush}>
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
