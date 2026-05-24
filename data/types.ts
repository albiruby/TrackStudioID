export interface AthleteProfile {
  uid: string;
  email: string;
  displayName: string;
  weightKg?: number;
  restingHR?: number;
  vdotScore?: number;
  units?: 'metric' | 'imperial';
  stravaConnected?: boolean;
  intervalsConnected?: boolean;
  additionalData?: {
    age?: number;
    heightCm?: number;
    aerobicThreshold?: number;
    maxHeartRate?: number;
  };
  hrZones?: {
    z1: [number, number]; // [min, max]
    z2: [number, number];
    z3: [number, number];
    z4: [number, number];
    z5: [number, number];
  };
  paceZones?: {
    z1: [number, number]; // [min_sec_per_km, max_sec_per_km]
    z2: [number, number];
    z3: [number, number];
    z4: [number, number];
    z5: [number, number];
  };
}

export interface CanonicalActivity {
  id: string;
  userId: string;
  name: string;
  sportType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  startDate: string;
  averageHeartRate?: number;
  maxHeartRate?: number;
  elevationGainMeters?: number;
  cadenceAvg?: number;
  hasCadence?: boolean;
  hasGps?: boolean;
  notes?: string;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  hasHeartRate?: boolean;
  trainingLoad?: number;
  startDateLocal?: string;
  hasPower?: boolean;
  
  // Strava sync fields
  externalId?: string;
  source?: string;
  syncedAt?: string;
  averagePaceSecPerKm?: number | null;
  timezone?: string;
  averageSpeed?: number;
  maxSpeed?: number;
  averageWatts?: number;
  maxWatts?: number;
  weightedAverageWatts?: number;
  deviceWatts?: boolean;
  kilojoules?: number;
  calories?: number;
  map?: {
      summary_polyline?: string;
      polyline?: string;
  };
  startLatlng?: number[];
  endLatlng?: number[];
  gearId?: string;
  kudosCount?: number;
  commentCount?: number;
  deviceName?: string;
  dataHealth?: string[];
  raw?: any;
  updatedAt?: string;
  
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

export interface CanonicalLap {
  activityId: string;
  lapIndex: number;
  name: string;
  distanceMeters: number | null;
  movingTimeSeconds: number | null;
  elapsedTimeSeconds: number | null;
  paceSecPerKm: number | null;
  averageSpeedMps: number | null;
  maxSpeedMps: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averageCadence: number | null;
  averageWatts: number | null;
  elevationGainMeters: number | null;
  startIndex: number | null;
  endIndex: number | null;
  raw?: any;
}

export interface CanonicalSplit {
  activityId: string;
  splitIndex: number;
  splitType: "metric" | "standard";
  distanceMeters: number | null;
  elapsedTimeSeconds: number | null;
  movingTimeSeconds: number | null;
  paceSecPerKm: number | null;
  averageSpeedMps: number | null;
  elevationDifferenceMeters: number | null;
  averageGrade: number | null;
  averageHeartRate: number | null;
  averageCadence: number | null;
  averageWatts: number | null;
  raw?: any;
}

export interface CanonicalBestEffort {
  activityId: string;
  name: string;
  distanceMeters: number | null;
  elapsedTimeSeconds: number | null;
  movingTimeSeconds: number | null;
  paceSecPerKm: number | null;
  startDate: string | null;
  startIndex: number | null;
  endIndex: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  raw?: any;
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
export interface TrainingLoadRecord {
  id: string;
  userId: string;
  date: string;
  loadValue: number;
}
export interface DailyWellnessLogRecord {
  id: string;
  userId: string;
  date: string;
  wakingHR: number;
  hrvRmssd: number;
  hrvState: 'optimal' | 'moderate' | 'suppressed';
  fatigueRating: number;
  muscleSoreness: number;
  stressRating: number;
  weightKg: number;
  sleepHours: number;
  sleepScore: number;
}
export interface CanonicalActivityRecord {
  id: string;
  userId: string;
  name: string;
  sportType: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  startDate: string;
  averageHeartRate: number;
  maxHeartRate: number;
  elevationGainMeters: number;
  cadenceAvg: number;
  hasGps: boolean;
  notes: string;
}
export interface AthleteProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  weightKg: number;
  restingHR: number;
  vdotScore: number;
  units: 'metric' | 'imperial';
  additionalData: {
    age: number;
    heightCm: number;
    aerobicThreshold: number;
    maxHeartRate: number;
  };
}

export interface CanonicalActivityStream {
  id?: string;
  activityId: string;
  userId: string;
  source: string;
  time: number[] | null;
  distance: number[] | null;
  latlng: [number, number][] | null;
  altitude: number[] | null;
  velocitySmooth: number[] | null;
  heartrate: number[] | null;
  cadence: number[] | null;
  watts: number[] | null;
  temp: number[] | null;
  gradeSmooth: number[] | null;
  raw?: any;
  syncedAt?: string;
  updatedAt?: string;
  dataHealth?: string[];
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

