import type { DevicePreferences } from 'app/provider/device-prefs'

export type Skill = DevicePreferences['skill']
export type Risk = DevicePreferences['riskTolerance']
export type Strictness = NonNullable<DevicePreferences['notifyStrictness']>

export type WavePreference = 'smaller' | 'moderate' | 'bigger' | 'any'
export type ReefPreference = 'sand' | 'reef' | 'both'

export type StepKey =
  | 'units'
  | 'skill'
  | 'risk'
  | 'waves'
  | 'distance'
  | 'breaks'
  | 'strictness'
  | 'notes'
  | 'location'
  | 'notifications'

export const STEPS: StepKey[] = [
  'units',
  'skill',
  'risk',
  'waves',
  'distance',
  'breaks',
  'strictness',
  'notes',
  'location',
  'notifications',
]

export function getStepContent(step: StepKey): { title: string; description: string; advancedLabel?: string } {
  switch (step) {
    case 'units':
      return {
        title: 'Choose your units',
        description: 'Pick the measurements you’re most comfortable with. We’ll handle the conversions for you.',
      }
    case 'skill':
      return {
        title: 'How comfortable are you in the water?',
        description: 'We’ll use this to match you with suitable surf conditions.',
      }
    case 'risk':
      return {
        title: 'How cautious should alerts be?',
        description: 'Choose whether you prefer safer conditions or are open to more challenging surf.',
      }
    case 'waves':
      return {
        title: 'What kind of surf do you want alerts for?',
        description: 'Choose the type of waves you’re looking for. You can switch to Advanced for more control.',
        advancedLabel: 'Advanced',
      }
    case 'distance':
      return {
        title: 'How far are you willing to travel?',
        description: 'We’ll only send alerts for spots within this distance.',
        advancedLabel: 'Advanced',
      }
    case 'breaks':
      return {
        title: 'What breaks are you comfortable with?',
        description: 'Select the types of breaks you’re happy surfing (e.g. sand or reef).',
        advancedLabel: 'Advanced',
      }
    case 'strictness':
      return {
        title: 'How picky should alerts be?',
        description: 'This controls how often you’ll get notified.',
      }
    case 'notes':
      return {
        title: 'Anything else we should know?',
        description: 'Optional: add extra context like preferred times of day, crowd preferences, or favourite spots. This is guidance for the assistant and may not always be applied exactly - use the structured settings before for rules you want enforced consistently.',
      }
    case 'location':
      return {
        title: 'Set your location',
        description: 'We’ll use this to find nearby surf spots and calculate travel distance.',
      }
    case 'notifications':
      return {
        title: 'Enable alerts',
        description: 'Turn on notifications so you can receive surf alerts on this device.',
      }
  }
}

