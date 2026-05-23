import { collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { db } from './client';
import { AthleteProfile, CanonicalActivity, DailyWellnessLog, CanonicalGear } from '../../data/types';

// Helper to cast collection references
const createCollection = <T = DocumentData>(path: string) => {
  return collection(db, path) as CollectionReference<T>;
};

export const athletesCollection = createCollection<AthleteProfile>('athletes');
export const activitiesCollection = createCollection<CanonicalActivity>('activities');
export const wellnessCollection = createCollection<DailyWellnessLog>('wellness');
export const dailyLoadsCollection = createCollection('daily_loads');
export const gearCollection = createCollection<CanonicalGear>('gear');
export const activityStreamsCollection = createCollection('activity_streams');
