'use client'

import { useEffect, useState } from 'react'
import { H1, YStack, XStack, Card, Paragraph, Separator, Button } from '@my/ui'
import type { SpotConditions } from 'shared/types'
import type { SurferAbility } from 'shared/scoring'

interface SpotWithConditions extends SpotConditions {
  spotName: string
  reasons?: string[]
}

export default function SpotsPage() {
  const [spots, setSpots] = useState<SpotWithConditions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ability, setAbility] = useState<SurferAbility>('intermediate')

  useEffect(() => {
      async function fetchConditions() {
      try {
        setLoading(true)
        const url = `/api/surf/conditions?ability=${ability}`
        const response = await fetch(url, {
          cache: 'no-store', // don't cache - we want fresh scores for each ability at the moment
        })
        if (!response.ok) {
          throw new Error('Failed to fetch conditions')
        }
        const data = await response.json()
        setSpots(Array.isArray(data) ? data : [data])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchConditions()
  }, [ability])

  if (loading) {
    return (
      <YStack flex={1} justify="center" items="center" p="$4" bg="$background">
        <Paragraph>Loading surf conditions...</Paragraph>
      </YStack>
    )
  }

  if (error) {
    return (
      <YStack flex={1} justify="center" items="center" p="$4" bg="$background">
        <Paragraph color="$red10">Error: {error}</Paragraph>
      </YStack>
    )
  }

  return (
    <YStack flex={1} p="$4" bg="$background" gap="$4">
      <YStack gap="$3">
        <H1>Ireland Surf Spots</H1>
        <YStack gap="$2">
          <Paragraph size="$3" color="$color10">
            Your Ability Level:
          </Paragraph>
          <XStack gap="$2" flexWrap="wrap">
            <Button
              size="$3"
              backgroundColor={ability === 'beginner' ? '$blue8' : '$color4'}
              color={ability === 'beginner' ? '$color12' : '$color11'}
              borderWidth={ability === 'beginner' ? 2 : 1}
              borderColor={ability === 'beginner' ? '$blue10' : '$borderColor'}
              onPress={() => setAbility('beginner')}
            >
              Beginner
            </Button>
            <Button
              size="$3"
              backgroundColor={ability === 'intermediate' ? '$blue8' : '$color4'}
              color={ability === 'intermediate' ? '$color12' : '$color11'}
              borderWidth={ability === 'intermediate' ? 2 : 1}
              borderColor={ability === 'intermediate' ? '$blue10' : '$borderColor'}
              onPress={() => setAbility('intermediate')}
            >
              Intermediate
            </Button>
            <Button
              size="$3"
              backgroundColor={ability === 'advanced' ? '$blue8' : '$color4'}
              color={ability === 'advanced' ? '$color12' : '$color11'}
              borderWidth={ability === 'advanced' ? 2 : 1}
              borderColor={ability === 'advanced' ? '$blue10' : '$borderColor'}
              onPress={() => setAbility('advanced')}
            >
              Advanced
            </Button>
          </XStack>
          <Paragraph size="$2" color="$color10" fontStyle="italic">
            Scores are adjusted based on your ability level
          </Paragraph>
        </YStack>
      </YStack>
      <Separator />
      <YStack gap="$4">
        {spots.map((spot) => (
          <SpotCard key={spot.spotId} spot={spot} />
        ))}
      </YStack>
    </YStack>
  )
}

function SpotCard({ spot }: { spot: SpotWithConditions }) {
  const getScoreColor = (score: number) => {
    if (score >= 7) return '$green10'
    if (score >= 4) return '$yellow10'
    return '$red10'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent'
    if (score >= 6) return 'Good'
    if (score >= 4) return 'Fair'
    return 'Poor'
  }

  const getDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(degrees / 45) % 8
    return directions[index]
  }

  const getWindQuality = (speed: number, direction: number) => {
    // Simplified: for west-facing spots, offshore is typically 180-270
    const isOffshore = direction >= 180 && direction <= 270
    if (speed < 10) return { label: isOffshore ? 'Light Offshore' : 'Light Onshore', color: '$green10' }
    if (speed < 20) return { label: isOffshore ? 'Moderate Offshore' : 'Moderate Onshore', color: '$yellow10' }
    return { label: isOffshore ? 'Strong Offshore' : 'Strong Onshore', color: '$red10' }
  }

  const windQuality = getWindQuality(spot.windSpeed, spot.windDirection)
  const swellHeight = spot.swellHeight ?? spot.waveHeight
  const swellPeriod = spot.swellPeriod ?? spot.wavePeriod

  return (
    <Card
      elevate
      size="$4"
      bordered
      p="$4"
      bg="$color2"
      borderColor="$borderColor"
    >
      <YStack gap="$4">
        {/* Header with Score */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack gap="$1">
            <H1 size="$6">{spot.spotName}</H1>
            <Paragraph size="$2" color="$color10">
              {getScoreLabel(spot.score ?? 0)} Conditions
            </Paragraph>
          </YStack>
          <YStack alignItems="flex-end" gap="$1">
            <XStack gap="$2" alignItems="center">
              <Paragraph size="$9" fontWeight="bold" color={getScoreColor(spot.score ?? 0)}>
                {(spot.score ?? 0).toFixed(1)}
              </Paragraph>
              <Paragraph size="$4" color="$color10">
                /10
              </Paragraph>
            </XStack>
            <Paragraph size="$2" color="$color10">
              Surf Score
            </Paragraph>
          </YStack>
        </XStack>

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
                color={windQuality.color as any}
              >
                {windQuality.label}
              </Paragraph>
            </YStack>
          </XStack>
          <Paragraph size="$2" color="$color10" mt="$1" fontStyle="italic">
            Wind values adjusted from standard 10m meteorological height to approx. 2-3m near-surface wind for more realistic surf conditions.
          </Paragraph>
        </YStack>

        {/* Conditions Summary */}
        {spot.reasons && spot.reasons.length > 0 && (
          <>
            <Separator />
            <YStack gap="$2">
              <Paragraph size="$3" fontWeight="600" color="$color11">
                📋 Conditions Summary
              </Paragraph>
              {spot.reasons.map((reason, idx) => (
                <XStack key={idx} gap="$2" alignItems="flex-start">
                  <Paragraph size="$3" color="$green10">✓</Paragraph>
                  <Paragraph size="$3" color="$color11" flex={1}>
                    {reason}
                  </Paragraph>
                </XStack>
              ))}
            </YStack>
          </>
        )}
      </YStack>
    </Card>
  )
}

