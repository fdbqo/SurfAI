import mongoose, { Schema, Document } from 'mongoose'

export interface ISpotConditionsDaily extends Document {
  spotId: string
  date: Date
  hour: number
  avgSwellHeight: number
  maxSwellHeight: number
  minSwellHeight: number
  avgSwellPeriod: number
  avgSwellDirection: number
  avgWaveHeight: number
  maxWaveHeight: number
  minWaveHeight: number
  avgWindSpeed2m: number
  maxWindSpeed2m: number
  dominantWindDirection: number
  avgSeaTemperature?: number
  sampleCount: number
  sourceModels: string[]
}

const SpotConditionsDailySchema = new Schema<ISpotConditionsDaily>(
  {
    spotId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
    avgSwellHeight: {
      type: Number,
      required: true,
    },
    maxSwellHeight: {
      type: Number,
      required: true,
    },
    minSwellHeight: {
      type: Number,
      required: true,
    },
    avgSwellPeriod: {
      type: Number,
      required: true,
    },
    avgSwellDirection: {
      type: Number,
      required: true,
    },
    avgWaveHeight: {
      type: Number,
      required: true,
    },
    maxWaveHeight: {
      type: Number,
      required: true,
    },
    minWaveHeight: {
      type: Number,
      required: true,
    },
    avgWindSpeed2m: {
      type: Number,
      required: true,
    },
    maxWindSpeed2m: {
      type: Number,
      required: true,
    },
    dominantWindDirection: {
      type: Number,
      required: true,
    },
    avgSeaTemperature: {
      type: Number,
      required: false,
    },
    sampleCount: {
      type: Number,
      required: true,
      min: 1,
    },
    sourceModels: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: false,
  }
)

SpotConditionsDailySchema.index({ spotId: 1, date: -1, hour: 1 }, { unique: true })
SpotConditionsDailySchema.index({ date: 1 })

export const SpotConditionsDaily =
  mongoose.models.SpotConditionsDaily ||
  mongoose.model<ISpotConditionsDaily>('SpotConditionsDaily', SpotConditionsDailySchema)








