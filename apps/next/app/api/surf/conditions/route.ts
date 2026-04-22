import { NextRequest, NextResponse } from 'next/server'
import { allSpots, type Spot } from 'shared'
import { SpotConditionsHourly } from '../../../../lib/models/SpotConditionsHourly'
import { connectMongo } from '../../../../lib/mongodb'

/**
 * GET /api/surf/conditions
 * Query: spot (optional) — if set, only that spot; otherwise all known spots.
 * Returns the latest hourly row per spot (raw fields from Mongo, no server-side score).
 * Missing data for a spot: { spotId, spotName, error, code }.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const spotId = searchParams.get('spot')

  try {
    await connectMongo()

    const spots = spotId ? allSpots.filter((s) => s.id === spotId) : allSpots

    if (spots.length === 0) {
      return NextResponse.json(
        { error: 'Spot not found in catalog', code: 'SPOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const spotIds = spots.map((s) => s.id)

    const latestConditionsList = await SpotConditionsHourly.aggregate([
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
      latestConditionsList.map((item) => [item.latest.spotId as string, item.latest])
    )

    const rows = spots.map((spot) => {
      const doc = conditionsMap.get(spot.id) as Record<string, unknown> | undefined

      if (!doc) {
        return {
          spotId: spot.id,
          spotName: spot.name,
          error: 'No conditions data in database for this spot yet.',
          code: 'NO_HOURLY_DATA' as const,
        }
      }

      return toLiveResponse(spot, doc)
    })

    if (process.env.NODE_ENV === 'development') {
      const ok = rows.filter((r) => !('error' in r)).length
      console.log(`[api/surf/conditions] ${ok}/${rows.length} spots with data`)
    }

    if (spotId && rows.length === 1) {
      return NextResponse.json(rows[0], { status: 200 })
    }
    return NextResponse.json(rows, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
    console.error('[api/surf/conditions]', error)
    const body: { error: string; code: string; detail?: string } = {
      error: 'Failed to load surf conditions',
      code: 'INTERNAL',
    }
    if (process.env.NODE_ENV === 'development') {
      body.detail = message
    }
    return NextResponse.json(body, { status: 500 })
  }
}

function toLiveResponse(spot: Spot, doc: Record<string, unknown>) {
  // Strip Mongo / Mongoose metadata; keep one spotId (catalog id).
  const { _id, __v, spotId: _sid, ...rest } = doc
  return {
    spotId: spot.id,
    spotName: spot.name,
    ...rest,
  }
}
