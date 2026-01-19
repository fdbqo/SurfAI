import mongoose from 'mongoose'

let isConnected = false

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    return
  }

  if (isConnected) {
    return
  }

  const mongoUri = process.env.MONGODB_URI
  const mongoDb = process.env.MONGODB_DATABASE || 'surf-ai'

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: mongoDb,
    })
    isConnected = true
  } catch (error) {
    isConnected = false
    throw error
  }
}









