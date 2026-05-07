import { Stack } from 'expo-router'
import { ProfilePreferencesScreen } from 'app/features/profile/preferences'

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Edit preferences' }} />
      <ProfilePreferencesScreen />
    </>
  )
}

