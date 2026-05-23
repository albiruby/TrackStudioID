import { AthleteProfile, CanonicalActivity, DailyWellnessLog } from './types';

export function validateAthleteProfile(profile: Partial<AthleteProfile>): AthleteProfile {
  if (!profile.uid) {
    throw new Error('AthleteProfile schema error: missing uid.');
  }
  if (!profile.email) {
    throw new Error('AthleteProfile schema error: missing email.');
  }

  return {
    uid: profile.uid,
    email: profile.email,
    displayName: profile.displayName || '',
    weightKg: typeof profile.weightKg === 'number' && !isNaN(profile.weightKg) ? profile.weightKg : undefined,
    restingHR: typeof profile.restingHR === 'number' && !isNaN(profile.restingHR) ? profile.restingHR : undefined,
    vdotScore: typeof profile.vdotScore === 'number' && !isNaN(profile.vdotScore) ? profile.vdotScore : undefined,
    stravaConnected: !!profile.stravaConnected,
    intervalsConnected: !!profile.intervalsConnected,
  };
}

export function validateCanonicalActivity(act: Partial<CanonicalActivity>): CanonicalActivity {
  if (!act.id) {
    throw new Error('CanonicalActivity schema error: missing id.');
  }
  if (!act.userId) {
    throw new Error('CanonicalActivity schema error: missing userId.');
  }
  if (!act.name) {
    throw new Error('CanonicalActivity schema error: missing name.');
  }
  if (!act.startDate) {
    throw new Error('CanonicalActivity schema error: missing startDate.');
  }

  return {
    id: act.id,
    userId: act.userId,
    name: act.name,
    sportType: act.sportType || 'Run',
    distanceMeters: typeof act.distanceMeters === 'number' && !isNaN(act.distanceMeters) ? act.distanceMeters : 0,
    movingTimeSeconds: typeof act.movingTimeSeconds === 'number' && !isNaN(act.movingTimeSeconds) ? act.movingTimeSeconds : 0,
    elapsedTimeSeconds: typeof act.elapsedTimeSeconds === 'number' && !isNaN(act.elapsedTimeSeconds) ? act.elapsedTimeSeconds : 0,
    elevationGainMeters: typeof act.elevationGainMeters === 'number' && !isNaN(act.elevationGainMeters) ? act.elevationGainMeters : 0,
    startDate: act.startDate,
    startDateLocal: act.startDateLocal || act.startDate.split('T')[0],
    averageHeartRate: typeof act.averageHeartRate === 'number' && !isNaN(act.averageHeartRate) ? act.averageHeartRate : undefined,
    maxHeartRate: typeof act.maxHeartRate === 'number' && !isNaN(act.maxHeartRate) ? act.maxHeartRate : undefined,
    cadenceAvg: typeof act.cadenceAvg === 'number' && !isNaN(act.cadenceAvg) ? act.cadenceAvg : undefined,
    rpe: typeof act.rpe === 'number' && !isNaN(act.rpe) ? act.rpe : undefined,
    trainingLoad: typeof act.trainingLoad === 'number' && !isNaN(act.trainingLoad) ? act.trainingLoad : undefined,
    notes: act.notes || '',
    hasGps: act.hasGps ?? true,
    hasHeartRate: act.hasHeartRate ?? (typeof act.averageHeartRate === 'number' && act.averageHeartRate > 0),
    hasPower: act.hasPower ?? false,
  };
}

export function validateDailyWellnessLog(log: Partial<DailyWellnessLog>): DailyWellnessLog {
  if (!log.id) {
    throw new Error('DailyWellnessLog schema error: missing id (date).');
  }
  if (!log.userId) {
    throw new Error('DailyWellnessLog schema error: missing userId.');
  }
  if (!log.date) {
    throw new Error('DailyWellnessLog schema error: missing date.');
  }

  return {
    id: log.id,
    userId: log.userId,
    date: log.date,
    wakingHR: typeof log.wakingHR === 'number' && !isNaN(log.wakingHR) ? log.wakingHR : undefined,
    hrvRmssd: typeof log.hrvRmssd === 'number' && !isNaN(log.hrvRmssd) ? log.hrvRmssd : undefined,
    hrvState: log.hrvState || 'optimal',
    fatigueRating: typeof log.fatigueRating === 'number' ? log.fatigueRating : undefined,
    muscleSoreness: typeof log.muscleSoreness === 'number' ? log.muscleSoreness : undefined,
    stressRating: typeof log.stressRating === 'number' ? log.stressRating : undefined,
    sleepHours: typeof log.sleepHours === 'number' ? log.sleepHours : undefined,
    sleepScore: typeof log.sleepScore === 'number' ? log.sleepScore : undefined,
    weightKg: typeof log.weightKg === 'number' ? log.weightKg : undefined,
  };
}
