'use client'

import type { DeviceIdStorage } from 'shared/surf-engine'

// TypeScript doesn't automatically resolve `.native.ts` / `.web.ts` in this repo config,
// so we select the right adapter at runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Platform } = require('react-native') as typeof import('react-native')

export const transferStorage: DeviceIdStorage =
  Platform.OS === 'web'
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require('./transferStorage.web').transferStorage as DeviceIdStorage)
    : // eslint-disable-next-line @typescript-eslint/no-var-requires
      (require('./transferStorage.native').transferStorage as DeviceIdStorage)

