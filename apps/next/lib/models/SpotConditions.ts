import mongoose, { Schema, Document } from 'mongoose'

export interface ISpotConditions extends Document {
  spotId: string
  timestamp: Date
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  waveHeight: number
  wavePeriod: number
  windSpeed10m: number
  windSpeed2m: number
  windDirection: number
  seaTemperature?: number
  tideHeight?: number
  tideState?: string
  nextHigh?: Date
  nextLow?: Date
  modelRun: string
}

const SpotConditionsSchema = new Schema<ISpotConditions>(
  {
    spotId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    swellHeight: {
      type: Number,
      required: true,
    },
    swellPeriod: {
      type: Number,
      required: true,
    },
    swellDirection: {
      type: Number,
      required: true,
    },
    waveHeight: {
      type: Number,
      required: true,
    },
    wavePeriod: {
      type: Number,
      required: true,
    },
    windSpeed10m: {
      type: Number,
      required: true,
    },
    windSpeed2m: {
      type: Number,
      required: true,
    },
    windDirection: {
      type: Number,
      required: true,
    },
    seaTemperature: {
      type: Number,
      required: false,
    },
    tideHeight: {
      type: Number,
      required: false,
    },
    tideState: {
      type: String,
      required: false,
    },
    nextHigh: {
      type: Date,
      required: false,
    },
    nextLow: {
      type: Date,
      required: false,
    },
    modelRun: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
  }
)

// Compound index for fast queries: get latest conditions by spotId
SpotConditionsSchema.index({ spotId: 1, timestamp: -1 })

export const SpotConditions =
  mongoose.models.SpotConditions ||
  mongoose.model<ISpotConditions>('SpotConditions', SpotConditionsSchema)

