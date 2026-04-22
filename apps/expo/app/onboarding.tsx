import { Stack } from 'expo-router'
import { OnboardingScreen } from 'app/features/onboarding/screen'

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Onboarding' }} />
      <OnboardingScreen />
    </>
  )
}

