'use client'

import { YStack, SizableText, Paragraph, Button } from '@my/ui'
import { useRouter } from 'solito/navigation'
import { useDevicePrefs } from 'app/provider/device-prefs'
import { profilePrimaryButton } from 'app/features/profile/profileScreenStyles'

export function ProfileScreen() {
  const { prefs } = useDevicePrefs()
  const router = useRouter()

  return (
    <YStack flex={1} bg="$background">
      <YStack p="$4" gap="$2" maxWidth={720} width="100%" alignSelf="center">
        <SizableText size="$8" fontWeight="800" color="$color12">
          Profile
        </SizableText>
        <Paragraph color="$color10">
          Preferences are stored on this device. Transfer code support is coming back next.
        </Paragraph>
        {!prefs.onboardingCompleted ? (
          <Button size="$3" {...profilePrimaryButton} onPress={() => router.replace('/onboarding')}>
            Finish onboarding
          </Button>
        ) : null}
      </YStack>

      <YStack p="$4" gap="$3" maxWidth={720} width="100%" alignSelf="center">
        <Button size="$4" {...profilePrimaryButton} onPress={() => router.push('/profile/location')}>
          Location
        </Button>
        <Button size="$4" {...profilePrimaryButton} onPress={() => router.push('/profile/alerts')}>
          Alerts
        </Button>
        <Button size="$4" {...profilePrimaryButton} onPress={() => router.push('/profile/transfer')}>
          Transfer
        </Button>

        <Button size="$4" {...profilePrimaryButton} onPress={() => router.push('/profile/preferences')}>
          Edit preferences
        </Button>
      </YStack>
    </YStack>
  )
}

