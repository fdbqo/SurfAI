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
        description: 'Pick the measurements that feel most natural. We convert everything automatically.',
      }
    case 'skill':
      return {
        title: 'How comfortable are you in the water?',
        description: 'Helps us match conditions to your level.',
      }
    case 'risk':
      return {
        title: 'How cautious should alerts be?',
        description: 'We can lean safer or show more adventurous options.',
      }
    case 'waves':
      return {
        title: 'What kind of surf do you want alerts for?',
        description: 'Use simple presets or switch to Advanced for direct control.',
        advancedLabel: 'Advanced',
      }
    case 'distance':
      return {
        title: 'How far are you willing to travel?',
        description: 'We only notify for spots inside this range.',
        advancedLabel: 'Advanced',
      }
    case 'breaks':
      return {
        title: 'What breaks are you comfortable with?',
        description: 'Choose between sand, reef, or both.',
        advancedLabel: 'Advanced',
      }
    case 'strictness':
      return {
        title: 'How picky should alerts be?',
        description: 'This controls how often you hear from us.',
      }
    case 'notes':
      return {
        title: 'Anything else we should know?',
        description: 'Optional details like time of day, crowd preference, or favourite spots.',
      }
    case 'location':
      return {
        title: 'Set your location',
        description: 'Use a usual location and optionally refresh your live GPS position.',
      }
    case 'notifications':
      return {
        title: 'Enable alerts',
        description: 'Allow notifications so this device can receive surf alerts.',
      }
  }
}

