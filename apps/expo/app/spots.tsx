import { useEffect, useState } from 'react'
import { ScrollView, RefreshControl, Platform } from 'react-native'
import { Stack } from 'expo-router'
import {
  H1,
  YStack,
  XStack,
  Card,
  Paragraph,
  Separator,
  Spinner,
} from '@my/ui'
import type { SpotConditions } from 'shared/types'

interface SpotWithConditions extends SpotConditions {
  spotName: string
  modelRun?: string
  localTime?: string
  localHour?: number
  sourceModel?: string
  error?: string
  code?: string
  reasons?: string[]
}

const CONDITIONS_PATH = '/api/surf/conditions'

/** Next.js origin only (no `/api/...` path). */
function getNextOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '')
  if (fromEnv) {
    // Android emulator: localhost/127.0.0.1 is the device, not your PC.
    if (Platform.OS === 'android' && /\b(localhost|127\.0\.0\.1)\b/.test(fromEnv)) {
      return fromEnv
        .replace(/\b127\.0\.0\.1\b/g, '10.0.2.2')
        .replace(/\blocalhost\b/g, '10.0.2.2')
    }
    return fromEnv
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000'
}

const API_URL = `${getNextOrigin()}${CONDITIONS_PATH}`

export default function SpotsScreen() {
  const [spots, setSpots] = useState<SpotWithConditions[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Surf Spots',
        }}
      />
      <SpotsContent
        spots={spots}
        setSpots={setSpots}
        loading={loading}
        setLoading={setLoading}
        refreshing={refreshing}
        setRefreshing={setRefreshing}
        error={error}
        setError={setError}
      />
    </>
  )
}

function SpotsContent({
  spots,
  setSpots,
  loading,
  setLoading,
  refreshing,
  setRefreshing,
  error,
  setError,
}: {
  spots: SpotWithConditions[]
  setSpots: (spots: SpotWithConditions[]) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  refreshing: boolean
  setRefreshing: (refreshing: boolean) => void
  error: string | null
  setError: (error: string | null) => void
}) {

  const fetchConditions = async () => {
    try {
      setError(null)
      const response = await fetch(API_URL, {
        cache: 'no-store',
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({} as { error?: string; detail?: string }))
        throw new Error(
          errBody.detail || errBody.error || `Request failed (${response.status})`
        )
      }
      const data = await response.json()
      setSpots(Array.isArray(data) ? data : [data])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching conditions:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchConditions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchConditions()
  }

  if (loading) {
    return (
      <YStack flex={1} justify="center" items="center" p="$4" bg="$background">
        <Spinner size="large" />
        <Paragraph mt="$4">Loading surf conditions...</Paragraph>
      </YStack>
    )
  }

  if (error) {
    return (
      <YStack flex={1} justify="center" items="center" p="$4" bg="$background">
        <Paragraph color="$red10" textAlign="center">
          Error: {error}
        </Paragraph>
        <Paragraph mt="$2" size="$3" color="$color10" textAlign="center">
          Start Next on port 3000. On a physical device, set EXPO_PUBLIC_API_URL to your PC LAN IP (e.g.
          http://192.168.1.10:3000) and run next dev with --hostname 0.0.0.0 so the API is reachable.
        </Paragraph>
      </YStack>
    )
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <YStack flex={1} p="$4" bg="$background" gap="$4">
        <YStack gap="$3">
          <H1>Ireland Surf Spots</H1>
          <Paragraph size="$2" color="$color10">
            Live values from the latest hourly data (no server score).
          </Paragraph>
        </YStack>
        <Separator />
        <YStack gap="$4">
          {spots.map((spot) => (
            <SpotCard key={spot.spotId} spot={spot} />
          ))}
        </YStack>
      </YStack>
    </ScrollView>
  )
}

function SpotCard({ spot }: { spot: SpotWithConditions }) {
  if ('error' in spot && spot.error) {
    return (
      <Card size="$4" p="$4" bg="$color2" borderWidth={1} borderColor="$borderColor">
        <Paragraph size="$4" fontWeight="600" color="$color12">
          {spot.spotName}
        </Paragraph>
        <Paragraph size="$3" color="$color10" mt="$2">
          {spot.error}
        </Paragraph>
      </Card>
    )
  }

  const getDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(degrees / 45) % 8
    return directions[index]
  }

  const getWindQuality = (speed: number, direction: number) => {
    const isOffshore = direction >= 180 && direction <= 270
    if (speed < 10) return { label: isOffshore ? 'Light Offshore' : 'Light Onshore', color: '$green10' }
    if (speed < 20) return { label: isOffshore ? 'Moderate Offshore' : 'Moderate Onshore', color: '$yellow10' }
    return { label: isOffshore ? 'Strong Offshore' : 'Strong Onshore', color: '$red10' }
  }

  const wSpeed = spot.windSpeed2m ?? spot.windSpeed ?? 0
  const windQuality = getWindQuality(wSpeed, spot.windDirection)
  const swellHeight = spot.swellHeight ?? spot.waveHeight
  const swellPeriod = spot.swellPeriod ?? spot.wavePeriod

  return (
    <Card
      size="$4"
      p="$4"
      bg="$color2"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <YStack gap="$4">
        <YStack gap="$1">
          <H1 size="$6">{spot.spotName}</H1>
          {spot.sourceModel ? (
            <Paragraph size="$2" color="$color10" textTransform="capitalize">
              Source: {spot.sourceModel}
            </Paragraph>
          ) : null}
        </YStack>

        <Separator />

        {/* Swell Information */}
        <YStack gap="$2">
          <Paragraph size="$3" fontWeight="600" color="$color11">
            🌊 Swell Conditions
          </Paragraph>
          <XStack gap="$4" flexWrap="wrap">
            <YStack gap="$1" flex={1} minWidth={100}>
              <Paragraph size="$2" color="$color10">
                Swell Height
              </Paragraph>
              <Paragraph size="$6" fontWeight="700">
                {swellHeight.toFixed(2)}m
              </Paragraph>
            </YStack>
            <YStack gap="$1" flex={1} minWidth={100}>
              <Paragraph size="$2" color="$color10">
                Period
              </Paragraph>
              <Paragraph size="$6" fontWeight="700">
                {swellPeriod.toFixed(2)}s
              </Paragraph>
            </YStack>
            <YStack gap="$1" flex={1} minWidth={100}>
              <Paragraph size="$2" color="$color10">
                Direction
              </Paragraph>
              <Paragraph size="$6" fontWeight="700">
                {spot.swellDirection ? `${getDirection(spot.swellDirection)} (${spot.swellDirection}°)` : 'N/A'}
              </Paragraph>
            </YStack>
          </XStack>
          {spot.waveHeight && spot.waveHeight !== swellHeight && (
            <Paragraph size="$2" color="$color10" mt="$1">
              Combined wave height: {spot.waveHeight.toFixed(2)}m
            </Paragraph>
          )}
        </YStack>

        <Separator />

        {/* Wind Information */}
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Paragraph size="$3" fontWeight="600" color="$color11">
              💨 Wind Conditions
            </Paragraph>
            <Paragraph size="$1" color="$color10" fontStyle="italic">
              ℹ️ Adjusted to ~2m height
            </Paragraph>
          </XStack>
          <XStack gap="$4" flexWrap="wrap">
            <YStack gap="$1" flex={1} minWidth={100}>
              <Paragraph size="$2" color="$color10">
                Speed (Surface)
              </Paragraph>
              <Paragraph size="$6" fontWeight="700">
                {(spot.windSpeed2m ?? spot.windSpeed).toFixed(2)} km/h
              </Paragraph>
              {spot.windSpeed10m && spot.windSpeed10m !== (spot.windSpeed2m ?? spot.windSpeed) && (
                <Paragraph size="$1" color="$color10">
                  (10m: {spot.windSpeed10m.toFixed(2)} km/h)
                </Paragraph>
              )}
            </YStack>
            <YStack gap="$1" flex={1} minWidth={100}>
              <Paragraph size="$2" color="$color10">
                Direction
              </Paragraph>
              <Paragraph size="$6" fontWeight="700">
                {getDirection(spot.windDirection)} ({spot.windDirection}°)
              </Paragraph>
            </YStack>
            <YStack gap="$1" flex={1} minWidth={120}>
              <Paragraph size="$2" color="$color10">
                Quality
              </Paragraph>
              <Paragraph
                size="$5"
                fontWeight="600"
                color={windQuality.color as any} // Fix type error for color prop
              >
                {windQuality.label}
              </Paragraph>
            </YStack>
          </XStack>
          <Paragraph size="$2" color="$color10" mt="$1" fontStyle="italic">
            Wind values adjusted from standard 10m meteorological height to approx. 2-3m near-surface wind for more realistic surf conditions.
          </Paragraph>
        </YStack>

      </YStack>
    </Card>
  )
}

