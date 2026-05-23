import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../../lib/firebase/admin';
import { CanonicalActivity, CanonicalLap, CanonicalSplit, CanonicalBestEffort } from '../../../../../data/types';

function computePaceSecPerKm(dist: number | null, time: number | null): number | null {
    if (dist && dist > 0 && time && time > 0) {
        return time / (dist / 1000);
    }
    return null;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let userId = '';
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activityId } = await req.json();
    if (!activityId) {
      return NextResponse.json({ error: 'activityId is required' }, { status: 400 });
    }

    // Load canonical activity
    const activityRef = adminDb.collection('users').doc(userId).collection('activities').doc(activityId);
    const activityDoc = await activityRef.get();
    if (!activityDoc.exists) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const canonicalActivity = activityDoc.data() as CanonicalActivity;

    if (canonicalActivity.source !== 'strava' || !canonicalActivity.externalId) {
       return NextResponse.json({ error: 'Activity is not from Strava' }, { status: 400 });
    }

    if (!canonicalActivity.detailSyncedAt) {
       return NextResponse.json({ error: 'Activity detail sync required.' }, { status: 400 });
    }

    const detailData = canonicalActivity.rawDetailed;
    if (!detailData) {
       return NextResponse.json({ error: 'Activity detail sync required. Raw data missing.' }, { status: 400 });
    }

    const syncedAt = new Date().toISOString();
    const batch = adminDb.batch();
    const updates: Partial<CanonicalActivity> = {
        structuredDataSyncedAt: syncedAt,
        updatedAt: syncedAt,
    };

    // Extract Laps
    if (detailData.laps && Array.isArray(detailData.laps) && detailData.laps.length > 0) {
        const laps: CanonicalLap[] = detailData.laps.map((lap: any) => ({
            activityId,
            lapIndex: lap.lap_index ?? null,
            name: lap.name ?? null,
            distanceMeters: lap.distance ?? null,
            movingTimeSeconds: lap.moving_time ?? null,
            elapsedTimeSeconds: lap.elapsed_time ?? null,
            paceSecPerKm: computePaceSecPerKm(lap.distance, lap.moving_time ?? lap.elapsed_time),
            averageSpeedMps: lap.average_speed ?? null,
            maxSpeedMps: lap.max_speed ?? null,
            averageHeartRate: lap.average_heartrate ?? null,
            maxHeartRate: lap.max_heartrate ?? null,
            averageCadence: lap.average_cadence ?? null,
            averageWatts: lap.average_watts ?? null,
            elevationGainMeters: lap.total_elevation_gain ?? null,
            startIndex: lap.start_index ?? null,
            endIndex: lap.end_index ?? null,
            raw: lap
        }));
        const lapsRef = adminDb.collection('users').doc(userId).collection('laps').doc(activityId);
        batch.set(lapsRef, { activityId, userId, syncedAt, laps });
        updates.hasLaps = true;
    } else {
        updates.hasLaps = false;
    }

    // Extract Splits
    const splits: CanonicalSplit[] = [];
    if (detailData.splits_metric && Array.isArray(detailData.splits_metric)) {
        detailData.splits_metric.forEach((split: any) => {
             splits.push({
                 activityId,
                 splitIndex: split.split ?? null,
                 splitType: 'metric',
                 distanceMeters: split.distance ?? null,
                 elapsedTimeSeconds: split.elapsed_time ?? null,
                 movingTimeSeconds: split.moving_time ?? null,
                 paceSecPerKm: computePaceSecPerKm(split.distance, split.moving_time ?? split.elapsed_time),
                 averageSpeedMps: split.average_speed ?? null,
                 elevationDifferenceMeters: split.elevation_difference ?? null,
                 averageGrade: split.average_grade_adjusted_elevation ?? null, // fallback or similar
                 averageHeartRate: split.average_heartrate ?? null,
                 averageCadence: split.average_cadence ?? null,
                 averageWatts: split.average_watts ?? null,
                 raw: split
             });
        });
    }

    if (detailData.splits_standard && Array.isArray(detailData.splits_standard)) {
        detailData.splits_standard.forEach((split: any) => {
             splits.push({
                 activityId,
                 splitIndex: split.split ?? null,
                 splitType: 'standard',
                 distanceMeters: split.distance ?? null,
                 elapsedTimeSeconds: split.elapsed_time ?? null,
                 movingTimeSeconds: split.moving_time ?? null,
                 paceSecPerKm: computePaceSecPerKm(split.distance, split.moving_time ?? split.elapsed_time),
                 averageSpeedMps: split.average_speed ?? null,
                 elevationDifferenceMeters: split.elevation_difference ?? null,
                 averageGrade: null, // usually not provided exactly like this, keep null if not found
                 averageHeartRate: split.average_heartrate ?? null,
                 averageCadence: split.average_cadence ?? null,
                 averageWatts: split.average_watts ?? null,
                 raw: split
             });
        });
    }
    
    if (splits.length > 0) {
        const splitsRef = adminDb.collection('users').doc(userId).collection('splits').doc(activityId);
        batch.set(splitsRef, { activityId, userId, syncedAt, splits });
        updates.hasSplits = true;
    } else {
        updates.hasSplits = false;
    }


    // Extract Best Efforts
    if (detailData.best_efforts && Array.isArray(detailData.best_efforts) && detailData.best_efforts.length > 0) {
        const bestEfforts: CanonicalBestEffort[] = detailData.best_efforts.map((be: any) => ({
            activityId,
            name: be.name ?? null,
            distanceMeters: be.distance ?? null,
            elapsedTimeSeconds: be.elapsed_time ?? null,
            movingTimeSeconds: be.moving_time ?? null,
            paceSecPerKm: computePaceSecPerKm(be.distance, be.moving_time ?? be.elapsed_time),
            startDate: be.start_date ?? null,
            startIndex: be.start_index ?? null,
            endIndex: be.end_index ?? null,
            // Strava best effort may not directly have avg HR, max HR. Check structure
            averageHeartRate: be.average_heartrate ?? null, 
            maxHeartRate: be.max_heartrate ?? null,
            raw: be
        }));
        
        const bestEffortsRef = adminDb.collection('users').doc(userId).collection('bestEfforts').doc(activityId);
        batch.set(bestEffortsRef, { activityId, userId, syncedAt, bestEfforts });
        updates.hasBestEfforts = true;
    } else {
        updates.hasBestEfforts = false;
    }

    batch.set(activityRef, updates, { merge: true });
    
    await batch.commit();

    return NextResponse.json({ 
        success: true, 
        lapsCount: updates.hasLaps ? detailData.laps?.length : 0,
        splitsCount: splits.length,
        bestEffortsCount: updates.hasBestEfforts ? detailData.best_efforts?.length : 0
    });

  } catch (error: any) {
    console.error('Strava structured data sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
