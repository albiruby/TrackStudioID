/**
 * ============================================================================
 * TRACK.STUDIO FIRESTORE CONVERTERS
 * ============================================================================
 * Safe serialization and deserialization of canonical models to/from Firestore.
 */

import { FirestoreDataConverter, QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { 
  CanonicalActivity, 
  DailyWellnessLog, 
  AthleteProfile, 
  DailyTrainingLoad, 
  CanonicalGear, 
  ReportSummary,
  CanonicalActivityStream
} from '../data/types';
import { validateCanonicalActivity, validateDailyWellnessLog, validateAthleteProfile } from '../data/validators';

// Helper to convert Firestore Timestamps to ISO Strings on reads
function convertTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const copy = { ...obj };
  for (const key of Object.keys(copy)) {
    const val = copy[key];
    if (val instanceof Timestamp) {
      copy[key] = val.toDate().toISOString();
    } else if (val && typeof val === 'object' && val.seconds !== undefined && val.nanoseconds !== undefined) {
      // standard serialized fallback
      copy[key] = new Date(val.seconds * 1000).toISOString();
    } else if (val && typeof val === 'object') {
      copy[key] = convertTimestamps(val);
    }
  }
  return copy;
}

export const activityConverter: FirestoreDataConverter<CanonicalActivity> = {
  toFirestore(activity: CanonicalActivity): DocumentData {
    // Avoid writing undefined and ensure timestamp variables are handled
    const data: any = { ...activity };
    delete data.id; // Usually is part of doc ID
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): CanonicalActivity {
    const rawData = snapshot.data();
    const dataWithTimestamps = convertTimestamps(rawData);
    
    return validateCanonicalActivity({
      id: snapshot.id,
      ...dataWithTimestamps
    });
  }
};

export const wellnessConverter: FirestoreDataConverter<DailyWellnessLog> = {
  toFirestore(log: DailyWellnessLog): DocumentData {
    const data: any = { ...log };
    delete data.id;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): DailyWellnessLog {
    const rawData = snapshot.data();
    const dataWithTimestamps = convertTimestamps(rawData);
    
    return validateDailyWellnessLog({
      id: snapshot.id,
      ...dataWithTimestamps
    });
  }
};

export const athleteProfileConverter: FirestoreDataConverter<AthleteProfile> = {
  toFirestore(profile: AthleteProfile): DocumentData {
    const data: any = { ...profile };
    delete data.uid;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): AthleteProfile {
    const rawData = snapshot.data();
    const dataWithTimestamps = convertTimestamps(rawData);
    
    return validateAthleteProfile({
      uid: snapshot.id,
      ...dataWithTimestamps
    });
  }
};

export const dailyLoadConverter: FirestoreDataConverter<DailyTrainingLoad> = {
  toFirestore(load: DailyTrainingLoad): DocumentData {
    return { ...load };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): DailyTrainingLoad {
    const data = convertTimestamps(snapshot.data());
    return {
      date: snapshot.id,
      ctl: typeof data.ctl === 'number' ? data.ctl : 0,
      atl: typeof data.atl === 'number' ? data.atl : 0,
      tsb: typeof data.tsb === 'number' ? data.tsb : 0,
      trainingVolume: typeof data.trainingVolume === 'number' ? data.trainingVolume : 0,
    };
  }
};

export const gearConverter: FirestoreDataConverter<CanonicalGear> = {
  toFirestore(gear: CanonicalGear): DocumentData {
    const data: any = { ...gear };
    delete data.id;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): CanonicalGear {
    const data = convertTimestamps(snapshot.data());
    return {
      id: snapshot.id,
      name: data.name || 'Equipment',
      brand: data.brand,
      model: data.model,
      distanceMeters: typeof data.distanceMeters === 'number' ? data.distanceMeters : 0,
      primary: !!data.primary,
      notes: data.notes
    };
  }
};

export const reportConverter: FirestoreDataConverter<ReportSummary> = {
  toFirestore(report: ReportSummary): DocumentData {
    const data: any = { ...report };
    delete data.id;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): ReportSummary {
    const data = convertTimestamps(snapshot.data());
    return {
      id: snapshot.id,
      userId: data.userId || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      totalDistanceMeters: typeof data.totalDistanceMeters === 'number' ? data.totalDistanceMeters : 0,
      totalDurationSeconds: typeof data.totalDurationSeconds === 'number' ? data.totalDurationSeconds : 0,
      totalElevationGain: typeof data.totalElevationGain === 'number' ? data.totalElevationGain : 0,
      averageHeartRate: data.averageHeartRate
    };
  }
};

export const streamConverter: FirestoreDataConverter<CanonicalActivityStream> = {
  toFirestore(stream: CanonicalActivityStream): DocumentData {
    const data: any = { ...stream };
    delete data.activityId;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): CanonicalActivityStream {
    const data = convertTimestamps(snapshot.data());
    return {
      activityId: snapshot.id,
      time: data.time,
      distance: data.distance,
      velocitySmooth: data.velocitySmooth,
      heartrate: data.heartrate,
      cadence: data.cadence,
      watts: data.watts,
      altitude: data.altitude,
      gradeSmooth: data.gradeSmooth,
      temp: data.temp,
      latlng: data.latlng
    };
  }
};
