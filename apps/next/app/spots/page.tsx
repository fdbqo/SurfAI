'use client'

import { useEffect, useState, useMemo } from 'react'
import { H1, YStack, XStack, Card, Paragraph, Separator, Button, useMedia } from '@my/ui'
import { allSpots } from 'shared'
import type { SpotConditions } from 'shared/types'
import type { SurferAbility } from 'shared/scoring'

interface SpotWithConditions extends SpotConditions {
  spotName: string
  reasons?: string[]
}

type NavigationLevel = 'countries' | 'regions' | 'spots'
type NavigationState = 
  | { level: 'countries' }
  | { level: 'regions'; country: string }
  | { level: 'spots'; country: string; region: string }

export default function SpotsPage() {
  const media = useMedia()
  const [conditionsMap, setConditionsMap] = useState<Map<string, SpotWithConditions>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ability, setAbility] = useState<SurferAbility>('intermediate')
  const [navigation, setNavigation] = useState<NavigationState>({ level: 'countries' })

  // Fetch all conditions upfront to avoid loading screens
  useEffect(() => {
    async function fetchAllConditions() {
      try {
        setLoading(true)
        const url = `/api/surf/conditions?ability=${ability}`
        const response = await fetch(url, {
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Failed to fetch conditions')
        }
        const data = await response.json()
        const spots = Array.isArray(data) ? data : [data]
        
        // Create a map for quick lookup
        const map = new Map<string, SpotWithConditions>()
        spots.forEach((spot: SpotWithConditions) => {
          map.set(spot.spotId, spot)
        })
        setConditionsMap(map)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAllConditions()
  }, [ability])

  // Group spots by country and region
  const groupedSpots = useMemo(() => {
    const grouped: Record<string, Record<string, typeof allSpots>> = {}
    allSpots.forEach((spot) => {
      if (!grouped[spot.country]) {
        grouped[spot.country] = {}
      }
      if (!grouped[spot.country][spot.region]) {
        grouped[spot.country][spot.region] = []
      }
      grouped[spot.country][spot.region].push(spot)
    })
    return grouped
  }, [])

  const countries = useMemo(() => Object.keys(groupedSpots).sort(), [groupedSpots])
  const regions = useMemo(() => {
    if (navigation.level === 'regions' || navigation.level === 'spots') {
      return Object.keys(groupedSpots[navigation.country] || {}).sort()
    }
    return []
  }, [navigation, groupedSpots])

  const currentSpots = useMemo(() => {
    if (navigation.level === 'spots') {
      return groupedSpots[navigation.country]?.[navigation.region] || []
    }
    return []
  }, [navigation, groupedSpots])

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
        <H1>Surf Spots</H1>
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

      {/* Breadcrumb Navigation */}
      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        <Button
          size="$2"
          variant="outlined"
          onPress={() => setNavigation({ level: 'countries' })}
        >
          Home
        </Button>
        {navigation.level !== 'countries' && (
          <>
            <Paragraph size="$3" color="$color10">›</Paragraph>
            <Button
              size="$2"
              variant="outlined"
              onPress={() => setNavigation({ level: 'regions', country: navigation.country })}
            >
              {navigation.country}
            </Button>
          </>
        )}
        {navigation.level === 'spots' && (
          <>
            <Paragraph size="$3" color="$color10">›</Paragraph>
            <Paragraph size="$3" color="$color11">{navigation.region}</Paragraph>
          </>
        )}
      </XStack>

      <Separator />

      {/* Render current level */}
      {navigation.level === 'countries' && (
        <YStack gap="$3">
          {countries.map((country) => {
            const regionCount = Object.keys(groupedSpots[country]).length
            const spotCount = Object.values(groupedSpots[country]).reduce((sum, regions) => sum + regions.length, 0)
            return (
              <FolderCard
                key={country}
                title={country}
                subtitle={`${regionCount} region${regionCount !== 1 ? 's' : ''} • ${spotCount} spot${spotCount !== 1 ? 's' : ''}`}
                onPress={() => setNavigation({ level: 'regions', country })}
                icon="🌍"
              />
            )
          })}
        </YStack>
      )}

      {navigation.level === 'regions' && (
        <YStack gap="$3">
          {regions.map((region) => {
            const spotCount = groupedSpots[navigation.country][region].length
            return (
              <FolderCard
                key={region}
                title={region}
                subtitle={`${spotCount} spot${spotCount !== 1 ? 's' : ''}`}
                onPress={() => setNavigation({ level: 'spots', country: navigation.country, region })}
                icon="📍"
              />
            )
          })}
        </YStack>
      )}

      {navigation.level === 'spots' && (
        <XStack
          gap="$4"
          style={{
            display: 'grid',
            gridTemplateColumns: media.sm
              ? 'repeat(3, 1fr)'
              : 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {currentSpots.map((spot) => {
            const conditions = conditionsMap.get(spot.id)
            if (!conditions) {
              return (
                <Card
                  key={spot.id}
                  p="$4"
                  bg="$color2"
                  borderColor="$borderColor"
                >
                  <Paragraph>{spot.name} - No conditions available</Paragraph>
                </Card>
              )
            }
            return <SpotCard key={spot.id} spot={conditions} />
          })}
        </XStack>
      )}
    </YStack>
  )
}

function FolderCard({ 
  title, 
  subtitle, 
  onPress, 
  icon 
}: { 
  title: string
  subtitle: string
  onPress: () => void
  icon: string
}) {
  return (
    <Card
      elevate
      size="$4"
      bordered
      p="$4"
      bg="$color2"
      borderColor="$borderColor"
      cursor="pointer"
      hoverStyle={{ bg: '$color3' }}
      onPress={onPress}
    >
      <XStack gap="$3" alignItems="center">
        <Paragraph size="$8">{icon}</Paragraph>
        <YStack flex={1} gap="$1">
          <Paragraph size="$5" fontWeight="600" color="$color12">
            {title}
          </Paragraph>
          <Paragraph size="$3" color="$color10">
            {subtitle}
          </Paragraph>
        </YStack>
        <Paragraph size="$4" color="$color10">›</Paragraph>
      </XStack>
    </Card>
  )
}

function SpotCard({ spot }: { spot: SpotWithConditions }) {
  const media = useMedia()
  const isSmallScreen = !media.sm
  const isMediumScreen = media.sm && !media.md

  const getScoreColor = (score: number) => {
    if (score >= 7) return '$green10'
    if (score >= 4) return '$yellow10'
    return '$red10'
  }

  const getDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(degrees / 45) % 8
    return directions[index]
  }

  const getWindQuality = (speed: number | undefined, direction: number | undefined) => {
    if (speed == null || direction == null) {
      return { label: 'Unknown', color: '$color10' }
    }
    const isOffshore = direction >= 180 && direction <= 270
    if (speed < 10) return { label: isOffshore ? 'Light Offshore' : 'Light Onshore', color: '$green10' }
    if (speed < 20) return { label: isOffshore ? 'Moderate Offshore' : 'Moderate Onshore', color: '$yellow10' }
    return { label: isOffshore ? 'Strong Offshore' : 'Strong Onshore', color: '$red10' }
  }

  const windSpeedForQuality = spot.windSpeed2m ?? spot.windSpeed
  const windQuality = getWindQuality(windSpeedForQuality, spot.windDirection)
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
      <YStack gap="$3">
        {/* Header with Score */}
        <XStack justifyContent="space-between" alignItems="center">
          <Paragraph size="$5" fontWeight="600" color="$color12">
            {spot.spotName}
          </Paragraph>
          <XStack gap="$1" alignItems="baseline">
            <Paragraph size="$7" fontWeight="bold" color={getScoreColor(spot.score ?? 0)}>
              {(spot.score ?? 0).toFixed(1)}
            </Paragraph>
            <Paragraph size="$3" color="$color10">
              /10
            </Paragraph>
          </XStack>
        </XStack>

        <Separator />

        {/* Swell Information */}
        <YStack gap="$2">
          <Paragraph size="$3" fontWeight="600" color="$color11">
            🌊 Swell
          </Paragraph>
          <XStack gap="$4" flexWrap="wrap">
            <YStack gap="$1">
              <Paragraph size="$2" color="$color10">Height</Paragraph>
              <Paragraph size="$5" fontWeight="700">
                {swellHeight != null ? `${swellHeight.toFixed(2)}m` : 'N/A'}
              </Paragraph>
            </YStack>
            <YStack gap="$1">
              <Paragraph size="$2" color="$color10">Period</Paragraph>
              <Paragraph size="$5" fontWeight="700">
                {swellPeriod != null ? `${swellPeriod.toFixed(1)}s` : 'N/A'}
              </Paragraph>
            </YStack>
            <YStack gap="$1">
              <Paragraph size="$2" color="$color10">Direction</Paragraph>
              <Paragraph size="$5" fontWeight="700">
                {spot.swellDirection ? `${getDirection(spot.swellDirection)} (${spot.swellDirection}°)` : 'N/A'}
              </Paragraph>
            </YStack>
          </XStack>
        </YStack>

        <Separator />

        {/* Wind Information */}
        <YStack gap="$2">
          <XStack justifyContent="space-between" alignItems="center">
            <Paragraph size="$3" fontWeight="600" color="$color11">
              💨 Wind
            </Paragraph>
            <Paragraph size="$1" color="$color10" fontStyle="italic">
              Adjusted to ~2m height
            </Paragraph>
          </XStack>
          <XStack gap="$4" flexWrap="wrap">
            <YStack gap="$1">
              <Paragraph size="$2" color="$color10">Speed</Paragraph>
              <Paragraph size="$5" fontWeight="700">
                {(() => {
                  const windSpeed = spot.windSpeed2m ?? spot.windSpeed
                  return windSpeed != null ? `${windSpeed.toFixed(1)} km/h` : 'N/A'
                })()}
              </Paragraph>
              {spot.windSpeed10m && (spot.windSpeed2m ?? spot.windSpeed) != null && spot.windSpeed10m !== (spot.windSpeed2m ?? spot.windSpeed) && (
                <Paragraph size="$1" color="$color10">
                  (10m: {spot.windSpeed10m.toFixed(1)} km/h)
                </Paragraph>
              )}
            </YStack>
            <YStack gap="$1">
              <Paragraph size="$2" color="$color10">Direction</Paragraph>
              <Paragraph size="$5" fontWeight="700">
                {spot.windDirection != null ? `${getDirection(spot.windDirection)} (${spot.windDirection}°)` : 'N/A'}
              </Paragraph>
            </YStack>
            <YStack gap="$1">
              <Paragraph size="$2" color="$color10">Quality</Paragraph>
              <Paragraph
                size="$4"
                fontWeight="600"
                color={windQuality.color as any}
              >
                {windQuality.label}
              </Paragraph>
            </YStack>
          </XStack>
          <Paragraph size="$1" color="$color10" mt="$1" fontStyle="italic">
            Wind adjusted from 10m meteorological height to ~2-3m near-surface for realistic surf conditions.
          </Paragraph>
        </YStack>

        {/* Score Reasons */}
        {spot.reasons && spot.reasons.length > 0 && (
          <>
            <Separator />
            <YStack gap="$2">
              <Paragraph size="$3" fontWeight="600" color="$color11">
                📋 Why this score?
              </Paragraph>
              {isSmallScreen ? (
                /* Mobile: Full list */
                <YStack gap="$2">
                  {spot.reasons.map((reason, idx) => (
                    <XStack key={idx} gap="$2" alignItems="flex-start">
                      <Paragraph size="$3" color="$green10">✓</Paragraph>
                      <Paragraph size="$3" color="$color11" flex={1}>
                        {reason}
                      </Paragraph>
                    </XStack>
                  ))}
                </YStack>
              ) : (
                /* Web: Compact cards in grid - 2 per row when main cards are 3, 1 per row when main cards are 2 */
                <XStack
                  gap="$2"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMediumScreen
                      ? '1fr'
                      : 'repeat(2, 1fr)',
                  }}
                >
                  {spot.reasons.map((reason, idx) => (
                    <Card
                      key={idx}
                      p="$2"
                      bg="$color3"
                      borderColor="$borderColor"
                      borderWidth={1}
                      borderRadius="$2"
                    >
                      <XStack gap="$1.5" alignItems="center">
                        <Paragraph size="$2" color="$green10">✓</Paragraph>
                        <Paragraph size="$2" color="$color11">
                          {reason}
                        </Paragraph>
                      </XStack>
                    </Card>
                  ))}
                </XStack>
              )}
            </YStack>
          </>
        )}

        {/* Disclaimer */}
        <Separator />
        <Paragraph size="$1" color="$color10" fontStyle="italic" textAlign="center">
          ⚠️ Conditions may not be 100% accurate to coast. Use as guidance only.
        </Paragraph>
      </YStack>
    </Card>
  )
}

