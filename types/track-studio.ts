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
  weightKg: number;
  heightCm: number;
  restingHR: number;
  maxHR: number;
  thresholdHR: number;
  vdotScore: number;
  stravaConnected: boolean;
  stravaAthleteId?: string;
  intervalsConnected?: boolean;
  intervalsAthleteId?: string;
  createdAt?: any;
  updatedAt?: any;
  units?: 'metric' | 'imperial';
  additionalData?: {
    age?: number;
    heightCm?: number;
    aerobicThreshold?: number;
    maxHeartRate?: number;
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
