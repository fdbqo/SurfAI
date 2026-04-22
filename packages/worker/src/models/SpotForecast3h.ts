import mongoose, { Schema, Document } from 'mongoose'

export interface ISpotForecast3h extends Document {
  spotId: string
  blockStart: Date // UTC datetime rounded to nearest 3h (00:00, 03:00, 06:00, etc.)
  modelRunTime: Date // When this forecast was generated
  swellHeight: number
  swellPeriod: number
  swellDirection: number
  secondarySwellHeight?: number
  secondarySwellPeriod?: number
  secondarySwellDirection?: number
  waveHeight: number
  wavePeriod: number
  windSpeed10m: number
  windSpeed2m: number
  windDirection: number
  blockScore?: number // Score for this 3-hour block
  localHour: number // 0-23 in spot's timezone
}

const SpotForecast3hSchema = new Schema<ISpotForecast3h>(
  {
    spotId: {
      type: String,
      required: true,
      index: true,
    },
    blockStart: {
      type: Date,
      required: true,
    },
    modelRunTime: {
      type: Date,
      required: true,
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
    blockScore: {
      type: Number,
      required: false,
      min: 0,
      max: 10,
    },
    localHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
  },
  {
    timestamps: false,
  }
)

// Unique index: one forecast per spot per 3-hour block
SpotForecast3hSchema.index({ spotId: 1, blockStart: 1 }, { unique: true })
SpotForecast3hSchema.index({ blockStart: 1 }) // For cleanup queries

export const SpotForecast3h =
  mongoose.models.SpotForecast3h ||
  mongoose.model<ISpotForecast3h>('SpotForecast3h', SpotForecast3hSchema)






