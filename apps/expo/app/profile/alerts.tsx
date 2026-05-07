import { Stack } from 'expo-router'
import { ProfileAlertsScreen } from 'app/features/profile/alerts'

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Alerts' }} />
      <ProfileAlertsScreen />
    </>
  )
}

