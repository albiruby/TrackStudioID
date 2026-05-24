export { 
  isRealNumber, 
  safeDisplay, 
  formatDistanceKm, 
  formatElevation,
  formatDuration, 
  formatPace, 
  computePaceFromDistanceTime, 
  normalizeDate,
  formatHeartRate,
  formatCadence,
  formatPower,
  safeNumber,
  safeString,
  safeArray,
  isValidActivity
} from './formatters';

import { isRealNumber } from './formatters';

export interface ActivityHealthResult {
  hasInvalidDate: boolean;
  hasPaceMissing: boolean;
  hasMissingHrStream: boolean;
  hasMissingPolyline: boolean;
  overallHealth: 'GREEN' | 'YELLOW' | 'RED';
  color: string;
  label: string;
}

export function getActivityDataHealth(act: any): ActivityHealthResult {
  const hasInvalidDate = !act.startDate || isNaN(Date.parse(act.startDate));
  const hasPaceMissing = act.distanceMeters > 0 && (!act.movingTimeSeconds || act.movingTimeSeconds <= 0);
  
  // Real HR stream check
  const hasMissingHrStream = !!(act.averageHeartRate && (!act.hasStreams || !act.streamKeysAvailable || !act.streamKeysAvailable.includes('heartrate')));
  const hasMissingPolyline = !!((act.distanceMeters && act.distanceMeters > 0) && (!act.polyline && !act.summaryPolyline));

  let overallHealth: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  let color = 'border-green-900/40 bg-green-950/10 text-green-400';
  let label = 'HEALTHY DATA RECORD';

  if (hasInvalidDate || hasPaceMissing) {
    overallHealth = 'RED';
    color = 'border-red-900/40 bg-red-950/10 text-red-400';
    label = 'CORRUPTED RECORD';
  } else if (hasMissingHrStream || hasMissingPolyline) {
    overallHealth = 'YELLOW';
    color = 'border-yellow-900/40 bg-yellow-950/10 text-yellow-400';
    label = 'STREAM UNSTABLE';
  }

  return {
    hasInvalidDate,
    hasPaceMissing,
    hasMissingHrStream,
    hasMissingPolyline,
    overallHealth,
    color,
    label,
  };
}



