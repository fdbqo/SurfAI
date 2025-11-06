import { NextResponse } from 'next/server';
import { getDb, getCollection, Collections } from 'db';

export async function GET() {
  try {
    const db = await getDb();
    
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'MongoDB connection failed' },
        { status: 503 }
      );
    }

    const usersCollection = await getCollection(Collections.USERS);
    
    if (!usersCollection) {
      return NextResponse.json(
        { success: false, message: 'Failed to get collection' },
        { status: 500 }
      );
    }

    const count = await usersCollection.countDocuments();

    return NextResponse.json({
      success: true,
      database: db.databaseName,
      collection: Collections.USERS,
      documentCount: count,
    });
  } catch (error: any) {
    console.error('MongoDB test error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'MongoDB test failed',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
