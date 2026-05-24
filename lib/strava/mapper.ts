import { CanonicalActivity } from '../../data/types';

export function mapStravaActivityToLocalSchema(userId: string, raw: any): CanonicalActivity | null {
  if (!raw || !raw.id) return null;

  const externalId = String(raw.id);
  const dataHealth: string[] = [];

  // Parse dates safely
  let startDate = '';
  let startDateLocal = '';
  if (raw.start_date) {
    const d = new Date(raw.start_date);
    if (!isNaN(d.getTime())) startDate = d.toISOString();
    else dataHealth.push('missingDate');
  } else {
    dataHealth.push('missingDate');
  }

  if (raw.start_date_local) {
    const d = new Date(raw.start_date_local);
    if (!isNaN(d.getTime())) startDateLocal = d.toISOString();
  }

  // Core metrics
  const distanceMeters = raw.distance ?? null;
  const movingTimeSeconds = raw.moving_time ?? null;
  const elapsedTimeSeconds = raw.elapsed_time ?? null;

  if (distanceMeters === null || distanceMeters === undefined) dataHealth.push('missingDistance');
  if (movingTimeSeconds === null || movingTimeSeconds === undefined) dataHealth.push('missingMovingTime');

  let averagePaceSecPerKm: number | null = null;
  if (movingTimeSeconds > 0 && distanceMeters > 0) {
     averagePaceSecPerKm = movingTimeSeconds / (distanceMeters / 1000);
  } else if (raw.average_speed && raw.average_speed > 0) {
     // speed is m/s
     averagePaceSecPerKm = 1000 / raw.average_speed;
  } else {
     dataHealth.push('missingPace');
  }

  const hasSummaryPolyline = !!(raw.map && raw.map.summary_polyline);
  const hasLatlng = !!(raw.start_latlng && raw.start_latlng.length > 0);
  const hasGps = hasSummaryPolyline || hasLatlng;
  if (!hasGps) dataHealth.push('missingGps');

  const hasHeartRate = raw.has_heartrate === true || raw.average_heartrate !== undefined;
  if (!hasHeartRate) dataHealth.push('missingHeartRate');

  const hasPower = raw.device_watts === true || raw.average_watts !== undefined;
  if (!hasPower) dataHealth.push('missingPower');

  const hasCadence = raw.average_cadence !== undefined;
  if (!hasCadence) dataHealth.push('missingCadence');

  if (dataHealth.length > 0) {
     dataHealth.push('partialData');
  }

  const canonical: CanonicalActivity = {
    id: externalId,
    userId,
    externalId,
    source: 'strava',
    syncedAt: new Date().toISOString(),
    
    name: raw.name || 'Untitled Activity',
    sportType: raw.sport_type || raw.type || 'Unspecified',
    distanceMeters: distanceMeters ?? 0,
    movingTimeSeconds: movingTimeSeconds ?? 0,
    elapsedTimeSeconds: elapsedTimeSeconds ?? 0,
    startDate: startDate || '',
    startDateLocal: startDateLocal || startDate || '',
    timezone: raw.timezone,
    
    averagePaceSecPerKm,
    averageSpeed: raw.average_speed ?? undefined,
    maxSpeed: raw.max_speed ?? undefined,
    
    averageHeartRate: raw.average_heartrate ?? undefined,
    maxHeartRate: raw.max_heartrate ?? undefined,
    hasHeartRate,
    
    averageWatts: raw.average_watts ?? undefined,
    maxWatts: raw.max_watts ?? undefined,
    weightedAverageWatts: raw.weighted_average_watts ?? undefined,
    deviceWatts: raw.device_watts ?? false,
    hasPower,
    
    cadenceAvg: raw.average_cadence ?? undefined,
    hasCadence,
    
    kilojoules: raw.kilojoules ?? undefined,
    calories: raw.calories ?? undefined,
    
    elevationGainMeters: raw.total_elevation_gain ?? undefined,
    
    summaryPolyline: raw.map?.summary_polyline ?? undefined,
    startLatlng: raw.start_latlng,
    endLatlng: raw.end_latlng,
    hasGps,
    
    gearId: raw.gear_id ?? undefined,
    kudosCount: raw.kudos_count ?? undefined,
    commentCount: raw.comment_count ?? undefined,
    deviceName: raw.device_name ?? undefined,
    
    dataHealth,
    raw
  };

  return canonical;
}
