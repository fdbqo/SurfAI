import mongoose, { Schema, Document } from 'mongoose'

export interface ISpotConditionsHourly extends Document {
  spotId: string
  timestamp: Date // UTC
  modelRun: string
  localTime: string // ISO string in spot's timezone
  localHour: number // 0-23 in spot's timezone
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  swellPeakPeriod?: number
  secondarySwellHeight?: number
  secondarySwellPeriod?: number
  secondarySwellDirection?: number
  secondarySwellPeakPeriod?: number
  waveHeight: number
  wavePeriod: number
  waveDirection?: number
  windSpeed10m: number
  windSpeed2m: number
  windDirection: number
  seaTemperature?: number
  pressure?: number
  visibility?: number
  tideHeight?: number
  tideState?: "rising" | "falling" | "high" | "low"
  nextHigh?: Date
  nextLow?: Date
  dataQuality?: number
  sourceModel?: "open-meteo" | "stormglass" | "combined"
}

const SpotConditionsHourlySchema = new Schema<ISpotConditionsHourly>(
  {
    spotId: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    modelRun: {
      type: String,
      required: true,
    },
    localTime: {
      type: String,
      required: true,
    },
    localHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
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
    swellPeakPeriod: {
      type: Number,
      required: false,
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
    secondarySwellPeakPeriod: {
      type: Number,
      required: false,
    },
    waveHeight: {
      type: Number,
      required: true,
    },
    wavePeriod: {
      type: Number,
      required: true,
    },
    waveDirection: {
      type: Number,
      required: false,
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
    pressure: {
      type: Number,
      required: false,
    },
    visibility: {
      type: Number,
      required: false,
    },
    tideHeight: {
      type: Number,
      required: false,
    },
    tideState: {
      type: String,
      enum: ["rising", "falling", "high", "low"],
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
    dataQuality: {
      type: Number,
      required: false,
      min: 0,
      max: 1,
    },
    sourceModel: {
      type: String,
      enum: ["open-meteo", "stormglass", "combined"],
      required: false,
    },
  },
  {
    timestamps: false,
  }
)

// Indexes for efficient queries and TTL
SpotConditionsHourlySchema.index({ spotId: 1, timestamp: -1 })
SpotConditionsHourlySchema.index({ timestamp: 1 }) // For TTL cleanup

export const SpotConditionsHourly =
  mongoose.models.SpotConditionsHourly ||
  mongoose.model<ISpotConditionsHourly>('SpotConditionsHourly', SpotConditionsHourlySchema)






