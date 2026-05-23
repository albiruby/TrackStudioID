import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './client';
import { AthleteProfile, CanonicalActivity, DailyWellnessLog, DailyTrainingLoad, CanonicalActivityStream } from '../../data/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function checkDatabaseState(op: OperationType, path: string | null) {
  if (!db || !auth) {
    handleFirestoreError(new Error('Firebase DB / Auth uninitialized due to missing environment key credentials.'), op, path);
  }
}

export async function getAthleteProfile(uid: string): Promise<AthleteProfile | null> {
  const path = `users/${uid}`;
  checkDatabaseState(OperationType.GET, path);
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as AthleteProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveAthleteProfile(uid: string, profile: Partial<AthleteProfile>): Promise<void> {
  const path = `users/${uid}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, { ...profile, uid }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getActivities(uid: string): Promise<CanonicalActivity[]> {
  const path = `users/${uid}/activities`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'activities'));
    const snap = await getDocs(q);
    const list: CanonicalActivity[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id } as CanonicalActivity);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveActivity(uid: string, act: Partial<CanonicalActivity>): Promise<void> {
  const pathPrefix = `users/${uid}/activities`;
  checkDatabaseState(OperationType.WRITE, pathPrefix);
  const id = act.id || doc(collection(db, 'users', uid, 'activities')).id;
  const path = `users/${uid}/activities/${id}`;
  try {
    const docRef = doc(db, 'users', uid, 'activities', id);
    await setDoc(docRef, { ...act, id, userId: uid }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getWellnessLogs(uid: string): Promise<DailyWellnessLog[]> {
  const path = `wellness`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'wellness'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const list: DailyWellnessLog[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id } as DailyWellnessLog);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveWellnessLog(uid: string, date: string, log: Partial<DailyWellnessLog>): Promise<void> {
  const path = `wellness/${date}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'wellness', date);
    await setDoc(docRef, { ...log, id: date, date, userId: uid }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertWellnessLog(log: Partial<DailyWellnessLog>): Promise<void> {
  if (!log.userId || !log.date) {
    throw new Error('upsertWellnessLog missing userId or date');
  }
  await saveWellnessLog(log.userId, log.date, log);
}

export async function getTrainingLoads(uid: string): Promise<DailyTrainingLoad[]> {
  const path = `trainingLoads`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'trainingLoads'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const list: DailyTrainingLoad[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id } as DailyTrainingLoad);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getActivity(id: string): Promise<CanonicalActivity | null> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return null;
  const path = `users/${uid}/activities/${id}`;
  checkDatabaseState(OperationType.GET, path);
  try {
    const docRef = doc(db, 'users', uid, 'activities', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as CanonicalActivity;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getActivityStream(activityId: string): Promise<CanonicalActivityStream | null> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return null;
  const path = `users/${uid}/activityStreams/${activityId}`;
  checkDatabaseState(OperationType.GET, path);
  try {
    const docRef = doc(db, 'users', uid, 'activityStreams', activityId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as CanonicalActivityStream;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteActivity(activityId: string): Promise<void> {
  const uid = auth?.currentUser?.uid;
  if (!uid) return;
  const path = `users/${uid}/activities/${activityId}`;
  checkDatabaseState(OperationType.DELETE, path);
  try {
    const docRef = doc(db, 'users', uid, 'activities', activityId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertActivity(act: CanonicalActivity): Promise<CanonicalActivity> {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Unauthenticated");
  const path = `users/${uid}/activities/${act.id}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'users', uid, 'activities', act.id!);
    await setDoc(docRef, act, { merge: true });
    return act;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getLaps(activityId: string): Promise<any> {
    const uid = auth?.currentUser?.uid;
    if (!uid) return null;
    try {
        const snap = await getDoc(doc(db, 'users', uid, 'laps', activityId));
        return snap.exists() ? snap.data().laps : null;
    } catch (e) {
        return null;
    }
}

export async function getSplits(activityId: string): Promise<any> {
    const uid = auth?.currentUser?.uid;
    if (!uid) return null;
    try {
        const snap = await getDoc(doc(db, 'users', uid, 'splits', activityId));
        return snap.exists() ? snap.data().splits : null;
    } catch (e) {
        return null;
    }
}

export async function getBestEfforts(activityId: string): Promise<any> {
    const uid = auth?.currentUser?.uid;
    if (!uid) return null;
    try {
        const snap = await getDoc(doc(db, 'users', uid, 'bestEfforts', activityId));
        return snap.exists() ? snap.data().bestEfforts : null;
    } catch (e) {
        return null;
    }
}
