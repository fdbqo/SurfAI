import type { ComponentType } from 'react'
import { Platform } from 'react-native'

export type PushNotificationsPanelProps = {
  /**
   * Optional override for the onboarding flag sent to engine during device registration.
   * Used by onboarding flow where notification registration happens just before "Finish setup".
   */
  registrationOnboardingCompletedOverride?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebPanel = require('./PushNotificationsPanel.web').PushNotificationsPanel as ComponentType<PushNotificationsPanelProps>
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativePanel = require('./PushNotificationsPanel.native')
  .PushNotificationsPanel as ComponentType<PushNotificationsPanelProps>

/** Web vs native implementation; shared types and engine client live in `shared/surf-engine`. */
export const PushNotificationsPanel: ComponentType<PushNotificationsPanelProps> =
  Platform.OS === 'web' ? WebPanel : NativePanel
