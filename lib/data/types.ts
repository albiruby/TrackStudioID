/**
 * ============================================================================
 * TRACK.STUDIO CANONICAL TYPES (SPORTS SCIENCE PROTOCOL)
 * ============================================================================
 */

export interface CanonicalActivity {
  id: string;
  userId: string;
  source: 'strava' | 'intervals' | 'manual' | string;
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
  averageSpeed?: number;
  maxSpeed?: number;
  averagePaceSecPerKm?: number | null;
  averageHeartRate?: number;
  maxHeartRate?: number;
  hasHeartRate: boolean;
  averageCadence?: number;
  cadenceAvg?: number;
  hasCadence: boolean;
  averageWatts?: number;
  maxWatts?: number;
  weightedAverageWatts?: number;
  deviceWatts?: boolean;
  hasPower: boolean;
  calories?: number;
  kilojoules?: number;
  elevationGainMeters?: number;
  hasGps: boolean;
  polyline?: string;
  summaryPolyline?: string;
  startLatLng?: number[];
  endLatLng?: number[];
  startLatlng?: number[];
  endLatlng?: number[];
  deviceName?: string;
  temperatureCelsius?: number;
  gearId?: string;
  gearName?: string;
  kudosCount?: number;
  commentCount?: number;
  raw?: any;
  dataHealth: 'excellent' | 'moderate' | 'poor' | string[] | any;
  createdAt?: string;
  updatedAt?: string;
  syncedAt?: string;
  // Dynamic fields for back compatibility if needed
  trainingLoad?: number; 
  rpe?: number;
  notes?: string;

  // detail sync fields
  detailSyncedAt?: string;
  rawDetailed?: any;
  description?: string;
  perceivedExertion?: number;
  sufferScore?: number;
  splitsMetric?: any[];
  splitsStandard?: any[];
  laps?: any[];
  bestEfforts?: any[];
  segmentEfforts?: any[];
  elevHigh?: number;
  elevLow?: number;
  
  // stream sync fields
  streamsSyncedAt?: string;
  hasStreams?: boolean;
  streamKeysAvailable?: string[];
  // structured data sync fields
  structuredDataSyncedAt?: string;
  hasLaps?: boolean;
  hasSplits?: boolean;
  hasBestEfforts?: boolean;
}

export interface CanonicalActivityStream {
  id?: string;
  activityId: string;
  userId: string;
  source: string;
  time?: number[] | null;
  distance?: number[] | null;
  velocitySmooth?: number[] | null;
  heartrate?: number[] | null;
  cadence?: number[] | null;
  watts?: number[] | null;
  altitude?: number[] | null;
  gradeSmooth?: number[] | null;
  temp?: number[] | null;
  latlng?: number[][] | null;
  raw?: any;
  syncedAt?: string;
  updatedAt?: string;
  dataHealth?: string[];
}

export interface CanonicalLap {
  id: string;
  activityId: string;
  lapIndex: number;
  name?: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  paceSecPerKm?: number | null;
  averageSpeedMps: number;
  maxSpeedMps?: number | null;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageCadence?: number;
  averageWatts?: number;
  elevationGainMeters?: number | null;
  startIndex?: number | null;
  endIndex?: number | null;
  raw?: any;
}

export interface CanonicalSplit {
  splitIndex: number;
  splitType?: "metric" | "standard";
  activityId?: string;
  distanceMeters: number;
  elapsedTimeSeconds: number;
  movingTimeSeconds: number;
  paceSecPerKm?: number | null;
  averageSpeedMps: number;
  elevationDifferenceMeters?: number | null;
  averageGrade?: number | null;
  averageHeartRate?: number;
  averageCadence?: number | null;
  averageWatts?: number | null;
  averagePaceSecPerKm?: number;
  raw?: any;
}

export interface CanonicalBestEffort {
  id: string;
  activityId: string;
  name: string; // "1k", "5k", "10k", "half marathon", etc.
  elapsedTimeSeconds: number;
  movingTimeSeconds: number;
  distanceMeters: number;
  paceSecPerKm?: number | null;
  startDate: string;
  startIndex?: number | null;
  endIndex?: number | null;
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  raw?: any;
}

export interface CanonicalGear {
  id: string;
  userId: string;
  source: 'strava' | 'manual';
  externalId?: string;
  name: string;
  brand?: string;
  model?: string;
  nickname?: string;
  type: 'shoes' | 'bike' | 'other';
  distanceMeters: number;
  manualDistanceMeters?: number;
  replacementThresholdKm?: number;
  retired?: boolean;
  retiredAt?: string;
  notes?: string;
  primary?: boolean;
  createdAt?: string;
  updatedAt?: string;
  syncedAt?: string;
  raw?: any;
}

export interface DailyTrainingLoad {
  id?: string;
  userId: string;
  date: string;
  source?: 'intervals';
  fitnessCtl?: number | null;
  fatigueAtl?: number | null;
  formTsb?: number | null;
  rampRate?: number | null;
  trainingLoad?: number | null;
  acuteLoad?: number | null;
  chronicLoad?: number | null;
  intensity?: number | null;
  loadScore?: number | null;
  raw?: any;
  syncedAt?: string;
  updatedAt?: string;
  dataHealth?: string;
}

export interface DailyWellnessLog {
  id?: string;
  userId: string;
  date: string;
  source?: 'intervals' | 'manual';
  restingHeartRate?: number | null;
  hrvRmssd?: number | null;
  hrvSdnn?: number | null;
  sleepDurationHours?: number | null;
  sleepQuality?: number | null;
  soreness?: number | null;
  fatigue?: number | null;
  mood?: number | null;
  stress?: number | null;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  notes?: string | null;
  raw?: any;
  syncedAt?: string;
  updatedAt?: string;
  dataHealth?: string;
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

export interface CourseRecord {
  id?: string;
  userId: string;
  name: string;
  sourceActivityId: string;
  routePolyline?: string;
  distanceMeters: number;
  elevationGainMeters: number;
  bestActivityId: string;
  bestTimeSeconds: number;
  bestPaceSecPerKm: number;
  attempts?: CourseAttempt[];
  groupingMethod: "manual";
  createdAt: string;
  updatedAt: string;
}

export interface CourseAttempt {
  activityId: string;
  date: string;
  movingTimeSeconds: number;
  distanceMeters: number;
  paceSecPerKm: number;
  averageHeartRate?: number | null;
  elevationGainMeters: number;
}
