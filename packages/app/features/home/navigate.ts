import { Platform } from 'react-native'

// Expo / RN bundlers resolve platform-specific extensions, but TypeScript
// doesn't when importing `./navigate`. This file keeps TS happy.
export const navigateToPath: (href: string) => void =
  Platform.OS === 'web'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./navigate.web').navigateToPath
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./navigate.native').navigateToPath

