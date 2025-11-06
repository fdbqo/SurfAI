/**
 * Type definitions for MongoDB collections
 */

export interface User {
  _id?: string;
  email: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SurfSession {
  _id?: string;
  userId: string;
  spotId: string;
  date: Date;
  duration?: number;
  conditions?: {
    waveHeight?: number;
    windSpeed?: number;
    windDirection?: string;
    tide?: string;
  };
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Spot {
  _id?: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AIMemory {
  _id?: string;
  userId?: string;
  key: string;
  value: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CommunityInsight {
  _id?: string;
  spotId: string;
  userId: string;
  content: string;
  type: 'tip' | 'warning' | 'update';
  createdAt?: Date;
  updatedAt?: Date;
}

