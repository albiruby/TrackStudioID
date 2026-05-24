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
      id: snapshot.id,
      userId: data.userId || '',
      source: data.source || 'intervals',
      fitnessCtl: typeof data.fitnessCtl === 'number' ? data.fitnessCtl : (typeof data.ctl === 'number' ? data.ctl : null),
      fatigueAtl: typeof data.fatigueAtl === 'number' ? data.fatigueAtl : (typeof data.atl === 'number' ? data.atl : null),
      formTsb: typeof data.formTsb === 'number' ? data.formTsb : (typeof data.tsb === 'number' ? data.tsb : null),
      trainingLoad: typeof data.trainingLoad === 'number' ? data.trainingLoad : (typeof data.trainingVolume === 'number' ? data.trainingVolume : null),
      acuteLoad: typeof data.acuteLoad === 'number' ? data.acuteLoad : null,
      chronicLoad: typeof data.chronicLoad === 'number' ? data.chronicLoad : null,
      rampRate: typeof data.rampRate === 'number' ? data.rampRate : null,
      intensity: typeof data.intensity === 'number' ? data.intensity : null,
      loadScore: typeof data.loadScore === 'number' ? data.loadScore : null,
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
      userId: data.userId || '',
      source: data.source || 'manual',
      externalId: data.externalId,
      name: data.name || 'Equipment',
      brand: data.brand,
      model: data.model,
      nickname: data.nickname,
      type: data.type || 'shoes',
      distanceMeters: typeof data.distanceMeters === 'number' ? data.distanceMeters : 0,
      manualDistanceMeters: data.manualDistanceMeters,
      replacementThresholdKm: data.replacementThresholdKm,
      retired: data.retired || false,
      retiredAt: data.retiredAt,
      primary: !!data.primary,
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      syncedAt: data.syncedAt,
      raw: data.raw
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
