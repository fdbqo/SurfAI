'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Input,
  Paragraph,
  SizableText,
  Switch,
  XStack,
  YStack,
} from '@my/ui'
import { ActivityIndicator, AppState, Platform, useColorScheme } from 'react-native'
import { useDevicePrefs } from 'app/provider/device-prefs'
import type { DevicePreferences } from 'app/provider/device-prefs'
import { getCurrentLocation } from './location'
import { ftToM, kmToMi, knotsToKmh, mToFt, miToKm, kmhToKnots, round1 } from './units'
import { PushNotificationsPanel } from 'app/features/notifications/PushNotificationsPanel'
import { ChevronRight } from '@tamagui/lucide-icons'
import { AnyNumberField } from './wizard/components/AnyNumberField'
import { HeroBrand } from './wizard/components/HeroBrand'
import { OptionButton } from './wizard/components/OptionButton'
import { getStepContent, STEPS, type ReefPreference, type StepKey, type Strictness, type WavePreference } from './wizard/steps'

type Mode = 'onboarding' | 'edit'

type Skill = DevicePreferences['skill']
type Risk = DevicePreferences['riskTolerance']

type Guided = {
  wavePreference: WavePreference | null
  reefPreference: ReefPreference | null
  /** `null` = no max travel distance (matches prefs `maxDistanceKm: null`) */
  maxDistanceKmPreset: number | null
}

type Overrides = {
  waves: {
    minWaveHeightFt: number | null
    maxWaveHeightFt: number | null
    maxWindSpeedKnots: number | null
    minSwellPeriodSec: number | null
  }
  distance: { maxDistanceKm: number | null }
  breaks: { reefAllowed: boolean; sandAllowed: boolean }
}

function clampNum(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// (moved to ./wizard/*)

function mapGuidedToResolved(opts: {
  skill: Skill
  guided: Guided
  strictness: Strictness
}): Pick<
  DevicePreferences,
  | 'minWaveHeightFt'
  | 'maxWaveHeightFt'
  | 'maxWindSpeedKnots'
  | 'minSwellPeriodSec'
  | 'maxDistanceKm'
  | 'reefAllowed'
  | 'sandAllowed'
  | 'notifyStrictness'
> {
  const { skill, guided, strictness } = opts
  const waveMap: Record<Exclude<WavePreference, 'any'>, { min: number; max: number }> = {
    smaller: { min: 1, max: 3 },
    moderate: { min: 2, max: 5 },
    bigger: { min: 3, max: 10 },
  }
  const windMap: Record<Skill, number> = { beginner: 12, intermediate: 18, advanced: 25 }
  const periodMap: Record<Exclude<WavePreference, 'any'>, number> = { smaller: 6, moderate: 8, bigger: 10 }

  const wp = guided.wavePreference ?? 'moderate'
  const reefAllowed = guided.reefPreference === 'reef' || guided.reefPreference === 'both'
  const sandAllowed = guided.reefPreference === 'sand' || guided.reefPreference === 'both'

  const isAnyWaves = wp === 'any'
  const b = isAnyWaves ? null : waveMap[wp as Exclude<WavePreference, 'any'>]
  const minSwell = isAnyWaves ? null : periodMap[wp as Exclude<WavePreference, 'any'>]

  return {
    notifyStrictness: strictness,
    minWaveHeightFt: b ? b.min : null,
    maxWaveHeightFt: b ? b.max : null,
    maxWindSpeedKnots: isAnyWaves ? null : windMap[skill],
    minSwellPeriodSec: minSwell,
    maxDistanceKm: guided.maxDistanceKmPreset,
    reefAllowed,
    sandAllowed,
  }
}

export function OnboardingWizard({ mode, onDone }: { mode: Mode; onDone?: () => void }) {
  const { prefs, patchPrefs, loading } = useDevicePrefs()
  const [stepIdx, setStepIdx] = useState(0)
  const [advanced, setAdvanced] = useState<Record<StepKey, boolean>>(() => ({} as Record<StepKey, boolean>))
  const [guided, setGuided] = useState<Guided>(() => ({
    wavePreference: null,
    reefPreference: null,
    maxDistanceKmPreset:
      prefs.preferences.maxDistanceKm === null
        ? null
        : (prefs.preferences.maxDistanceKm ?? 50),
  }))
  const [overrides, setOverrides] = useState<Overrides>(() => ({
    waves: {
      minWaveHeightFt: prefs.preferences.minWaveHeightFt ?? null,
      maxWaveHeightFt: prefs.preferences.maxWaveHeightFt ?? null,
      maxWindSpeedKnots: prefs.preferences.maxWindSpeedKnots ?? null,
      minSwellPeriodSec: prefs.preferences.minSwellPeriodSec ?? null,
    },
    distance: { maxDistanceKm: prefs.preferences.maxDistanceKm ?? null },
    breaks: {
      reefAllowed: Boolean(prefs.preferences.reefAllowed),
      sandAllowed: Boolean(prefs.preferences.sandAllowed),
    },
  }))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [locationAction, setLocationAction] = useState<null | 'usual' | 'gps'>(null)
  const [autoGps, setAutoGps] = useState(false)
  const colorScheme = useColorScheme()
  const spinnerColor = !colorScheme || colorScheme === 'light' ? '#111111' : '#f2f2f2'

  const step = STEPS[stepIdx]
  const didInitEdit = useRef(false)

  useEffect(() => {
    setLocationAction(null)
  }, [stepIdx])

  useEffect(() => {
    if (loading) return
    if (mode !== 'edit') return
    if (didInitEdit.current) return
    didInitEdit.current = true

    const presets = [15, 30, 50, 100, 150]
    const md = prefs.preferences.maxDistanceKm
    const maxDistanceKmPreset: number | null =
      md === null
        ? null
        : md === undefined
          ? 50
          : presets.reduce((best, cur) => (Math.abs(cur - md) < Math.abs(best - md) ? cur : best), presets[0])

    const reefAllowed = Boolean(prefs.preferences.reefAllowed)
    const sandAllowed = Boolean(prefs.preferences.sandAllowed)
    const reefPreference: ReefPreference =
      reefAllowed && sandAllowed ? 'both' : reefAllowed ? 'reef' : 'sand'

    const minWave = prefs.preferences.minWaveHeightFt
    const maxWave = prefs.preferences.maxWaveHeightFt
    const wavePreference: WavePreference | null =
      minWave == null && maxWave == null
        ? 'any'
        : maxWave == null
          ? 'moderate'
          : maxWave <= 3
            ? 'smaller'
            : maxWave <= 5
              ? 'moderate'
              : maxWave <= 10
                ? 'bigger'
                : 'any'

    setGuided({
      wavePreference,
      reefPreference,
      maxDistanceKmPreset,
    })
  }, [
    loading,
    mode,
    prefs.preferences.maxDistanceKm,
    prefs.preferences.minWaveHeightFt,
    prefs.preferences.maxWaveHeightFt,
    prefs.preferences.reefAllowed,
    prefs.preferences.sandAllowed,
  ])

  useEffect(() => {
    if (step !== 'location') return
    if (!autoGps) return
    if (Platform.OS === 'web') return

    let cancelled = false
    let inFlight = false
    let interval: ReturnType<typeof setInterval> | null = null

    async function tick() {
      if (cancelled) return
      if (inFlight) return
      if (AppState.currentState !== 'active') return

      inFlight = true
      try {
        const pt = await getCurrentLocation()
        if (cancelled) return
        await patchPrefs({
          lastLocation: {
            ...pt,
            source: 'gps',
            confidence: 'high',
            updatedAt: new Date().toISOString(),
          },
        })
      } catch {
        // best effort, keep UI quiet during auto polling.
      } finally {
        inFlight = false
      }
    }

    // run once immediately, then poll.
    void tick()
    interval = setInterval(tick, 30_000)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [autoGps, patchPrefs, step])
  const isAdv = Boolean(advanced[step])
  const units = prefs.units
  const p = prefs.preferences
  const isWeb = Platform.OS === 'web'
  const meta = getStepContent(step)

  const waveSuffix = units.waveHeight
  const windSuffix = units.windSpeed
  const distSuffix = units.distance

  const progress = useMemo(() => (stepIdx + 1) / STEPS.length, [stepIdx])

  function dispWave(ft: number | null | undefined): number | null {
    if (ft == null) return null
    return units.waveHeight === 'm' ? round1(ftToM(ft)) : round1(ft)
  }
  function storeWave(v: number | null): number | null {
    if (v == null) return null
    const ft = units.waveHeight === 'm' ? mToFt(v) : v
    return round1(ft)
  }
  function dispWind(kn: number | null | undefined): number | null {
    if (kn == null) return null
    return units.windSpeed === 'kmh' ? round1(knotsToKmh(kn)) : round1(kn)
  }
  function storeWind(v: number | null): number | null {
    if (v == null) return null
    const kn = units.windSpeed === 'kmh' ? kmhToKnots(v) : v
    return round1(kn)
  }
  function dispDist(km: number | null | undefined): number | null {
    if (km == null) return null
    return units.distance === 'mi' ? round1(kmToMi(km)) : round1(km)
  }
  function storeDist(v: number | null): number | null {
    if (v == null) return null
    const km = units.distance === 'mi' ? miToKm(v) : v
    return round1(km)
  }

  async function applyResolvedForCurrentStep() {
    const strictness: Strictness = (p.notifyStrictness ?? 'strict') as Strictness

    if (step === 'waves') {
      if (isAdv) {
        await patchPrefs({
          preferences: {
            minWaveHeightFt: overrides.waves.minWaveHeightFt,
            maxWaveHeightFt: overrides.waves.maxWaveHeightFt,
            maxWindSpeedKnots: overrides.waves.maxWindSpeedKnots,
            minSwellPeriodSec: overrides.waves.minSwellPeriodSec,
          } as any,
        })
      } else {
        const resolved = mapGuidedToResolved({ skill: p.skill, guided, strictness })
        await patchPrefs({ preferences: resolved as any })
      }
    }

    if (step === 'distance') {
      if (isAdv) {
        await patchPrefs({ preferences: { maxDistanceKm: overrides.distance.maxDistanceKm } as any })
      } else {
        await patchPrefs({
          preferences: { maxDistanceKm: guided.maxDistanceKmPreset } as any,
        })
      }
    }

    if (step === 'breaks') {
      if (isAdv) {
        await patchPrefs({ preferences: { ...overrides.breaks } as any })
      } else if (guided.reefPreference) {
        const reefAllowed = guided.reefPreference === 'reef' || guided.reefPreference === 'both'
        const sandAllowed = guided.reefPreference === 'sand' || guided.reefPreference === 'both'
        await patchPrefs({ preferences: { reefAllowed, sandAllowed } as any })
      }
    }
  }

  async function next() {
    setStatus('')
    await applyResolvedForCurrentStep()
    setStepIdx((s) => clampNum(s + 1, 0, STEPS.length - 1))
  }

  function back() {
    setStatus('')
    setStepIdx((s) => clampNum(s - 1, 0, STEPS.length - 1))
  }

  async function complete() {
    setBusy(true)
    setStatus('')
    try {
      await applyResolvedForCurrentStep()
      await patchPrefs({ onboardingCompleted: true })
      onDone?.()
    } finally {
      setBusy(false)
    }
  }

  async function toggleAdvanced(on: boolean) {
    if (on) {
      const strictness: Strictness = (p.notifyStrictness ?? 'strict') as Strictness
      const resolved = mapGuidedToResolved({ skill: p.skill, guided, strictness })
      setOverrides((o) => ({
        ...o,
        waves: {
          minWaveHeightFt: resolved.minWaveHeightFt ?? null,
          maxWaveHeightFt: resolved.maxWaveHeightFt ?? null,
          maxWindSpeedKnots: resolved.maxWindSpeedKnots ?? null,
          minSwellPeriodSec: resolved.minSwellPeriodSec ?? null,
        },
        distance: { maxDistanceKm: resolved.maxDistanceKm ?? null },
        breaks: { reefAllowed: Boolean(resolved.reefAllowed), sandAllowed: Boolean(resolved.sandAllowed) },
      }))
    }
    setAdvanced((prev) => ({ ...prev, [step]: on }))
  }

  if (loading) return null

  const advToggle = meta.advancedLabel ? (
    <XStack items="center" gap="$2">
      <Paragraph color={isAdv ? '$color12' : '$color10'} size="$3">
        {meta.advancedLabel}
      </Paragraph>
      <Switch size="$2" checked={isAdv} onCheckedChange={(v) => toggleAdvanced(Boolean(v))} />
    </XStack>
  ) : null

  let body: React.ReactNode = null

  if (step === 'units') {
    body = (
      <YStack gap="$4">
        <YStack gap="$3">
          <Paragraph fontWeight="700">Wave height</Paragraph>
          <XStack gap="$2" flexWrap="wrap">
            {(['ft', 'm'] as const).map((u) => (
              <Button
                key={u}
                size="$4"
                variant={units.waveHeight === u ? undefined : 'outlined'}
                onPress={() => patchPrefs({ units: { ...units, waveHeight: u } })}
              >
                {u.toUpperCase()}
              </Button>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$3">
          <Paragraph fontWeight="700">Wind speed</Paragraph>
          <XStack gap="$2" flexWrap="wrap">
            {(['knots', 'kmh'] as const).map((u) => (
              <Button
                key={u}
                size="$4"
                variant={units.windSpeed === u ? undefined : 'outlined'}
                onPress={() => patchPrefs({ units: { ...units, windSpeed: u } })}
              >
                {u === 'kmh' ? 'km/h' : 'knots'}
              </Button>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$3">
          <Paragraph fontWeight="700">Distance</Paragraph>
          <XStack gap="$2" flexWrap="wrap">
            {(['km', 'mi'] as const).map((u) => (
              <Button
                key={u}
                size="$4"
                variant={units.distance === u ? undefined : 'outlined'}
                onPress={() => patchPrefs({ units: { ...units, distance: u } })}
              >
                {u}
              </Button>
            ))}
          </XStack>
        </YStack>
      </YStack>
    )
  }

  if (step === 'skill') {
    body = (
      <YStack gap="$3">
        <OptionButton
          selected={p.skill === 'beginner'}
          onPress={() => patchPrefs({ preferences: { skill: 'beginner' } as any })}
          title="Still learning"
          subtitle="New to surfing or building confidence"
        />
        <OptionButton
          selected={p.skill === 'intermediate'}
          onPress={() => patchPrefs({ preferences: { skill: 'intermediate' } as any })}
          title="Comfortable most days"
          subtitle="Handle a variety of conditions consistently"
        />
        <OptionButton
          selected={p.skill === 'advanced'}
          onPress={() => patchPrefs({ preferences: { skill: 'advanced' } as any })}
          title="Very confident"
          subtitle="Comfortable in bigger, challenging surf"
        />
      </YStack>
    )
  }

  if (step === 'risk') {
    body = (
      <YStack gap="$3">
        <OptionButton
          selected={p.riskTolerance === 'low'}
          onPress={() => patchPrefs({ preferences: { riskTolerance: 'low' } as any })}
          title="Low"
          subtitle="Safer, more conservative suggestions"
        />
        <OptionButton
          selected={p.riskTolerance === 'medium'}
          onPress={() => patchPrefs({ preferences: { riskTolerance: 'medium' } as any })}
          title="Medium"
          subtitle="Balanced"
        />
        <OptionButton
          selected={p.riskTolerance === 'high'}
          onPress={() => patchPrefs({ preferences: { riskTolerance: 'high' } as any })}
          title="High"
          subtitle="More adventurous suggestions"
        />
      </YStack>
    )
  }

  if (step === 'waves') {
    body = isAdv ? (
      <YStack gap="$4" pt="$1">
        <AnyNumberField
          label="Min wave height"
          value={dispWave(overrides.waves.minWaveHeightFt) ?? null}
          suffix={waveSuffix}
          onChange={(v) => setOverrides((o) => ({ ...o, waves: { ...o.waves, minWaveHeightFt: storeWave(v) } }))}
        />
        <AnyNumberField
          label="Max wave height"
          value={dispWave(overrides.waves.maxWaveHeightFt) ?? null}
          suffix={waveSuffix}
          onChange={(v) => setOverrides((o) => ({ ...o, waves: { ...o.waves, maxWaveHeightFt: storeWave(v) } }))}
        />
        <AnyNumberField
          label="Max wind speed"
          value={dispWind(overrides.waves.maxWindSpeedKnots) ?? null}
          suffix={windSuffix}
          onChange={(v) => setOverrides((o) => ({ ...o, waves: { ...o.waves, maxWindSpeedKnots: storeWind(v) } }))}
        />
        <AnyNumberField
          label="Min swell period"
          value={overrides.waves.minSwellPeriodSec ?? null}
          suffix="sec"
          onChange={(v) => setOverrides((o) => ({ ...o, waves: { ...o.waves, minSwellPeriodSec: v } }))}
        />
      </YStack>
    ) : (
      <YStack gap="$3">
        <OptionButton
          selected={guided.wavePreference === 'smaller'}
          onPress={() => setGuided((g) => ({ ...g, wavePreference: 'smaller' }))}
          title="Smaller & cleaner"
          subtitle="Mellow days, clean conditions"
        />
        <OptionButton
          selected={guided.wavePreference === 'moderate'}
          onPress={() => setGuided((g) => ({ ...g, wavePreference: 'moderate' }))}
          title="Moderate is fine"
          subtitle="Some size is good if manageable"
        />
        <OptionButton
          selected={guided.wavePreference === 'bigger'}
          onPress={() => setGuided((g) => ({ ...g, wavePreference: 'bigger' }))}
          title="Bigger OK if manageable"
          subtitle="Happy with more size when it allows"
        />
        <OptionButton
          selected={guided.wavePreference === 'any'}
          onPress={() => setGuided((g) => ({ ...g, wavePreference: 'any' }))}
          title="Wind matters more than size"
          subtitle="Clean conditions over wave height"
        />
      </YStack>
    )
  }

  if (step === 'distance') {
    const presets = [15, 30, 50, 100, 150]
    body = isAdv ? (
      <AnyNumberField
        label="Max distance"
        value={dispDist(overrides.distance.maxDistanceKm) ?? null}
        suffix={distSuffix}
        onChange={(v) => setOverrides((o) => ({ ...o, distance: { maxDistanceKm: storeDist(v) } }))}
      />
    ) : (
      <YStack gap="$3">
        <XStack gap="$2" flexWrap="wrap">
          {presets.map((km) => {
            const selected = guided.maxDistanceKmPreset === km
            return (
              <Button
                key={km}
                size="$4"
                variant={selected ? undefined : 'outlined'}
                onPress={() => setGuided((g) => ({ ...g, maxDistanceKmPreset: km }))}
              >
                {units.distance === 'mi' ? `${round1(kmToMi(km))} mi` : `${km} km`}
              </Button>
            )
          })}
        </XStack>
        <OptionButton
          selected={guided.maxDistanceKmPreset === null}
          onPress={() => setGuided((g) => ({ ...g, maxDistanceKmPreset: null }))}
          title="No travel limit"
          subtitle="Don’t cap how far we search for spots"
        />
      </YStack>
    )
  }

  if (step === 'breaks') {
    body = isAdv ? (
      <YStack gap="$3.5">
        <XStack items="center" justify="space-between">
          <Paragraph>Sand / beach breaks</Paragraph>
          <Switch
            checked={overrides.breaks.sandAllowed}
            onCheckedChange={(v) => setOverrides((o) => ({ ...o, breaks: { ...o.breaks, sandAllowed: Boolean(v) } }))}
          />
        </XStack>
        <XStack items="center" justify="space-between">
          <Paragraph>Reef / rock breaks</Paragraph>
          <Switch
            checked={overrides.breaks.reefAllowed}
            onCheckedChange={(v) => setOverrides((o) => ({ ...o, breaks: { ...o.breaks, reefAllowed: Boolean(v) } }))}
          />
        </XStack>
      </YStack>
    ) : (
      <YStack gap="$3">
        <OptionButton
          selected={guided.reefPreference === 'sand'}
          onPress={() => setGuided((g) => ({ ...g, reefPreference: 'sand' }))}
          title="Prefer sand"
          subtitle="Beach breaks only"
        />
        <OptionButton
          selected={guided.reefPreference === 'reef'}
          onPress={() => setGuided((g) => ({ ...g, reefPreference: 'reef' }))}
          title="Happy on reef"
          subtitle="Reef or rock breaks are fine"
        />
        <OptionButton
          selected={guided.reefPreference === 'both'}
          onPress={() => setGuided((g) => ({ ...g, reefPreference: 'both' }))}
          title="No preference"
          subtitle="Sand and reef"
        />
      </YStack>
    )
  }

  if (step === 'strictness') {
    const current: Strictness = (p.notifyStrictness ?? 'moderate') as Strictness
    body = (
      <YStack gap="$3">
        <OptionButton
          selected={current === 'strict'}
          onPress={() => patchPrefs({ preferences: { notifyStrictness: 'strict' } as any })}
          title="Only really good days"
          subtitle="Fewer alerts"
        />
        <OptionButton
          selected={current === 'moderate'}
          onPress={() => patchPrefs({ preferences: { notifyStrictness: 'moderate' } as any })}
          title="Balanced"
          subtitle="A mix of quality and frequency"
        />
        <OptionButton
          selected={current === 'lenient'}
          onPress={() => patchPrefs({ preferences: { notifyStrictness: 'lenient' } as any })}
          title="Tell me more often"
          subtitle="More alerts"
        />
      </YStack>
    )
  }

  if (step === 'notes') {
    body = (
      <YStack gap="$3">
        <Input
          value={p.freeText || ''}
          onChangeText={(t) => patchPrefs({ preferences: { freeText: t } as any })}
          placeholder="e.g. prefer dawn patrol, avoid crowds…"
          multiline
          minHeight={120}
          rounded="$8"
          px="$4"
          py="$3"
          borderWidth={1}
          borderColor="rgba(15,23,42,0.08)"
          bg="rgba(255,255,255,0.86)"
        />
      </YStack>
    )
  }

  if (step === 'location') {
    const usual = prefs.usualLocation
    const last = prefs.lastLocation
    const locBusy = busy || locationAction !== null
    body = (
      <YStack gap="$4">
        <YStack gap="$3" p="$4" rounded="$8" bg="rgba(15,23,42,0.03)">
          <Paragraph fontWeight="800">Usual location</Paragraph>
          <XStack gap="$2" flexWrap="wrap">
            <Input
              width={160}
              keyboardType="numeric"
              placeholder="lat"
              value={usual ? String(usual.lat) : ''}
              onChangeText={(t) => {
                const v = Number(t)
                if (!Number.isFinite(v)) return
                patchPrefs({ usualLocation: { lat: v, lon: usual?.lon ?? 0 } })
              }}
            />
            <Input
              width={160}
              keyboardType="numeric"
              placeholder="lon"
              value={usual ? String(usual.lon) : ''}
              onChangeText={(t) => {
                const v = Number(t)
                if (!Number.isFinite(v)) return
                patchPrefs({ usualLocation: { lat: usual?.lat ?? 0, lon: v } })
              }}
            />
          </XStack>
          <Button
            size="$4"
            rounded="$8"
            variant="outlined"
            disabled={locBusy}
            onPress={async () => {
              setLocationAction('usual')
              setBusy(true)
              setStatus('')
              try {
                const pt = await getCurrentLocation()
                await patchPrefs({ usualLocation: pt })
                setStatus('Set usual location from current position.')
              } catch (e) {
                setStatus(e instanceof Error ? e.message : 'Failed to read location')
              } finally {
                setBusy(false)
                setLocationAction(null)
              }
            }}
          >
            <XStack items="center" justify="center" gap="$2">
              {locationAction === 'usual' ? (
                <ActivityIndicator size="small" color={spinnerColor} />
              ) : null}
              <Paragraph>Use current location as usual</Paragraph>
            </XStack>
          </Button>
        </YStack>

        <YStack gap="$3" p="$4" rounded="$8" bg="rgba(15,23,42,0.03)">
          <Paragraph fontWeight="800">Current location (GPS)</Paragraph>
          <Paragraph size="$2" color="$color10">
            {last ? `Last updated: ${last.updatedAt}` : 'Not set yet.'}
          </Paragraph>
          {!isWeb ? (
            <XStack items="center" justify="space-between" gap="$3">
              <Paragraph size="$3" color={autoGps ? '$color12' : '$color10'}>
                Auto-update while on this screen
              </Paragraph>
              <Switch size="$2" checked={autoGps} onCheckedChange={(v) => setAutoGps(Boolean(v))} />
            </XStack>
          ) : null}
          <Button
            size="$4"
            rounded="$8"
            disabled={locBusy}
            onPress={async () => {
              setLocationAction('gps')
              setBusy(true)
              setStatus('')
              try {
                const pt = await getCurrentLocation()
                await patchPrefs({
                  lastLocation: {
                    ...pt,
                    source: 'gps',
                    confidence: 'high',
                    updatedAt: new Date().toISOString(),
                  },
                })
                setStatus('Updated GPS location.')
              } catch (e) {
                setStatus(e instanceof Error ? e.message : 'Failed to read location')
              } finally {
                setBusy(false)
                setLocationAction(null)
              }
            }}
          >
            <XStack items="center" justify="center" gap="$2">
              {locationAction === 'gps' ? (
                <ActivityIndicator size="small" color={spinnerColor} />
              ) : null}
              <Paragraph>Update GPS location</Paragraph>
            </XStack>
          </Button>
        </YStack>
      </YStack>
    )
  }

  if (step === 'notifications') {
    const enabled = Boolean(prefs.notificationSettings.enabled)
    body = (
      <YStack gap="$4">
        <PushNotificationsPanel />
        <XStack
          items="center"
          justify="space-between"
          p="$3"
          rounded="$8"
          bg={enabled ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.08)'}
          borderWidth={1}
          borderColor={enabled ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.20)'}
        >
          <YStack gap="$1">
            <Paragraph fontWeight="700">Alerts</Paragraph>
            <Paragraph size="$2" color="$color10">
              {enabled ? 'Enabled' : 'Disabled'}
            </Paragraph>
          </YStack>
          <XStack items="center" gap="$3">
            <Paragraph fontWeight="800" color={enabled ? '$green10' : '$red10'}>
              {enabled ? 'ON' : 'OFF'}
            </Paragraph>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => patchPrefs({ notificationSettings: { enabled: Boolean(v) } })}
            />
          </XStack>
        </XStack>
      </YStack>
    )
  }

  return (
    <YStack flex={1} width="100%" px="$4" py="$4" bg="$background">
      <YStack width="100%" maxWidth={720} alignSelf="center" gap="$4">
        {mode === 'onboarding' ? <HeroBrand /> : null}

        <YStack
          gap="$4"
          p="$4"
          borderWidth={1}
          borderColor="$borderColor"
          rounded="$8"
          bg="$background"
        >
          <XStack items="center" justify="space-between" gap="$3" flexWrap="wrap">
            <Paragraph color="$color10">
              Step {stepIdx + 1} of {STEPS.length}
            </Paragraph>
            {advToggle}
          </XStack>
            <YStack height={4} width="100%" bg="$color3" rounded="$10" overflow="hidden">
              <YStack height="100%" width={`${Math.round(progress * 100)}%`} bg="$color9" />
            </YStack>
          

          <YStack gap="$2">
            <SizableText fontWeight="800" size="$7">
              {meta.title}
            </SizableText>
            <Paragraph color="$color10">{meta.description}</Paragraph>
          </YStack>

          <YStack gap="$3">
            {body}
            {status ? (
              <Paragraph size="$2" color="$color11">
                {status}
              </Paragraph>
            ) : null}
          </YStack>

          <XStack gap="$2" flexWrap="wrap">
            <Button variant="outlined" disabled={stepIdx === 0 || busy} onPress={back}>
              Back
            </Button>

            {stepIdx < STEPS.length - 1 ? (
              <Button disabled={busy} onPress={next} iconAfter={ChevronRight}>
                Continue
              </Button>
            ) : (
              <Button disabled={busy} onPress={complete}>
                {mode === 'onboarding' ? 'Finish setup' : 'Save changes'}
              </Button>
            )}

            {mode === 'onboarding' && stepIdx < STEPS.length - 1 ? (
              <Button variant="outlined" disabled={busy} onPress={next}>
                Skip
              </Button>
            ) : null}
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  )
}
