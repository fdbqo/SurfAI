import { Button, H1, Paragraph, Separator, XStack, YStack } from '@my/ui'
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
      {/* Decorative wave shape */}
      <YStack
        pointerEvents="none"
        position="absolute"
        b={-140}
        l={-80}
        r={-80}
        h={320}
        backgroundColor="#0A3D91"
        opacity={0.32}
        borderTopLeftRadius={260}
        borderTopRightRadius={260}
        rotate="-6deg"
      />
      <YStack
        pointerEvents="none"
        position="absolute"
        b={-170}
        l={-120}
        r={-120}
        h={360}
        backgroundColor="#072B63"
        opacity={0.28}
        borderTopLeftRadius={320}
        borderTopRightRadius={320}
        rotate="4deg"
      />

      <YStack gap="$4" maxWidth={560} width="100%" zIndex={1}>
        <H1 text="center" color="$color12">
          Surf AI
        </H1>
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
