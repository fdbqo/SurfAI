'use client'

import { Button, Paragraph, SizableText, XStack, YStack } from '@my/ui'
import { useRouter } from 'solito/navigation'
import { OnboardingWizard } from 'app/features/onboarding/Wizard'

export function ProfilePreferencesScreen() {
  const router = useRouter()
  return (
    <YStack flex={1} bg="$background">
      <YStack p="$4" gap="$2" maxWidth={720} width="100%" alignSelf="center">
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
          Edit preferences
        </SizableText>
        <Paragraph color="$color10">Update surf preferences, distance, strictness, and other settings.</Paragraph>
      </YStack>
      <OnboardingWizard mode="edit" />
    </YStack>
  )
}

