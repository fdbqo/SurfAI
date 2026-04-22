'use client'

import { useEffect, useMemo, useState } from 'react'
import { Platform, ScrollView } from 'react-native'
import { Button, Input, Paragraph, SizableText, XStack, YStack } from '@my/ui'
import { useRouter } from 'solito/navigation'
import { useDevicePrefs } from 'app/provider/device-prefs'
import {
  createEngineClient,
  formatMobileDeviceId,
  formatWebDeviceId,
  getEngineBaseUrl,
  clearDeviceToken,
  getDeviceToken,
  getOrCreateCanonicalUserId,
  getOrCreateStableDeviceId,
  setCanonicalUserId,
  type DeviceIdStorage,
} from 'shared/surf-engine'
import { mapEngineProfileToDevicePrefs } from './transferProfileMap'
import { transferStorage } from './transferStorage'

function formatDeviceId(stableId: string): string {
  return Platform.OS === 'web' ? formatWebDeviceId(stableId) : formatMobileDeviceId(stableId)
}

export function ProfileTransferScreen() {
  const router = useRouter()
  const { setPrefs, patchPrefs } = useDevicePrefs()
  const storage = useMemo<DeviceIdStorage>(() => transferStorage, [])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [engineUrl, setEngineUrl] = useState<string>('')

  const [deviceId, setDeviceId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [tokenPreview, setTokenPreview] = useState<string>('')

  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [redeemCode, setRedeemCode] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let url = ''
        try {
          url = getEngineBaseUrl()
        } catch (e) {
          url = e instanceof Error ? e.message : String(e)
        }
        const stableId = await getOrCreateStableDeviceId(storage)
        const d = formatDeviceId(stableId)
        const u = await getOrCreateCanonicalUserId(storage, d)
        const t = await getDeviceToken(storage)
        if (cancelled) return
        setEngineUrl(url)
        setDeviceId(d)
        setUserId(u)
        setTokenPreview(t ? `${t.slice(0, 6)}…${t.slice(-6)}` : '')
      } catch (e) {
        if (cancelled) return
        setStatus(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [storage])

  async function getAuthHeaders() {
    const token = await getDeviceToken(storage)
    if (!token) return undefined
    return { Authorization: `Bearer ${token}` }
  }

  async function generateCode() {
    setBusy(true)
    setStatus('')
    setGeneratedCode('')
    try {
      const token = await getDeviceToken(storage)
      setTokenPreview(token ? `${token.slice(0, 6)}…${token.slice(-6)}` : '')
      if (!token) {
        throw new Error('Device auth token missing. Enable notifications once (register device) and retry.')
      }
      const baseUrl = getEngineBaseUrl()
      setEngineUrl(baseUrl)
      const client = createEngineClient({ baseUrl, getAuthHeaders })
      const res = await client.createTransferCode({
        userId,
        deviceId,
        ttlMinutes: 10,
      })
      if (!res.ok || !res.code) {
        throw new Error('Failed to create transfer code.')
      }
      setGeneratedCode(res.code)
      setStatus(res.expiresAt ? `Code created. Expires at ${res.expiresAt}` : 'Code created.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function redeem() {
    setBusy(true)
    setStatus('')
    setGeneratedCode('')
    try {
      const code = redeemCode.trim().toUpperCase()
      if (!code) throw new Error('Enter a code first.')
      const token = await getDeviceToken(storage)
      setTokenPreview(token ? `${token.slice(0, 6)}…${token.slice(-6)}` : '')
      if (!token) {
        throw new Error('Device auth token missing. Enable notifications once (register device) and retry.')
      }
      const baseUrl = getEngineBaseUrl()
      setEngineUrl(baseUrl)
      const client = createEngineClient({ baseUrl, getAuthHeaders })
      const res = await client.redeemTransferCode({
        code,
        deviceId,
        currentUserId: userId,
      })
      if (!res.ok || !res.userId) {
        throw new Error('Failed to redeem code.')
      }
      await setCanonicalUserId(storage, res.userId)
      if (res.profile) {
        await setPrefs(mapEngineProfileToDevicePrefs(res.profile))
      } else {
        await patchPrefs({ onboardingCompleted: true })
      }
      setUserId(res.userId)
      setRedeemCode('')

      setStatus(
        'Transfer complete. Preferences were restored from your account. Use Profile → Alerts to enable push on this device when you want notifications here.'
      )
      const t2 = await getDeviceToken(storage)
      setTokenPreview(t2 ? `${t2.slice(0, 6)}…${t2.slice(-6)}` : '')
      router.replace('/profile')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function clearToken() {
    await clearDeviceToken(storage)
    setTokenPreview('')
    setStatus('Device token cleared. Go to Alerts → Enable notifications to re-register and mint a new token.')
  }

  async function registerThisDevice() {
    // Backend currently validates /devices/register by channel:
    // - webpush requires a PushSubscription
    // - expo requires an Expo token
    // So "register" must happen via Alerts → Enable notifications.
    setStatus('To register this device and mint a token, go to Alerts → Enable notifications.')
    router.push('/profile/alerts')
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <YStack gap="$2" maxWidth={720} width="100%" alignSelf="center">
          <XStack justify="flex-start">
            <Button
              size="$3"
              variant="outlined"
              onPress={() => {
                try {
                  router.back()
                } catch {
                  router.push('/profile')
                }
              }}
            >
              Back
            </Button>
          </XStack>
          <SizableText size="$8" fontWeight="800" color="$color12">
            Transfer
          </SizableText>
          <Paragraph color="$color10">
            Link this device to another device’s Surf Engine user. Use “Generate” on the source device, then “Redeem” on
            the target.
          </Paragraph>
        </YStack>

        <YStack gap="$3" maxWidth={720} width="100%" alignSelf="center">
        <YStack gap="$2" p="$3" borderWidth={1} borderColor="$borderColor" rounded="$8">
          <Paragraph fontWeight="700">This device</Paragraph>
            <Paragraph size="$2" color="$color10">
              Engine URL
            </Paragraph>
            <Input value={engineUrl} disabled />
          <Paragraph size="$2" color="$color10">
            Device ID
          </Paragraph>
          <Input value={deviceId} disabled />
          <Paragraph size="$2" color="$color10">
            Canonical user ID
          </Paragraph>
          <Input value={userId} disabled />
          <Paragraph size="$2" color="$color10">
            Device token
          </Paragraph>
          <XStack gap="$2" items="center" flexWrap="wrap">
            <Input
              flex={1}
              minWidth={220}
              value={tokenPreview ? `Bearer ${tokenPreview}` : ''}
              placeholder="Not set"
              disabled
            />
            <Button size="$3" variant="outlined" disabled={busy || !tokenPreview} onPress={clearToken}>
              Clear token
            </Button>
          </XStack>
          {!tokenPreview ? (
            <YStack gap="$2" mt="$2">
              <Paragraph size="$2" color="$color10">
                Device auth isn’t initialized yet on this device. Enable notifications once to register and mint a device
                token, then come back here.
              </Paragraph>
              <XStack gap="$2" flexWrap="wrap">
                <Button disabled={busy} onPress={registerThisDevice}>
                  Register this device (via Alerts)
                </Button>
                <Button variant="outlined" disabled={busy} onPress={() => router.push('/profile/alerts')}>
                  Enable notifications
                </Button>
              </XStack>
            </YStack>
          ) : null}
        </YStack>

        <YStack gap="$2" p="$3" borderWidth={1} borderColor="$borderColor" rounded="$8">
          <Paragraph fontWeight="700">Generate code (source device)</Paragraph>
          <Paragraph size="$2" color="$color10">
            Generates a one-time code (valid for about 10 minutes).
          </Paragraph>
          <Button disabled={busy || !userId || !deviceId} onPress={generateCode}>
            Generate transfer code
          </Button>
          {generatedCode ? (
            <>
              <Paragraph size="$2" color="$color10">
                Code
              </Paragraph>
              <Input value={generatedCode} disabled />
            </>
          ) : null}
        </YStack>

        <YStack gap="$2" p="$3" borderWidth={1} borderColor="$borderColor" rounded="$8">
          <Paragraph fontWeight="700">Redeem code (target device)</Paragraph>
          <Input
            placeholder="Enter code"
            autoCapitalize="characters"
            value={redeemCode}
            onChangeText={setRedeemCode}
          />
          <Button disabled={busy || !deviceId || !userId} onPress={redeem}>
            Redeem and link this device
          </Button>
          <Paragraph size="$2" color="$color10">
            If you see a 401, enable notifications once to initialize device auth (mint a device token), then retry.
          </Paragraph>
        </YStack>

        {status ? (
          <Paragraph size="$2" color="$color11">
            {status}
          </Paragraph>
        ) : null}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

