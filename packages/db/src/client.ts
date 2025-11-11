import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Get or create MongoDB client instance
 * Returns null if MongoDB is not configured (optional for development)
 */
export function getMongoClient(): MongoClient | null {
  if (client) {
    return client;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    throw new Error('MongoDB configuration required in production');
  }

  try {
    client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    return client;
  } catch (error) {
    console.error('Failed to create MongoDB client:', error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    return null;
  }
}

/**
 * Get or create database instance
 * Returns null if MongoDB is not configured
 */
export async function getDb(): Promise<Db | null> {
  if (db) {
    return db;
  }

  const mongoClient = getMongoClient();
  if (!mongoClient) {
    return null;
  }

  try {
    await mongoClient.connect();
    const databaseName = process.env.MONGODB_DATABASE || 'surf-ai';
    db = mongoClient.db(databaseName);
    return db;
  } catch (error: any) {
    if (error?.codeName === 'AtlasError' || error?.code === 8000) {
      console.error('MongoDB authentication failed. Check your username and password in MONGODB_URI');
    } else {
      console.error('Failed to get database:', error?.message || error);
    }
    try {
      await mongoClient.close();
    } catch (closeError) {
      console.error('Failed to close MongoDB client after error:', closeError);
    }
    client = null;
    db = null;
    return null;
  }
}

/**
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
