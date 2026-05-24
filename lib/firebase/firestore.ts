import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';

// ... (skipping unchanged code for brevity, will provide in context)

export async function getActivities(uid: string, limitCount?: number): Promise<CanonicalActivity[]> {
  const path = `users/${uid}/activities`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    let q = query(
        collection(db, 'users', uid, 'activities'), 
        orderBy('startDateLocal', 'desc')
    );
    
    if (limitCount && limitCount > 0) {
        q = query(q, limit(limitCount));
    }
    
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


import { db, auth } from './client';
import { AthleteProfile, CanonicalActivity, DailyWellnessLog, DailyTrainingLoad, CanonicalActivityStream, CanonicalGear, CourseRecord, CourseAttempt } from '../../data/types';

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

export async function getDailyLoads(uid: string): Promise<DailyTrainingLoad[]> {
  const path = `users/${uid}/dailyLoad`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'dailyLoad'));
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
  const path = `users/${uid}/wellnessLogs`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'wellnessLogs'));
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
  const path = `users/${uid}/wellnessLogs/${date}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'users', uid, 'wellnessLogs', date);
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

export async function getSyncedZones(uid: string): Promise<any | null> {
  const path = `users/${uid}/zones/current`;
  checkDatabaseState(OperationType.GET, path);
  try {
    const docRef = doc(db, 'users', uid, 'zones', 'current');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      // Check fallback path settings/trainingZones
      const fallbackRef = doc(db, 'users', uid, 'settings', 'trainingZones');
      const fallbackSnap = await getDoc(fallbackRef);
      if (!fallbackSnap.exists()) return null;
      return fallbackSnap.data();
    }
    return snap.data();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getImportedWorkouts(uid: string): Promise<any[]> {
  const path = `users/${uid}/workouts`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'workouts'));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCustomWorkout(uid: string, id: string, w: any): Promise<void> {
  const path = `users/${uid}/workouts/${id}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'users', uid, 'workouts', id);
    await setDoc(docRef, { ...w, id, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCustomWorkout(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/workouts/${id}`;
  checkDatabaseState(OperationType.DELETE, path);
  try {
    const docRef = doc(db, 'users', uid, 'workouts', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getWorkoutComparisons(uid: string): Promise<any[]> {
  const path = `users/${uid}/workoutComparisons`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'workoutComparisons'));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveWorkoutComparison(uid: string, id: string, payload: any): Promise<void> {
  const path = `users/${uid}/workoutComparisons/${id}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'users', uid, 'workoutComparisons', id);
    await setDoc(docRef, { ...payload, id, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWorkoutComparison(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/workoutComparisons/${id}`;
  checkDatabaseState(OperationType.DELETE, path);
  try {
    const docRef = doc(db, 'users', uid, 'workoutComparisons', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getGearList(uid: string): Promise<CanonicalGear[]> {
  const path = `users/${uid}/gear`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'gear'));
    const snap = await getDocs(q);
    const list: CanonicalGear[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id } as CanonicalGear);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveGear(uid: string, gear: Partial<CanonicalGear>): Promise<void> {
  const pathPrefix = `users/${uid}/gear`;
  checkDatabaseState(OperationType.WRITE, pathPrefix);
  const id = gear.id || doc(collection(db, 'users', uid, 'gear')).id;
  const path = `users/${uid}/gear/${id}`;
  try {
    const docRef = doc(db, 'users', uid, 'gear', id);
    const timeStr = new Date().toISOString();
    const payload = {
      ...gear,
      id,
      userId: uid,
      updatedAt: timeStr,
      createdAt: gear.createdAt || timeStr
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGear(uid: string, id: string): Promise<void> {
  const path = `users/${uid}/gear/${id}`;
  checkDatabaseState(OperationType.DELETE, path);
  try {
    const docRef = doc(db, 'users', uid, 'gear', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getAllBestEfforts(uid: string): Promise<any[]> {
  const path = `users/${uid}/bestEfforts`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'bestEfforts'));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getCourseRecords(uid: string): Promise<CourseRecord[]> {
  const path = `users/${uid}/courseRecords`;
  checkDatabaseState(OperationType.LIST, path);
  try {
    const q = query(collection(db, 'users', uid, 'courseRecords'));
    const snap = await getDocs(q);
    const list: CourseRecord[] = [];
    snap.forEach(d => {
      list.push({ ...d.data(), id: d.id } as CourseRecord);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCourseRecord(uid: string, courseId: string, record: Partial<CourseRecord>): Promise<void> {
  const path = `users/${uid}/courseRecords/${courseId}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'users', uid, 'courseRecords', courseId);
    await setDoc(docRef, { ...record, id: courseId, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCourseRecord(uid: string, courseId: string): Promise<void> {
  const path = `users/${uid}/courseRecords/${courseId}`;
  checkDatabaseState(OperationType.DELETE, path);
  try {
    const docRef = doc(db, 'users', uid, 'courseRecords', courseId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveReportSummary(uid: string, reportId: string, payload: any): Promise<void> {
  const path = `users/${uid}/reports/${reportId}`;
  checkDatabaseState(OperationType.WRITE, path);
  try {
    const docRef = doc(db, 'users', uid, 'reports', reportId);
    await setDoc(docRef, { ...payload, id: reportId, userId: uid, syncedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}



