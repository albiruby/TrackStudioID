import { CanonicalActivity } from '../../data/types';
import { ReportAggregationResult } from '../analytics/reportAggregation';

export interface ExportCardPayload {
  type: 'activity' | 'report';
  title: string;
  subtitle: string;
  date: string;
  distanceKm: number;
  duration: number; // in seconds
  pace: number; // seconds per km
  elevationMeters?: number;
  averageHeartRate?: number | null;
  averageWatts?: number | null;
  activityCount?: number;
  activeDays?: number;
  athleteName: string;
  routeSvgPath?: string;
  routeViewBox?: string;
  source: string;
  dataHealth?: string[];
}

// Canonical encoded polyline decoder helper
export function decodePolyline(str: string): [number, number][] {
  let index = 0;
  const len = str.length;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lat * 1e-5, lng * 1e-5]);
  }

  return coordinates;
}

// Convert coordinates matrix to proportional centered SVG path string
export function coordinatesToSVGPath(
  coordinates: [number, number][],
  width: number,
  height: number,
  padding: number = 80
): { path: string; viewBox: string } {
  if (!coordinates || coordinates.length === 0) {
    return { path: '', viewBox: `0 0 ${width} ${height}` };
  }

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  coordinates.forEach(([lat, lng]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });

  const rangeLat = maxLat - minLat;
  const rangeLng = maxLng - minLng;

  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  // Determine scaling multiplier keeping original aspect ratio intact
  let scale = 1;
  if (rangeLng > 0 || rangeLat > 0) {
    scale = Math.min(
      rangeLng === 0 ? Infinity : drawW / rangeLng,
      rangeLat === 0 ? Infinity : drawH / rangeLat
    );
  }

  if (scale === Infinity || scale <= 0) {
    scale = 1;
  }

  // Calculate coordinates center padding alignment
  const offsetX = padding + (drawW - rangeLng * scale) / 2;
  const offsetY = padding + (drawH - rangeLat * scale) / 2;

  const points = coordinates.map(([lat, lng]) => {
    const x = offsetX + (lng - minLng) * scale;
    const y = offsetY + (maxLat - lat) * scale; // Flip y-axis for maps projection
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return {
    path: `M ${points.join(' L ')}`,
    viewBox: `0 0 ${width} ${height}`
  };
}

// Convert CanonicalActivity to standard export payload format
export function mapActivityToPayload(
  activity: CanonicalActivity,
  athleteName: string = 'Athlete'
): ExportCardPayload {
  const distanceKm = (activity.distanceMeters || 0) / 1000;
  const duration = activity.movingTimeSeconds || activity.elapsedTimeSeconds || 0;
  const pace = distanceKm > 0 ? duration / distanceKm : 0;

  // Retrieve route coordinates if any are embedded
  let routeSvgPath = '';
  let routeViewBox = '0 0 1080 1080';
  const poly = activity.map?.polyline || activity.map?.summary_polyline;
  if (poly) {
    const coords = decodePolyline(poly);
    if (coords.length > 0) {
      const res = coordinatesToSVGPath(coords, 1080, 1080, 120);
      routeSvgPath = res.path;
      routeViewBox = res.viewBox;
    }
  }

  // Extract date labels
  let dateVal = '';
  if (activity.startDate) {
    try {
      dateVal = new Date(activity.startDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      dateVal = activity.startDate.slice(0, 10);
    }
  }

  const sportName = activity.sportType || 'Exercise';
  const sportLabel = sportName.slice(0, 1).toUpperCase() + sportName.slice(1).toLowerCase();

  return {
    type: 'activity',
    title: activity.name || 'Strava Workout',
    subtitle: `${sportLabel} • ${dateVal}`,
    date: dateVal,
    distanceKm,
    duration,
    pace,
    elevationMeters: activity.elevationGainMeters ?? undefined,
    averageHeartRate: activity.averageHeartRate ?? null,
    averageWatts: activity.averageWatts ?? null,
    athleteName,
    routeSvgPath: routeSvgPath || undefined,
    routeViewBox,
    source: 'strava-api',
    dataHealth: activity.dataHealth || []
  };
}

// Convert ReportAggregationResult to standard export payload format
export function mapReportToPayload(
  report: ReportAggregationResult,
  periodTitle: string,
  periodSubtitle: string,
  athleteName: string = 'Athlete'
): ExportCardPayload {
  const distanceKm = report.totalDistanceMeters / 1000;
  const duration = report.totalMovingTimeSeconds;
  const pace = report.averagePaceSecPerKm;

  return {
    type: 'report',
    title: periodTitle,
    subtitle: periodSubtitle,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    distanceKm,
    duration,
    pace,
    elevationMeters: report.totalElevationGainMeters,
    averageHeartRate: report.averageHeartRate,
    activityCount: report.totalActivities,
    activeDays: report.activeDays,
    athleteName,
    source: 'firebase-canonical-activities'
  };
}
