import { CanonicalActivity, DailyTrainingLoad, DailyWellnessLog, AthleteProfile, CourseRecord, WorkoutSession } from './types';
import { db } from '../firebase/client';
import { collection, query, where, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore';

export async function getCanonicalActivities(userId: string): Promise<CanonicalActivity[]> {
  if (!userId) return [];
  const q = query(
    collection(db, 'activities'),
    where('userId', '==', userId),
    orderBy('startDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CanonicalActivity));
}

export async function getCanonicalWellnessLogs(userId: string): Promise<DailyWellnessLog[]> {
  if (!userId) return [];
  const q = query(
    collection(db, 'wellnessLogs'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyWellnessLog));
}

export async function getCanonicalTrainingLoads(userId: string): Promise<DailyTrainingLoad[]> {
  if (!userId) return [];
  const q = query(
    collection(db, 'trainingLoads'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyTrainingLoad));
}

export async function getCanonicalAthleteProfile(userId: string): Promise<AthleteProfile | null> {
  if (!userId) return null;
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    if (data.profile) {
      return { uid: userId, ...data.profile } as AthleteProfile;
    }
    return { uid: userId, ...data } as AthleteProfile;
  }
  return null;
}
