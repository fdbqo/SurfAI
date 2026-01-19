import mongoose, { Schema, Document } from 'mongoose'

export interface ISpotForecastRuns extends Document {
  spotId: string
  modelRunTime: Date // When this forecast was generated
  date: Date // Forecast target date (YYYY-MM-DD)
  dayIndex: number // Days from modelRunTime
  swellHeightMax: number
  swellPeriodMax: number
  waveHeightMax: number
  windSpeedAvg: number
  windDirectionDominant: number
  confidence: number
}

const SpotForecastRunsSchema = new Schema<ISpotForecastRuns>(
  {
    spotId: {
      type: String,
      required: true,
      index: true,
    },
    modelRunTime: {
      type: Date,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
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
    waveHeightMax: {
      type: Number,
      required: true,
    },
    windSpeedAvg: {
      type: Number,
      required: true,
    },
    windDirectionDominant: {
      type: Number,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: false,
  }
)

// Index for efficient queries
SpotForecastRunsSchema.index({ spotId: 1, date: 1, modelRunTime: 1 }, { unique: true })
SpotForecastRunsSchema.index({ spotId: 1, modelRunTime: -1 })
SpotForecastRunsSchema.index({ date: 1 })

export const SpotForecastRuns =
  mongoose.models.SpotForecastRuns ||
  mongoose.model<ISpotForecastRuns>('SpotForecastRuns', SpotForecastRunsSchema)






