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

    // Load connection doc securely (we need tokens)
    const connDoc = await adminDb.collection('users').doc(userId).collection('connections').doc('strava').get();
    if (!connDoc.exists) {
       return NextResponse.json({ error: 'Strava connection not found' }, { status: 404 });
    }
    let connection = connDoc.data();
    
    // Check token, refresh if needed
    if (connection?.expiresAt && connection.expiresAt * 1000 < Date.now()) {
        const refreshRes = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: connection.refreshToken,
            })
        });
        if (!refreshRes.ok) {
            await connDoc.ref.update({ reauthRequired: true });
            return NextResponse.json({ error: 'Strava reauth required' }, { status: 401 });
        }
        const freshTokens = await refreshRes.json();
        const updates = {
            accessToken: freshTokens.access_token,
            refreshToken: freshTokens.refresh_token,
            expiresAt: freshTokens.expires_at,
            reauthRequired: false
        };
        await connDoc.ref.update(updates);
        connection = { ...connection, ...updates };
    }
    
    const accessToken = connection?.accessToken;
    if (!accessToken) {
       return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
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
    const res = await fetch(`https://www.strava.com/api/v3/activities/${canonicalActivity.externalId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        let msg = 'Failed to fetch detailed activity';
        if (res.status === 401 || res.status === 403) msg = 'Strava API authentication failed';
        else if (res.status === 404) msg = 'Activity not found on Strava';
        return NextResponse.json({ error: msg }, { status: res.status });
    }

    const detailData = await res.json();
    
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
        updates.map = {
             ...(canonicalActivity.map || {}),
             ...(detailData.map.polyline ? { polyline: detailData.map.polyline } : {}),
             ...(detailData.map.summary_polyline ? { summary_polyline: detailData.map.summary_polyline } : {})
        };
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
