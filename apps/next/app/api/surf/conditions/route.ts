import { NextRequest, NextResponse } from 'next/server'
import { irelandSpots, scoreSpot, windAt2m } from 'shared'
import type { SpotConditions } from 'shared/types'

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
    const spots = spotId
      ? irelandSpots.filter((s) => s.id === spotId)
      : irelandSpots

    if (spots.length === 0) {
      return NextResponse.json(
        { error: 'Spot not found' },
        { status: 404 }
      )
    }

    const conditionsPromises = spots.map(async (spot) => {
      const conditions = await fetchSpotConditions(spot.lat, spot.lon)
      const score = scoreSpot({
        swellHeight: conditions.swellHeight,
        swellPeriod: conditions.swellPeriod,
        swellDirection: conditions.swellDirection,
        waveHeight: conditions.waveHeight,
        wavePeriod: conditions.wavePeriod,
        windSpeed2m: conditions.windSpeed2m,
        windSpeed: conditions.windSpeed2m,
        windSpeed10m: conditions.windSpeed10m,
        windDirection: conditions.windDirection,
        spotOrientation: spot.orientation,
        ability,
      })
      
      return {
        spotId: spot.id,
        spotName: spot.name,
        swellHeight: conditions.swellHeight,
        swellPeriod: conditions.swellPeriod,
        swellDirection: conditions.swellDirection,
        waveHeight: conditions.waveHeight,
        wavePeriod: conditions.wavePeriod,
        windSpeed: conditions.windSpeed2m,
        windSpeed10m: conditions.windSpeed10m,
        windSpeed2m: conditions.windSpeed2m,
        windDirection: conditions.windDirection,
        score: score.score,
        reasons: score.reasons,
      } as SpotConditions & { spotName: string; reasons: string[] }
    })

    const conditions = await Promise.all(conditionsPromises)
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

// fetch marine conditions from Open-Meteo
async function fetchSpotConditions(
  lat: number,
  lon: number
): Promise<{
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  waveHeight: number
  wavePeriod: number
  windSpeed10m: number
  windSpeed2m: number
  windSpeed: number
  windDirection: number
}> {
  try {
    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?` +
      `latitude=${lat}&longitude=${lon}` +
      `&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,` +
      `wave_height,wave_period,wave_direction` +
      `&forecast_days=1&timezone=GMT`

    const marineRes = await fetch(marineUrl, { next: { revalidate: 300 } })

    if (!marineRes.ok) {
      const errorText = await marineRes.text()
      console.error('[Open-Meteo] Marine API error:', marineRes.status, errorText)
      throw new Error(`Marine API request failed: ${marineRes.status}`)
    }

    const marine = await marineRes.json()

    const windUrl =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&hourly=wind_speed_10m,wind_direction_10m` +
      `&forecast_days=1&timezone=GMT`

    const windRes = await fetch(windUrl, { next: { revalidate: 300 } })

    if (!windRes.ok) {
      const errorText = await windRes.text()
      console.error('[Open-Meteo] Weather API error:', windRes.status, errorText)
      throw new Error(`Weather API request failed: ${windRes.status}`)
    }

    const wind = await windRes.json()

    if (!marine.hourly || !wind.hourly) {
      throw new Error('Missing hourly data in API response')
    }

    const idx = 0
    const windSpeed10m = Math.round((wind.hourly.wind_speed_10m?.[idx] ?? 0) * 10) / 10
    const windSpeed2m = Math.round(windAt2m(windSpeed10m) * 10) / 10

    return {
      swellHeight: Math.round((marine.hourly.swell_wave_height?.[idx] ?? 0) * 10) / 10,
      swellPeriod: Math.round((marine.hourly.swell_wave_period?.[idx] ?? 0) * 10) / 10,
      swellDirection: Math.round(marine.hourly.swell_wave_direction?.[idx] ?? 0),
      waveHeight: Math.round((marine.hourly.wave_height?.[idx] ?? 0) * 10) / 10,
      wavePeriod: Math.round((marine.hourly.wave_period?.[idx] ?? 0) * 10) / 10,
      windSpeed10m,
      windSpeed2m,
      windSpeed: windSpeed2m,
      windDirection: Math.round(wind.hourly.wind_direction_10m?.[idx] ?? 0),
    }
  } catch (error) {
    console.error('[Open-Meteo] Error:', error instanceof Error ? error.message : String(error))
    const mockWind10m = 7
    const mockWind2m = windAt2m(mockWind10m)
    return {
      swellHeight: 1.2,
      swellPeriod: 11,
      swellDirection: 290,
      waveHeight: 1.3,
      wavePeriod: 10,
      windSpeed10m: mockWind10m,
      windSpeed2m: mockWind2m,
      windSpeed: mockWind2m,
      windDirection: 90,
    }
  }
}

