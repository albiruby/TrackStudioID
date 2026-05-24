import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../../lib/firebase/admin';
import { getSafeStravaStatus } from '../../../../../lib/strava/server';
import { CanonicalActivity } from '../../../../../data/types';
import { stravaFetch } from '../../../../../lib/strava/server'; // We need this or we can implement inline token refresh if it doesn't exist

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

    // Load connection
    const stravaStatus = await getSafeStravaStatus(userId);
    if (!stravaStatus.connected) {
      return NextResponse.json({ error: 'Strava not connected' }, { status: 400 });
    }

    // Load canonical activity
    const activityDoc = await adminDb.collection('users').doc(userId).collection('activities').doc(activityId).get();
    if (!activityDoc.exists) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const canonicalActivity = activityDoc.data() as CanonicalActivity;

    if (canonicalActivity.source !== 'strava' || !canonicalActivity.externalId) {
      return NextResponse.json({ error: 'Activity is not from Strava' }, { status: 400 });
    }

    // Fetch detail from strava
    let detailData;
    try {
        detailData = await stravaFetch(userId, `/activities/${canonicalActivity.externalId}`);
    } catch (apiError: any) {
        let msg = 'Failed to fetch detailed activity';
        return NextResponse.json({ error: apiError.message || msg }, { status: 500 });
    }
    
    // Map detailed fields
    const updates: Partial<CanonicalActivity> = {
        updatedAt: new Date().toISOString(),
        detailSyncedAt: new Date().toISOString(),
        rawDetailed: detailData,
    };
    
    if (detailData.description != null) updates.description = detailData.description;
    if (detailData.calories != null) updates.calories = detailData.calories;
    if (detailData.perceived_exertion != null) updates.perceivedExertion = detailData.perceived_exertion;
    if (detailData.suffer_score != null) updates.sufferScore = detailData.suffer_score;
    
    if (detailData.average_heartrate != null) updates.averageHeartRate = detailData.average_heartrate;
    if (detailData.max_heartrate != null) updates.maxHeartRate = detailData.max_heartrate;
    if (detailData.average_cadence != null) updates.cadenceAvg = detailData.average_cadence;
    
    if (detailData.average_watts != null) updates.averageWatts = detailData.average_watts;
    if (detailData.max_watts != null) updates.maxWatts = detailData.max_watts;
    if (detailData.weighted_average_watts != null) updates.weightedAverageWatts = detailData.weighted_average_watts;
    if (detailData.kilojoules != null) updates.kilojoules = detailData.kilojoules;
    if (detailData.device_watts != null) updates.deviceWatts = detailData.device_watts;
    
    if (detailData.total_elevation_gain != null) updates.elevationGainMeters = detailData.total_elevation_gain;
    if (detailData.elev_high != null) updates.elevHigh = detailData.elev_high;
    if (detailData.elev_low != null) updates.elevLow = detailData.elev_low;

    if (detailData.start_latlng != null) updates.startLatlng = detailData.start_latlng;
    if (detailData.end_latlng != null) updates.endLatlng = detailData.end_latlng;
    
    // Merge maps safely
    if (detailData.map) {
        if (detailData.map.polyline) updates.polyline = detailData.map.polyline;
        if (detailData.map.summary_polyline) updates.summaryPolyline = detailData.map.summary_polyline;
    }
    
    if (detailData.gear != null) updates.gearId = detailData.gear.id;
    if (detailData.splits_metric != null) updates.splitsMetric = detailData.splits_metric;
    if (detailData.splits_standard != null) updates.splitsStandard = detailData.splits_standard;
    if (detailData.segment_efforts != null) updates.segmentEfforts = detailData.segment_efforts;
    if (detailData.laps != null) updates.laps = detailData.laps;
    if (detailData.best_efforts != null) updates.bestEfforts = detailData.best_efforts;

    // Apply updates safely
    await activityDoc.ref.set(updates, { merge: true });

    return NextResponse.json({ success: true, updates });

  } catch (error: any) {
    console.error('Strava detail sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
