import { Button, H1, Paragraph, Separator, XStack, YStack, isWeb } from '@my/ui'
import { useRouter } from 'solito/navigation'
import { useDevicePrefs } from 'app/provider/device-prefs'
import { profileOutlinedAccentButton, profilePrimaryButton } from 'app/features/profile/profileScreenStyles'

export function HomeScreen({ pagesMode = false }: { pagesMode?: boolean }) {
  const { prefs, loading } = useDevicePrefs()
  const router = useRouter()
  const isNew = !loading && !prefs.onboardingCompleted

  return (
    <YStack
      flex={1}
      justify="center"
      items="center"
      gap="$6"
      p="$4"
      bg="$background"
      position="relative"
      overflow="hidden"
    >
      <YStack gap="$4" maxWidth={560} width="100%" zIndex={1}>
        <XStack justify="center" items="center" gap="$3">
          {isWeb ? <img src="/ico.svg" alt="" width={32} height={32} /> : null}
          <H1 color="$color12">Surf AI</H1>
        </XStack>
        <Paragraph color="$color10" text="center">
          Local-first surf preferences + alerts, with optional transfer codes to link devices.
        </Paragraph>
        <Separator />
        {loading ? (
          <Paragraph text="center" color="$color10">
            Loading…
          </Paragraph>
        ) : isNew ? (
          <YStack gap="$2">
            <Button {...profilePrimaryButton} onPress={() => router.push('/profile/transfer')}>
              Transfer from another device
            </Button>
            <Button {...profileOutlinedAccentButton} onPress={() => router.push('/onboarding')}>
              Start setup
            </Button>
            <Paragraph size="$2" color="$color10" text="center">
              You can change everything later in Profile.
            </Paragraph>
          </YStack>
        ) : (
          <XStack gap="$2" flexWrap="wrap" justify="center">
            <Button {...profilePrimaryButton} onPress={() => router.push('/profile')}>
              Profile
            </Button>
          </XStack>
        )}
      </YStack>
    </YStack>
  )
}
