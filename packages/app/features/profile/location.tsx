'use client'

import { useEffect, useState } from 'react'
import { ActivityIndicator, AppState, Platform, useColorScheme } from 'react-native'
import { Button, Input, Paragraph, SizableText, Switch, XStack, YStack } from '@my/ui'
import { useRouter } from 'solito/navigation'
import { useDevicePrefs } from 'app/provider/device-prefs'
import { getCurrentLocation } from 'app/features/onboarding/location'
import { profileBackButton, profileCard, profilePrimaryButton } from 'app/features/profile/profileScreenStyles'

export function ProfileLocationScreen() {
  const { prefs, patchPrefs, loading } = useDevicePrefs()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [locationAction, setLocationAction] = useState<null | 'usual' | 'gps'>(null)
  const [autoGps, setAutoGps] = useState(false)

  const colorScheme = useColorScheme()
  const spinnerColor = !colorScheme || colorScheme === 'light' ? '#111111' : '#f2f2f2'

  useEffect(() => {
    if (!autoGps) return
    if (Platform.OS === 'web') return

    let cancelled = false
    let inFlight = false
    let interval: ReturnType<typeof setInterval> | null = null

    async function tick() {
      if (cancelled) return
      if (inFlight) return
      if (AppState.currentState !== 'active') return

      inFlight = true
      try {
        const pt = await getCurrentLocation()
        if (cancelled) return
        await patchPrefs({
          lastLocation: {
            ...pt,
            source: 'gps',
            confidence: 'high',
            updatedAt: new Date().toISOString(),
          },
        })
      } catch {
        // Best-effort; keep UI quiet during auto polling.
      } finally {
        inFlight = false
      }
    }

    void tick()
    interval = setInterval(tick, 30_000)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [autoGps, patchPrefs])

  if (loading) return null

  const usual = prefs.usualLocation
  const last = prefs.lastLocation
  const locBusy = busy || locationAction !== null

  return (
    <YStack flex={1} bg="$background" p="$4" gap="$4">
      <YStack gap="$2" maxWidth={720} width="100%" alignSelf="center">
        <XStack justify="flex-start">
          <Button
            {...profileBackButton}
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
          Location
        </SizableText>
        <Paragraph color="$color10">Set a usual location and refresh your current GPS position.</Paragraph>
      </YStack>

      <YStack gap="$4" maxWidth={720} width="100%" alignSelf="center">
        <YStack gap="$3" p="$4" {...profileCard}>
          <Paragraph fontWeight="800">Usual location</Paragraph>
          <XStack gap="$2" flexWrap="wrap">
            <Input
              width={160}
              keyboardType="numeric"
              placeholder="lat"
              value={usual ? String(usual.lat) : ''}
              onChangeText={(t) => {
                const v = Number(t)
                if (!Number.isFinite(v)) return
                patchPrefs({ usualLocation: { lat: v, lon: usual?.lon ?? 0 } })
              }}
            />
            <Input
              width={160}
              keyboardType="numeric"
              placeholder="lon"
              value={usual ? String(usual.lon) : ''}
              onChangeText={(t) => {
                const v = Number(t)
                if (!Number.isFinite(v)) return
                patchPrefs({ usualLocation: { lat: usual?.lat ?? 0, lon: v } })
              }}
            />
          </XStack>
          <Button
            size="$4"
            rounded="$8"
            {...profilePrimaryButton}
            disabled={locBusy}
            onPress={async () => {
              setLocationAction('usual')
              setBusy(true)
              setStatus('')
              try {
                const pt = await getCurrentLocation()
                await patchPrefs({ usualLocation: pt })
                setStatus('Set usual location from current position.')
              } catch (e) {
                setStatus(e instanceof Error ? e.message : 'Failed to read location')
              } finally {
                setBusy(false)
                setLocationAction(null)
              }
            }}
          >
            <XStack items="center" justify="center" gap="$2">
              {locationAction === 'usual' ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
              <Paragraph color="$color1">Use current location as usual</Paragraph>
            </XStack>
          </Button>
        </YStack>

        <YStack gap="$3" p="$4" {...profileCard}>
          <Paragraph fontWeight="800">Current location (GPS)</Paragraph>
          <Paragraph size="$2" color="$color10">
            {last ? `Last updated: ${last.updatedAt}` : 'Not set yet.'}
          </Paragraph>
          <XStack
            items="center"
            justify="space-between"
            p="$3"
            rounded="$8"
            bg="$color3"
            borderWidth={1}
            borderColor={autoGps ? 'rgba(16,185,129,0.35)' : '$borderColor'}
          >
            <YStack gap="$1">
              <Paragraph fontWeight="700">Auto-update</Paragraph>
              <Paragraph size="$2" color="$color10">
                {autoGps ? 'On (while app is open)' : 'Off'}
              </Paragraph>
            </YStack>
            <XStack items="center" gap="$3">
              <Paragraph fontWeight="800" color={autoGps ? '$green10' : '$color10'}>
                {autoGps ? 'ON' : 'OFF'}
              </Paragraph>
              <Switch size="$2" checked={autoGps} onCheckedChange={(v) => setAutoGps(Boolean(v))} />
            </XStack>
          </XStack>
          <Button
            size="$4"
            rounded="$8"
            {...profilePrimaryButton}
            disabled={locBusy}
            onPress={async () => {
              setLocationAction('gps')
              setBusy(true)
              setStatus('')
              try {
                const pt = await getCurrentLocation()
                await patchPrefs({
                  lastLocation: {
                    ...pt,
                    source: 'gps',
                    confidence: 'high',
                    updatedAt: new Date().toISOString(),
                  },
                })
                setStatus('Updated GPS location.')
              } catch (e) {
                setStatus(e instanceof Error ? e.message : 'Failed to read location')
              } finally {
                setBusy(false)
                setLocationAction(null)
              }
            }}
          >
            <XStack items="center" justify="center" gap="$2">
              {locationAction === 'gps' ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
              <Paragraph color="$color1">Update GPS location</Paragraph>
            </XStack>
          </Button>
        </YStack>

        {status ? (
          <Paragraph size="$2" color="$color11">
            {status}
          </Paragraph>
        ) : null}
      </YStack>
    </YStack>
  )
}

