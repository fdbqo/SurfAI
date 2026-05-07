import { Stack } from 'expo-router'
import { ProfileTransferScreen } from 'app/features/profile/transfer'

export default function Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Transfer' }} />
      <ProfileTransferScreen />
    </>
  )
}

