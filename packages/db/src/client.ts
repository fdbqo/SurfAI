import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient | null> | null = null;
let db: Db | null = null;
let dbPromise: Promise<Db | null> | null = null;

/**
 * Get or create MongoDB client instance
 * Returns null if MongoDB is not configured (optional for development)
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (client) {
    return client;
  }

  if (clientPromise) {
    return clientPromise;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    throw new Error('MongoDB configuration required in production');
  }

  clientPromise = (async () => {
    const newClient = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    try {
      await newClient.connect();
      client = newClient;
      return newClient;
    } catch (error) {
      try {
        await newClient.close();
      } catch {
        // ignore close error
      }
      throw error;
    } finally {
      clientPromise = null;
    }
  })();

  try {
    return await clientPromise;
  } catch (error) {
    client = null;
    throw error;
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

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    const mongoClient = await getMongoClient();
    if (!mongoClient) {
      return null;
    }

    const databaseName = process.env.MONGODB_DATABASE || 'surf-ai';
    const database = mongoClient.db(databaseName);
    db = database;
    return database;
  })();

  try {
    return await dbPromise;
  } catch (error: any) {
    if (error?.codeName === 'AtlasError' || error?.code === 8000) {
      console.error('MongoDB authentication failed. Check your username and password in MONGODB_URI');
    } else {
      console.error('Failed to get database:', error?.message || error);
    }

    await closeConnection();
    return null;
  } finally {
    dbPromise = null;
  }
}

/**
 * Close MongoDB connection
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
  }
  client = null;
  db = null;
  clientPromise = null;
  dbPromise = null;
}
