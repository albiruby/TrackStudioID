/**
 * ============================================================================
 * TRACK.STUDIO SYSTEM TYPES (SPORTS SCIENCE SCHEMAS)
 * ============================================================================
 */

export interface AthleteProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  restingHR?: number | null;
  maxHR?: number | null;
  thresholdHR?: number | null;
  vdotScore?: number | null;
  stravaConnected: boolean;
  stravaAthleteId?: string;
  intervalsConnected?: boolean;
  intervalsAthleteId?: string;
  createdAt?: any;
  updatedAt?: any;
  units?: 'metric' | 'imperial';
  birthDate?: string | null;
  sex?: string | null;
  restingHeartRate?: number | null;
  maxHeartRate?: number | null;
  lactateThresholdHeartRate?: number | null;
  thresholdPaceSecPerKm?: number | null;
  thresholdPowerWatts?: number | null;
  recentRaceResults?: {
    id: string;
    distanceMeters: number;
    timeSeconds: number;
    date: string;
    source: 'manual' | 'strava' | 'intervals';
    notes?: string;
  }[];
  preferredUnits?: 'metric' | 'imperial';
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

export interface Activity {
  id: string;
  athleteUid: string;
  externalId?: string; // Strava Activity ID
  name: string;
  sportType: 'Run' | 'Ride' | 'Swim' | 'Walk' | 'Hike' | 'Other';
  distanceMeters: number;
  movingTimeSec: number;
  elapsedTimeSec: number;
  totalElevationGainMeters: number;
  startDateLocal: string;
  averageHR?: number;
  maxHR?: number;
  trainingLoad?: number; // TRIMP formula
  aerobicTTE?: number;  // Time To Exhaustion estimasi
  normalizedPower?: number; // Power estimate
  vdotPerformance?: number; // calculated vdot for this spec run
  cadenceAvg?: number;
  gradeAdjustedPace?: number; // GAP (min/km)
  rpe?: number; // Rate of Perceived Exertion (1-10)
  notes?: string;
  temperatureCelsius?: number;
  routeCoordinates?: string; // polyline placeholder
}

export interface TrainingDiagnostic {
  ctl: number; // Chronic Training Load (Fitness - 42 days)
  atl: number; // Acute Training Load (Fatigue - 7 days)
  tsb: number; // Training Stress Balance (Form = CTL - ATL)
  efficiencyFactor: number; // GAP / Avg HR
  decouplingRate: number; // aerobic decoupling percentage
  acuteChronicRatio: number; // ATL/CTL (1.5 above is danger)
  updatedAt: string;
}

export interface DailyWellnessLog {
  id?: string;
  userId: string;
  date: string;       // YYYY-MM-DD
  source: 'intervals' | 'manual';
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
  syncedAt: string;
  updatedAt: string;
  dataHealth?: string;
}

export interface DailyTrainingLoad {
  id?: string;
  userId: string;
  date: string;       // YYYY-MM-DD
  source: 'intervals';
  fitnessCtl?: number | null; // CTL
  fatigueAtl?: number | null; // ATL
  formTsb?: number | null;    // TSB
  rampRate?: number | null;
  trainingLoad?: number | null; // Load today
  acuteLoad?: number | null;
  chronicLoad?: number | null;
  intensity?: number | null;
  loadScore?: number | null;
  raw?: any;
  syncedAt: string;
  updatedAt: string;
  dataHealth?: string;
}

export interface WellnessHistory {
  id: string;
  athleteUid: string;
  date: string;
  wakingHR: number;
  hrvRmssd: number; // HRV RMSSD metric
  hrvState: 'optimal' | 'warning' | 'critical';
  fatigueRating: number; // 1-5 (RPE scale)
  muscleSoreness: number; // 1-5 (DOMS scale)
  stressRating: number; // 1-5
  weightKg: number;
}

export interface SleepSession {
  id: string;
  athleteUid: string;
  date: string;
  durationHours: number;
  deepSleepMin: number;
  remSleepMin: number;
  sleepScore: number; // 0-100
  sleepEfficiency: number; // decimal percent
  restingHR: number;
}

export interface InjuryRiskAnalysis {
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  factors: string[];
  recommendations: string[];
}
