import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { bodyFont, headingFont } from './fonts'
import { animations } from './animations'

export const config = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      // App-wide light-blue background theme
      background: '#CFE9FF',
      backgroundHover: '#C2E2FF',
      backgroundPress: '#B5DBFF',
      backgroundFocus: '#B5DBFF',

      // Keep interactive surfaces (buttons/cards) readable on blue base background
      backgroundStrong: '#FFFFFF',
      backgroundStrongHover: '#F7FBFF',
      backgroundStrongPress: '#EAF5FF',
      backgroundStrongFocus: '#EAF5FF',

      // Improve overall contrast
      borderColor: 'rgba(10, 61, 145, 0.25)',
      color: '#0A2236',
      color10: '#33556E',
      color11: '#1E3A52',
      color12: '#061A2B',

      // Surfaces (cards/panels) used throughout the app
      color2: '#FFFFFF',
      color3: '#F7FBFF',
      color4: '#EAF5FF',
    },
    dark: {
      ...defaultConfig.themes.dark,
      // Slightly bluer dark background to match brand
      background: '#061A2B',
    },
  },
  settings:{
    ...defaultConfig.settings,
    onlyAllowShorthands: false
  }
})
