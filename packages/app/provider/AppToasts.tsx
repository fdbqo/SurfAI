'use client'

import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { CustomToast, ToastViewport as ToastViewportOg } from '@my/ui'

/**
 * Web: defer both toasts + viewport until after mount so SSR and first client paint
 * match (fixes Tamagui Theme / Slot / collection hydration on Next).
 * Native: render immediately.
 */
export function AppToasts() {
  if (Platform.OS !== 'web') {
    return (
      <>
        <CustomToast />
        <ToastViewportOg top="$8" left={0} right={0} />
      </>
    )
  }
  return <AppToastsWeb />
}

function AppToastsWeb() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <>
      <CustomToast />
      <ToastViewportOg left={0} right={0} top={10} />
    </>
  )
}
