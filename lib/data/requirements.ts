export type Severity = 'info' | 'warning' | 'blocking';

export interface DataRequirement {
  id: string;
  title: string;
  explanation: string;
  requiredSource: string;
  actionLabel?: string;
  targetRoute?: string;
  severity: Severity;
}

export const REQUIREMENTS: Record<string, DataRequirement> = {
  STRAVA_CONNECTION_REQUIRED: {
    id: 'STRAVA_CONNECTION_REQUIRED',
    title: 'Strava Connection Required',
    explanation: 'You need to connect your Strava account to import activities.',
    requiredSource: 'Strava OAuth',
    actionLabel: 'Connect Strava',
    targetRoute: '/settings',
    severity: 'blocking'
  },
  STRAVA_ACTIVITY_SYNC_REQUIRED: {
    id: 'STRAVA_ACTIVITY_SYNC_REQUIRED',
    title: 'Activity Sync Required',
    explanation: 'Activities must be synced from Strava to populate this module.',
    requiredSource: 'Strava Activities API',
    actionLabel: 'Sync Activities',
    targetRoute: '/settings',
    severity: 'blocking'
  },
  ACTIVITY_DETAIL_REQUIRED: {
    id: 'ACTIVITY_DETAIL_REQUIRED',
    title: 'Activity Detail Required',
    explanation: 'Detailed activity telemetry is required for deep analysis.',
    requiredSource: 'Strava Activity Detail API',
    actionLabel: 'Sync Details',
    targetRoute: '/settings',
    severity: 'blocking'
  },
  STREAMS_REQUIRED: {
    id: 'STREAMS_REQUIRED',
    title: 'Activity Streams Required',
    explanation: 'High-resolution activity streams (time, distance, velocity) are required.',
    requiredSource: 'Strava Streams API',
    actionLabel: 'Check Activities',
    targetRoute: '/activities',
    severity: 'blocking'
  },
  HR_STREAM_REQUIRED: {
    id: 'HR_STREAM_REQUIRED',
    title: 'Heart Rate Data Required',
    explanation: 'This analysis requires an activity recorded with a heart rate monitor.',
    requiredSource: 'Heart Rate Sensor',
    actionLabel: 'View Activities',
    targetRoute: '/activities',
    severity: 'blocking'
  },
  CADENCE_STREAM_REQUIRED: {
    id: 'CADENCE_STREAM_REQUIRED',
    title: 'Cadence Data Required',
    explanation: 'This analysis requires an activity recorded with a cadence sensor (footpod or watch).',
    requiredSource: 'Cadence Sensor',
    actionLabel: 'View Activities',
    targetRoute: '/activities',
    severity: 'blocking'
  },
  POWER_STREAM_REQUIRED: {
    id: 'POWER_STREAM_REQUIRED',
    title: 'Power Data Required',
    explanation: 'This analysis requires an activity recorded with a running power meter.',
    requiredSource: 'Power Sensor',
    actionLabel: 'View Activities',
    targetRoute: '/activities',
    severity: 'blocking'
  },
  GPS_ROUTE_REQUIRED: {
    id: 'GPS_ROUTE_REQUIRED',
    title: 'GPS Route Data Required',
    explanation: 'This feature requires an outdoor activity with valid GPS route data.',
    requiredSource: 'Strava Activity Route',
    actionLabel: 'Open Activities',
    targetRoute: '/activities',
    severity: 'blocking'
  },
  INTERVALS_CONNECTION_REQUIRED: {
    id: 'INTERVALS_CONNECTION_REQUIRED',
    title: 'Intervals.icu Connection Required',
    explanation: 'You need to connect your Intervals.icu account to access advanced load matrices.',
    requiredSource: 'Intervals.icu Integration',
    actionLabel: 'Connect Intervals.icu',
    targetRoute: '/settings',
    severity: 'blocking'
  },
  WELLNESS_REQUIRED: {
    id: 'WELLNESS_REQUIRED',
    title: 'Wellness Data Required',
    explanation: 'Daily wellness logs (sleep, soreness, mood) are required.',
    requiredSource: 'Intervals.icu Wellness or Manual Input',
    actionLabel: 'Log Wellness',
    targetRoute: '/wellness',
    severity: 'blocking'
  },
  HRV_REQUIRED: {
    id: 'HRV_REQUIRED',
    title: 'HRV Data Required',
    explanation: 'Heart Rate Variability (HRV) metrics must be logged to calculate readiness.',
    requiredSource: 'Intervals.icu Wellness',
    actionLabel: 'Sync Wellness',
    targetRoute: '/settings',
    severity: 'warning'
  },
  DAILY_LOAD_REQUIRED: {
    id: 'DAILY_LOAD_REQUIRED',
    title: 'Training Load Data Required',
    explanation: 'Daily training load metrics (CTL, ATL, TSB) must be synced.',
    requiredSource: 'Intervals.icu API',
    actionLabel: 'Sync Intervals.icu',
    targetRoute: '/settings',
    severity: 'blocking'
  },
  ATHLETE_PROFILE_REQUIRED: {
    id: 'ATHLETE_PROFILE_REQUIRED',
    title: 'Athlete Profile Incomplete',
    explanation: 'Baseline physiological metrics (e.g., Max HR, Weight) are needed for accurate modeling.',
    requiredSource: 'Manual Profile Input',
    actionLabel: 'Update Profile',
    targetRoute: '/athlete-profile',
    severity: 'warning'
  },
  HR_ZONES_REQUIRED: {
    id: 'HR_ZONES_REQUIRED',
    title: 'Heart Rate Zones Required',
    explanation: 'Configured Heart Rate zones are required to classify intensity distribution.',
    requiredSource: 'Intervals.icu Settings or Manual Input',
    actionLabel: 'Update Zones',
    targetRoute: '/athlete-profile',
    severity: 'blocking'
  },
  PACE_ZONES_REQUIRED: {
    id: 'PACE_ZONES_REQUIRED',
    title: 'Pace Zones Required',
    explanation: 'Configured Pace zones are required to classify speed distribution.',
    requiredSource: 'Intervals.icu Settings or Manual Input',
    actionLabel: 'Update Zones',
    targetRoute: '/athlete-profile',
    severity: 'blocking'
  },
  MANUAL_INPUT_REQUIRED: {
    id: 'MANUAL_INPUT_REQUIRED',
    title: 'Manual Input Required',
    explanation: 'You must provide manual input to populate this module.',
    requiredSource: 'User Input',
    severity: 'info'
  },
  ENOUGH_HISTORY_REQUIRED: {
    id: 'ENOUGH_HISTORY_REQUIRED',
    title: 'Historical Data Required',
    explanation: 'This analysis requires a larger volume of historical data to form a trend.',
    requiredSource: 'Aggregated Activities over time',
    severity: 'warning'
  }
};

export function getMissingRequirements(checkList: string[], providedData: Record<string, boolean>): DataRequirement[] {
  const missing: DataRequirement[] = [];
  for (const reqId of checkList) {
    if (!providedData[reqId] && REQUIREMENTS[reqId]) {
      missing.push(REQUIREMENTS[reqId]);
    }
  }
  return missing;
}

export function getModuleReadiness(checkList: string[], providedData: Record<string, boolean>): { ready: boolean, missing: DataRequirement[] } {
  const missingReqs = getMissingRequirements(checkList, providedData);
  const isBlocked = missingReqs.some(req => req.severity === 'blocking');
  return {
    ready: !isBlocked,
    missing: missingReqs
  };
}
