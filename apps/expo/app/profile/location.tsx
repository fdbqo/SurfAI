import { Stack } from 'expo-router'
import { ProfileLocationScreen } from 'app/features/profile/location'

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Location' }} />
      <ProfileLocationScreen />
    </>
  )
}

