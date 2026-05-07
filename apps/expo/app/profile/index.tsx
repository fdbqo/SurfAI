import { Stack } from 'expo-router'
import { ProfileScreen } from 'app/features/profile/screen'

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ProfileScreen />
    </>
  )
}

