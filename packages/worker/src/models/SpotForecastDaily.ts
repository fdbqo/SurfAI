import mongoose, { Schema, Document } from 'mongoose'

export interface ISpotForecastDaily extends Document {
  spotId: string
  date: Date
  dayIndex: number
  swellHeightMax: number // Max swell height for the day
  swellPeriodMax: number // Max swell period for the day
  swellDirection: number // Dominant swell direction
  secondarySwellHeight?: number
  secondarySwellPeriod?: number
  secondarySwellDirection?: number
  waveHeightMax: number // Max wave height for the day
  wavePeriod?: number
  windSpeedAvg: number // Average wind speed (10m)
  windDirectionDominant: number // Dominant wind direction
  tideSummary?: {
    height?: number
    state?: "rising" | "falling" | "high" | "low"
  }
  dailyScore?: number // Score for the day
  confidence?: number // Decays with dayIndex
  bestWindowEstimate?: "morning" | "midday" | "afternoon" // Best time window
  bestHour?: number // Best hour (0-23) - kept for backward compatibility
  stability?: number
  source: "forecast" | "aggregate" // Where this data came from
}

const SpotForecastDailySchema = new Schema<ISpotForecastDaily>(
  {
    spotId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    dayIndex: {
      type: Number,
      required: true,
    },
    swellHeightMax: {
      type: Number,
      required: true,
    },
    swellPeriodMax: {
      type: Number,
      required: true,
    },
    swellDirection: {
      type: Number,
      required: true,
    },
    secondarySwellHeight: {
      type: Number,
      required: false,
    },
    secondarySwellPeriod: {
      type: Number,
      required: false,
    },
    secondarySwellDirection: {
      type: Number,
      required: false,
    },
    waveHeightMax: {
      type: Number,
      required: true,
    },
    wavePeriod: {
      type: Number,
      required: false,
    },
    windSpeedAvg: {
      type: Number,
      required: true,
    },
    windDirectionDominant: {
      type: Number,
      required: true,
    },
    tideSummary: {
      type: {
        height: Number,
        state: {
          type: String,
          enum: ["rising", "falling", "high", "low"],
        },
      },
      required: false,
    },
    dailyScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    bestWindowEstimate: {
      type: String,
      enum: ["morning", "midday", "afternoon"],
      required: false,
    },
    bestHour: {
      type: Number,
      required: false,
      min: 0,
      max: 23,
    },
    score: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    source: {
      type: String,
      enum: ["forecast", "aggregate"],
      required: true,
      default: "forecast",
    },
    confidence: {
      type: Number,
      required: false,
      min: 0,
      max: 1,
    },
    stability: {
      type: Number,
      required: false,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: false,
  }
)

SpotForecastDailySchema.index({ spotId: 1, date: 1 }, { unique: true })
SpotForecastDailySchema.index({ spotId: 1, dayIndex: 1 })
SpotForecastDailySchema.index({ date: 1 })

export const SpotForecastDaily =
  mongoose.models.SpotForecastDaily ||
  mongoose.model<ISpotForecastDaily>('SpotForecastDaily', SpotForecastDailySchema)

