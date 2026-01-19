import { NextRequest, NextResponse } from 'next/server'
import { allSpots, getSpotById } from 'shared'
import { SpotForecastDaily } from '../../../../lib/models/SpotForecastDaily'
import { connectMongo } from '../../../../lib/mongodb'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const spotId = searchParams.get('spot')
  const daysParam = searchParams.get('days')
  const userIsPremium = searchParams.get('premium') === 'true'

  const days = Math.max(1, Math.min(
    parseInt(daysParam || '7', 10) || 7,
    userIsPremium ? 15 : 7
  ))

  if (!spotId) {
    return NextResponse.json(
      { error: 'spot parameter is required' },
      { status: 400 }
    )
  }

  const spot = getSpotById(spotId)
  if (!spot) {
    return NextResponse.json(
      { error: 'Spot not found' },
      { status: 404 }
    )
  }

  try {
    await connectMongo()
    console.log(`[MongoDB] Fetching forecast for ${spot.name} (${days} days)...`)

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const forecast = await SpotForecastDaily.find({
      spotId: spot.id,
      dayIndex: { $gte: 0, $lte: days },
    })
      .sort({ dayIndex: 1 })
      .lean()
      .exec()

    if (forecast.length === 0) {
      return NextResponse.json(
        {
          spotId: spot.id,
          spotName: spot.name,
          error: 'No forecast data available',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      spotId: spot.id,
      spotName: spot.name,
      forecast: forecast.map((day) => ({
        date: day.date,
        dayIndex: day.dayIndex,
        swellHeight: day.swellHeight,
        swellPeriod: day.swellPeriod,
        swellDirection: day.swellDirection,
        secondarySwellHeight: day.secondarySwellHeight,
        secondarySwellPeriod: day.secondarySwellPeriod,
        secondarySwellDirection: day.secondarySwellDirection,
        waveHeight: day.waveHeight,
        wavePeriod: day.wavePeriod,
        windSpeed10m: day.windSpeed10m,
        windDirection: day.windDirection,
        bestHour: day.bestHour,
        score: day.score,
        confidence: day.confidence,
        stability: day.stability,
      })),
    })
  } catch (error) {
    console.error('Error fetching forecast:', error)
    return NextResponse.json(
      { error: 'Failed to fetch forecast' },
      { status: 500 }
    )
  }
}

