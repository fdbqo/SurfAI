import type { ComponentType } from 'react'
import { Platform } from 'react-native'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WebPanel = require('./PushNotificationsPanel.web').PushNotificationsPanel as ComponentType
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NativePanel = require('./PushNotificationsPanel.native')
  .PushNotificationsPanel as ComponentType

/** Web vs native implementation; shared types and engine client live in `shared/surf-engine`. */
export const PushNotificationsPanel: ComponentType =
  Platform.OS === 'web' ? WebPanel : NativePanel
