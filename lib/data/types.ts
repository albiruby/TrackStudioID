/**
 * ============================================================================
 * TRACK.STUDIO CANONICAL TYPES (SPORTS SCIENCE PROTOCOL)
 * ============================================================================
 */

export interface CanonicalActivity {
  id: string;
  userId: string;
  source: 'strava' | 'intervals' | 'manual';
  externalId?: string;
  name: string;
  sportType: string; // 'Run' | 'Ride' | 'Swim' | 'Walk' | 'Hike' | 'Other'
  startDate: string; // ISO date-time string
  startDateLocal: string; // YYYY-MM-DD HH:MM:SS format or local ISO
  timezone?: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  averageSpeedMps?: number;
  averagePaceSecPerKm?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  hasHeartRate: boolean;
  averageCadence?: number;
  hasCadence: boolean;
  averageWatts?: number;
  maxWatts?: number;
  weightedAverageWatts?: number;
  deviceWatts?: boolean;
  hasPower: boolean;
  calories?: number;
  elevationGainMeters?: number;
  hasGps: boolean;
  polyline?: string;
  summaryPolyline?: string;
  startLatLng?: number[];
  endLatLng?: number[];
  deviceName?: string;
  temperatureCelsius?: number;
  gearId?: string;
  gearName?: string;
  kudosCount?: number;
  commentCount?: number;
  raw?: any;
  dataHealth: 'excellent' | 'moderate' | 'poor';
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  // Dynamic fields for back compatibility if needed
  trainingLoad?: number; 
  rpe?: number;
  notes?: string;
}

export interface CanonicalActivityStream {
  activityId: string;
  time?: number[];
  distance?: number[];
  velocitySmooth?: number[];
  heartrate?: number[];
  cadence?: number[];
  watts?: number[];
  altitude?: number[];
  gradeSmooth?: number[];
  temp?: number[];
  latlng?: number[][];
}

export interface CanonicalLap {
  id: string;
  activityId: string;
  lapIndex: number;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  averageSpeedMps: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageCadence?: number;
  averageWatts?: number;
}

export interface CanonicalSplit {
  splitIndex: number;
  distanceMeters: number;
  elapsedTimeSeconds: number;
  movingTimeSeconds: number;
  averageSpeedMps: number;
  averageHeartRate?: number;
  averagePaceSecPerKm: number;
}

export interface CanonicalBestEffort {
  id: string;
  activityId: string;
  name: string; // "1k", "5k", "10k", "half marathon", etc.
  elapsedTimeSeconds: number;
  movingTimeSeconds: number;
  distanceMeters: number;
  startDate: string;
}

export interface CanonicalGear {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  distanceMeters: number;
  primary: boolean;
  notes?: string;
}

export interface DailyTrainingLoad {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  trainingVolume: number; // in km or mins
}

export interface DailyWellnessLog {
  id: string;
  userId: string;
  date: string;
  wakingHR: number;
  hrvRmssd: number;
  fatigueRating: number;
  muscleSoreness: number;
  stressRating: number;
  weightKg: number;
  sleepHours?: number;
  sleepScore?: number;
  notes?: string;
}

export interface AthleteProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  weightKg: number;
  heightCm: number;
  restingHR: number;
  maxHR: number;
  thresholdHR: number;
  vdotScore: number;
  stravaConnected: boolean;
  stravaAthleteId?: string;
  createdAt?: any;
  updatedAt?: any;
  settings?: Record<string, any>;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  weeks: number;
  targetWeeklyVolumeM?: number;
}

export interface WorkoutSession {
  id: string;
  name: string;
  description?: string;
  intensity: 'low' | 'medium' | 'high';
  durationMinutes: number;
}

export interface RaceGoal {
  id: string;
  userId: string;
  name: string;
  distanceMeters: number;
  targetTimeSeconds: number;
  targetPaceSecPerKm: number;
  raceDate: string;
}

export interface ReportSummary {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalElevationGain: number;
  averageHeartRate?: number;
}

export interface ExportCardPayload {
  activityId: string;
  title: string;
  metrics: { label: string; value: string }[];
  accentColor: string;
}
