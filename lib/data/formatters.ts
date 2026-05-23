/**
 * ============================================================================
 * TRACK.STUDIO PHYSIOLOGICAL FORMATTERS & SANITIZATION UTILS
 * ============================================================================
 */

export function isRealNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function safeDisplay(value: any, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === 'number' && isNaN(value)) return fallback;
  return String(value);
}

export function formatDistanceKm(meters: any): string {
  if (!isRealNumber(meters)) return "—";
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: any): string {
  if (!isRealNumber(seconds)) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secPerKm: any): string {
  if (!isRealNumber(secPerKm)) return "—";
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

export function computePaceFromDistanceTime(distanceMeters: any, movingTimeSeconds: any): number | undefined {
  if (!isRealNumber(distanceMeters) || !isRealNumber(movingTimeSeconds) || distanceMeters <= 0) {
    return undefined;
  }
  const km = distanceMeters / 1000;
  return movingTimeSeconds / km;
}

export function requireData<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    throw new Error(`Data Requirement Error: ${label} is missing.`);
  }
  return value;
}

export function normalizeDate(input: any): string {
  if (!input) return "Tanggal tidak tersedia";
  try {
    let date: Date;
    if (input instanceof Date) {
      date = input;
    } else if (typeof input === 'number') {
      date = new Date(input);
    } else if (typeof input === 'string') {
      date = new Date(input);
    } else if (input.seconds !== undefined) {
      date = new Date(input.seconds * 1000);
    } else {
      return "Tanggal tidak tersedia";
    }

    if (isNaN(date.getTime())) {
      return "Tanggal tidak tersedia";
    }

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch (e) {
    return "Tanggal tidak tersedia";
  }
}

export function getActivityDataHealth(activity: any): 'excellent' | 'moderate' | 'poor' {
  if (!activity) return 'poor';
  
  let score = 0;
  const metrics = [
    activity.hasHeartRate || (isRealNumber(activity.averageHeartRate) && activity.averageHeartRate > 0) || (isRealNumber(activity.averageHR) && activity.averageHR > 0),
    activity.hasCadence || (isRealNumber(activity.averageCadence) && activity.averageCadence > 0) || (isRealNumber(activity.cadenceAvg) && activity.cadenceAvg > 0),
    activity.hasGps || activity.polyline || activity.summaryPolyline || activity.routeCoordinates
  ];

  for (const met of metrics) {
    if (met) score += 1;
  }

  if (score === 3) return 'excellent';
  if (score >= 1) return 'moderate';
  return 'poor';
}
