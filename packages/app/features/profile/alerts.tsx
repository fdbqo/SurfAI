'use client'

import { Button, Paragraph, SizableText, Switch, XStack, YStack } from '@my/ui'
import { useRouter } from 'solito/navigation'
import { PushNotificationsPanel } from 'app/features/notifications/PushNotificationsPanel'
import { useDevicePrefs } from 'app/provider/device-prefs'
import { profileBackButton, profileCard } from 'app/features/profile/profileScreenStyles'

export function ProfileAlertsScreen() {
  const { prefs, patchPrefs, loading } = useDevicePrefs()
  const router = useRouter()

  if (loading) return null
  const enabled = Boolean(prefs.notificationSettings.enabled)

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
          Alerts
        </SizableText>
        <Paragraph color="$color10">Enable push notifications and control whether alerts are active on this device.</Paragraph>
      </YStack>

      <YStack gap="$4" maxWidth={720} width="100%" alignSelf="center">
        <PushNotificationsPanel />
        <XStack
          items="center"
          justify="space-between"
          p="$3"
          {...profileCard}
          borderColor={enabled ? 'rgba(16,185,129,0.35)' : '$borderColor'}
        >
          <YStack gap="$1">
            <Paragraph fontWeight="700">Alerts</Paragraph>
            <Paragraph size="$2" color="$color10">
              {enabled ? 'Enabled' : 'Disabled'}
            </Paragraph>
          </YStack>
          <XStack items="center" gap="$3">
            <Paragraph fontWeight="800" color={enabled ? '$green10' : '$red10'}>
              {enabled ? 'ON' : 'OFF'}
            </Paragraph>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => patchPrefs({ notificationSettings: { enabled: Boolean(v) } })}
            />
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  )
}

