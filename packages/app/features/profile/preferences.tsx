'use client'

import { Paragraph, SizableText, YStack } from '@my/ui'
import { OnboardingWizard } from 'app/features/onboarding/Wizard'

export function ProfilePreferencesScreen() {
  return (
    <YStack flex={1} bg="$background">
      <YStack flexShrink={0} p="$4" gap="$2" maxWidth={720} width="100%" alignSelf="center">
        <SizableText size="$8" fontWeight="800" color="$color12">
          Edit preferences
        </SizableText>
        <Paragraph color="$color10">Update surf preferences, distance, strictness, and other settings.</Paragraph>
      </YStack>
      {/* minHeight 0 + flex 1 lets the inner ScrollView get a bounded height on native */}
      <YStack flex={1} minHeight={0} width="100%">
        <OnboardingWizard mode="edit" />
      </YStack>
    </YStack>
  )
}

