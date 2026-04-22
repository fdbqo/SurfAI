import { Button, H1, Paragraph, Separator, SwitchRouterButton, SwitchThemeButton, XStack, YStack } from '@my/ui'
import { Platform } from 'react-native'
import { useRouter } from 'solito/navigation'
import { useDevicePrefs } from 'app/provider/device-prefs'

export function HomeScreen({ pagesMode = false }: { pagesMode?: boolean }) {
  const { prefs, loading } = useDevicePrefs()
  const router = useRouter()
  const isNew = !loading && !prefs.onboardingCompleted

  return (
    <YStack flex={1} justify="center" items="center" gap="$6" p="$4" bg="$background">
      <XStack
        position="absolute"
        width="100%"
        t="$6"
        gap="$6"
        justify="center"
        flexWrap="wrap"
        $sm={{ position: 'relative', t: 0 }}
      >
        {Platform.OS === 'web' && (
          <>
            <SwitchRouterButton pagesMode={pagesMode} />
            <SwitchThemeButton />
          </>
        )}
      </XStack>

      <YStack gap="$4" maxWidth={560} width="100%">
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
            <Button onPress={() => router.push('/profile/transfer')}>Transfer from another device</Button>
            <Button variant="outlined" onPress={() => router.push('/onboarding')}>
              Start setup
            </Button>
            <Paragraph size="$2" color="$color10" text="center">
              You can change everything later in Profile.
            </Paragraph>
          </YStack>
        ) : (
          <XStack gap="$2" flexWrap="wrap" justify="center">
            <Button onPress={() => router.push('/spots')}>View Surf Spots</Button>
            <Button variant="outlined" onPress={() => router.push('/profile')}>
              Profile
            </Button>
          </XStack>
        )}
      </YStack>
    </YStack>
  )
}
