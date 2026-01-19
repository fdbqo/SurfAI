import { NextRequest, NextResponse } from 'next/server'
import { allSpots, scoreSpot } from 'shared'
import type { SpotConditions } from 'shared/types'
import { SpotConditions as SpotConditionsModel, type ISpotConditions } from '../../../../lib/models/SpotConditions'
import { connectMongo } from '../../../../lib/mongodb'

// GET /api/surf/conditions
// query params: spot (optional spot ID), ability (beginner/intermediate/advanced)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const spotId = searchParams.get('spot')
  const abilityParam = searchParams.get('ability')

  const validAbilities = ['beginner', 'intermediate', 'advanced'] as const
  const ability = validAbilities.includes(abilityParam as any)
    ? (abilityParam as 'beginner' | 'intermediate' | 'advanced')
    : 'intermediate'

  try {
    await connectMongo()
    console.log('[MongoDB] Connected, fetching conditions from database')

    const spots = spotId
      ? allSpots.filter((s) => s.id === spotId)
      : allSpots

    if (spots.length === 0) {
      return NextResponse.json(
        { error: 'Spot not found' },
        { status: 404 }
      )
    }

    const spotIds = spots.map((s) => s.id)
    
    const latestConditionsList = await SpotConditionsModel.aggregate([
      { $match: { spotId: { $in: spotIds } } },
      { $sort: { spotId: 1, timestamp: -1 } },
      {
        $group: {
          _id: '$spotId',
          latest: { $first: '$$ROOT' },
        },
      },
    ]).exec()

    const conditionsMap = new Map(
      latestConditionsList.map((item) => [item.latest.spotId, item.latest as ISpotConditions])
    )

    const conditionsPromises = spots.map(async (spot) => {
      const latestConditions = conditionsMap.get(spot.id) || null

      if (!latestConditions) {
        console.log(`[MongoDB] No conditions found for spot: ${spot.name} (${spot.id})`)
        return {
          spotId: spot.id,
          spotName: spot.name,
          error: 'No conditions data available',
        }
      }

      // Calculate score
      const score = scoreSpot({
        swellHeight: latestConditions.swellHeight,
        swellPeriod: latestConditions.swellPeriod,
        swellDirection: latestConditions.swellDirection,
        waveHeight: latestConditions.waveHeight,
        wavePeriod: latestConditions.wavePeriod,
        windSpeed2m: latestConditions.windSpeed2m,
        windSpeed: latestConditions.windSpeed2m,
        windSpeed10m: latestConditions.windSpeed10m,
        windDirection: latestConditions.windDirection,
        spotOrientation: spot.orientation,
        ability,
      })

      return {
        spotId: spot.id,
        spotName: spot.name,
        swellHeight: latestConditions.swellHeight,
        swellPeriod: latestConditions.swellPeriod,
        swellDirection: latestConditions.swellDirection,
        waveHeight: latestConditions.waveHeight,
        wavePeriod: latestConditions.wavePeriod,
        windSpeed: latestConditions.windSpeed2m,
        windSpeed10m: latestConditions.windSpeed10m,
        windSpeed2m: latestConditions.windSpeed2m,
        windDirection: latestConditions.windDirection,
        score: score.score,
        reasons: score.reasons,
        timestamp: latestConditions.timestamp,
      } as SpotConditions & { spotName: string; reasons: string[]; timestamp: Date }
    })

    const conditions = await Promise.all(conditionsPromises)
    const successCount = conditions.filter((c) => !('error' in c)).length
    console.log(`[MongoDB] Returning ${successCount}/${conditions.length} spots with conditions`)
    
    return NextResponse.json(
      spotId && conditions.length === 1 ? conditions[0] : conditions
    )
  } catch (error) {
    console.error('Error fetching surf conditions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch surf conditions' },
      { status: 500 }
    )
  }
}

