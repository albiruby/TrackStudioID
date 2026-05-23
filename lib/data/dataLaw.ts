export function isRealNumber(val: any): boolean {
  return typeof val === 'number' && !isNaN(val) && isFinite(val);
}

export function safeDisplay(val: any, fallback = '—'): string {
  if (val === undefined || val === null || val === '') return fallback;
  return String(val);
}

export function formatDistanceKm(meters: number | undefined): string {
  if (!isRealNumber(meters)) return '—';
  return `${(meters! / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number | undefined): string {
  if (!isRealNumber(seconds)) return '—';
  const h = Math.floor(seconds! / 3600);
  const m = Math.floor((seconds! % 3600) / 60);
  const s = Math.floor(seconds! % 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function formatPace(secsPerKm: number | undefined): string {
  if (!isRealNumber(secsPerKm)) return '—';
  if (secsPerKm! === Infinity || secsPerKm! <= 0) return '—';
  const mins = Math.floor(secsPerKm! / 60);
  const secs = Math.round(secsPerKm! % 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

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
  const hasMissingPolyline = !!((act.distanceMeters && act.distanceMeters > 0) && (!act.map || (!act.map.polyline && !act.map.summary_polyline)));

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

export function computePaceFromDistanceTime(distanceMeters: number | undefined, movingTimeSeconds: number | undefined): number | undefined {
  if (!isRealNumber(distanceMeters) || !isRealNumber(movingTimeSeconds) || distanceMeters! <= 0) {
    return undefined;
  }
  const km = distanceMeters! / 1000;
  return movingTimeSeconds! / km;
}

export function normalizeDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

