'use client'

import { useEffect } from 'react'
import { useRouter } from 'solito/navigation'
import { OnboardingWizard } from './Wizard'
import { useDevicePrefs } from 'app/provider/device-prefs'

export function OnboardingScreen() {
  const { prefs, loading } = useDevicePrefs()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (prefs.onboardingCompleted) {
      router.replace('/profile')
    }
  }, [loading, prefs.onboardingCompleted, router])

  return (
    <OnboardingWizard
      mode="onboarding"
      onDone={() => {
        router.replace('/profile')
      }}
    />
  )
}

