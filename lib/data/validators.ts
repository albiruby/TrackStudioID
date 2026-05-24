/**
 * ============================================================================
 * TRACK.STUDIO STRICT VALIDATION SCHEMAS (DATA INTEGRITY GUARANTEE)
 * ============================================================================
 */

import { CanonicalActivity, DailyWellnessLog, AthleteProfile } from './types';
import { isRealNumber } from './formatters';

export function validateCanonicalActivity(activity: Partial<CanonicalActivity>): CanonicalActivity {
  if (!activity.id) throw new Error("Validation Error: Activity requires a unique 'id'.");
  if (!activity.userId) throw new Error("Validation Error: Activity requires a valid 'userId'.");
  if (!activity.name) throw new Error("Validation Error: Activity requires a non-empty name.");
  
  const distance = activity.distanceMeters;
  if (!isRealNumber(distance) || distance < 0) {
    throw new Error("Validation Error: Activity distance must be a non-negative real number.");
  }

  const movingTime = activity.movingTimeSeconds ?? (activity as any).movingTimeSec;
  if (!isRealNumber(movingTime) || movingTime < 0) {
    throw new Error("Validation Error: Activity moving time must be a non-negative real number.");
  }

  return {
    id: activity.id,
    userId: activity.userId,
    source: activity.source || 'manual',
    externalId: activity.externalId,
    name: activity.name,
    sportType: activity.sportType || 'Run',
    startDate: activity.startDate || new Date().toISOString(),
    startDateLocal: activity.startDateLocal || new Date().toLocaleString(),
    timezone: activity.timezone,
    distanceMeters: distance,
    movingTimeSeconds: movingTime,
    elapsedTimeSeconds: activity.elapsedTimeSeconds ?? (activity as any).elapsedTimeSec ?? movingTime,
    averageSpeedMps: activity.averageSpeedMps,
    averagePaceSecPerKm: activity.averagePaceSecPerKm,
    averageHeartRate: activity.averageHeartRate ?? (activity as any).averageHR,
    maxHeartRate: activity.maxHeartRate ?? (activity as any).maxHR,
    hasHeartRate: !!(activity.hasHeartRate || activity.averageHeartRate || (activity as any).averageHR),
    averageCadence: activity.averageCadence ?? (activity as any).cadenceAvg,
    hasCadence: !!(activity.hasCadence || activity.averageCadence || (activity as any).cadenceAvg),
    averageWatts: activity.averageWatts,
    maxWatts: activity.maxWatts,
    weightedAverageWatts: activity.weightedAverageWatts,
    deviceWatts: activity.deviceWatts,
    hasPower: !!(activity.hasPower || activity.averageWatts),
    calories: activity.calories,
    elevationGainMeters: activity.elevationGainMeters ?? (activity as any).totalElevationGainMeters,
    hasGps: !!(activity.hasGps || activity.polyline || activity.summaryPolyline || (activity as any).routeCoordinates),
    polyline: activity.polyline,
    summaryPolyline: activity.summaryPolyline ?? (activity as any).routeCoordinates,
    startLatLng: activity.startLatLng,
    endLatLng: activity.endLatLng,
    deviceName: activity.deviceName,
    temperatureCelsius: activity.temperatureCelsius ?? activity.temperatureCelsius,
    gearId: activity.gearId,
    gearName: activity.gearName,
    kudosCount: activity.kudosCount,
    commentCount: activity.commentCount,
    raw: activity.raw,
    dataHealth: activity.dataHealth || 'moderate',
    createdAt: activity.createdAt || new Date().toISOString(),
    updatedAt: activity.updatedAt || new Date().toISOString(),
    syncedAt: activity.syncedAt,
    trainingLoad: activity.trainingLoad,
    rpe: activity.rpe,
    notes: activity.notes,
  };
}

export function validateDailyWellnessLog(log: Partial<DailyWellnessLog>): DailyWellnessLog {
  if (!log.id) throw new Error("Validation Error: DailyWellnessLog requires an 'id'.");
  if (!log.userId) throw new Error("Validation Error: DailyWellnessLog requires a 'userId'.");
  if (!log.date) throw new Error("Validation Error: DailyWellnessLog requires a 'date'.");

  const hr = typeof (log as any).wakingHR === 'number' ? (log as any).wakingHR : (log as any).restingHeartRate;
  if (!isRealNumber(hr) || hr <= 0) {
    throw new Error("Validation Error: DailyWellnessLog requires a positive waking Heart Rate.");
  }

  if (!isRealNumber(log.hrvRmssd) || log.hrvRmssd <= 0) {
    throw new Error("Validation Error: DailyWellnessLog requires positive HRV RMSSD.");
  }

  return {
    id: log.id,
    userId: log.userId,
    date: log.date,
    restingHeartRate: hr,
    hrvRmssd: log.hrvRmssd,
    fatigue: typeof (log as any).fatigueRating === 'number' ? (log as any).fatigueRating : typeof (log as any).fatigue === 'number' ? (log as any).fatigue : 1,
    soreness: typeof (log as any).muscleSoreness === 'number' ? (log as any).muscleSoreness : typeof (log as any).soreness === 'number' ? (log as any).soreness : 1,
    stress: typeof (log as any).stressRating === 'number' ? (log as any).stressRating : typeof (log as any).stress === 'number' ? (log as any).stress : 1,
    weightKg: log.weightKg || 70,
    sleepDurationHours: typeof (log as any).sleepHours === 'number' ? (log as any).sleepHours : typeof (log as any).sleepDurationHours === 'number' ? (log as any).sleepDurationHours : undefined,
    sleepQuality: typeof (log as any).sleepScore === 'number' ? (log as any).sleepScore : typeof (log as any).sleepQuality === 'number' ? (log as any).sleepQuality : undefined,
    notes: log.notes,
  };
}

export function validateAthleteProfile(profile: Partial<AthleteProfile>): AthleteProfile {
  if (!profile.uid) throw new Error("Validation Error: AthleteProfile requires a valid Firestore 'uid'.");
  if (!profile.email) throw new Error("Validation Error: AthleteProfile requires an email address.");

  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName || profile.email.split('@')[0],
    photoURL: profile.photoURL || null,
    weightKg: profile.weightKg || 70.0,
    heightCm: profile.heightCm || 175.0,
    restingHR: profile.restingHR || 42,
    maxHR: profile.maxHR || 190,
    thresholdHR: profile.thresholdHR || 165,
    vdotScore: profile.vdotScore || 45.0,
    stravaConnected: !!profile.stravaConnected,
    stravaAthleteId: profile.stravaAthleteId,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    settings: profile.settings || {},
  };
}
