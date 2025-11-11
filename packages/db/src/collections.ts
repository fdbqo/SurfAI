import { Collection } from 'mongodb';
import { getDb } from './client';

/**
 * Collection names for your surf AI app
 */
export const Collections = {
  USERS: 'users',
  SURF_SESSIONS: 'surf_sessions',
  SPOTS: 'spots',
  AI_MEMORY: 'ai_memory',
  COMMUNITY_INSIGHTS: 'community_insights',
} as const;

/**
 * Get a collection from the database
 */
export async function getCollection<T = any>(
  collectionName: string
): Promise<Collection<T> | null> {
  const db = await getDb();
  if (!db) {
    return null;
  }
  return db.collection<T>(collectionName);
}

