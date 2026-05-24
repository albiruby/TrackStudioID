import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../../lib/firebase/admin';
import { getSafeStravaStatus } from '../../../../../lib/strava/server';
import { CanonicalActivity, CanonicalActivityStream } from '../../../../../data/types';

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
    const activityRef = adminDb.collection('users').doc(userId).collection('activities').doc(activityId);
    const activityDoc = await activityRef.get();
    if (!activityDoc.exists) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const canonicalActivity = activityDoc.data() as CanonicalActivity;

    if (canonicalActivity.source !== 'strava' || !canonicalActivity.externalId) {
      return NextResponse.json({ error: 'Activity is not from Strava' }, { status: 400 });
    }

    // Request stream keys
    const keys = 'time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,grade_smooth';
    
    let streamsData;
    try {
        const { stravaFetch } = require('../../../../../lib/strava/server');
        streamsData = await stravaFetch(userId, `/activities/${canonicalActivity.externalId}/streams?keys=${keys}&key_by_type=true`);
    } catch (apiError: any) {
        let msg = 'Failed to fetch streams';
        return NextResponse.json({ error: apiError.message || msg }, { status: 500 });
    }
    
    // Map streams
    const streamKeysAvailable = Object.keys(streamsData);
    
    const stream: CanonicalActivityStream = {
        activityId,
        userId,
        source: 'strava',
        time: streamsData.time?.data || null,
        distance: streamsData.distance?.data || null,
        latlng: streamsData.latlng?.data || null,
        altitude: streamsData.altitude?.data || null,
        velocitySmooth: streamsData.velocity_smooth?.data || null,
        heartrate: streamsData.heartrate?.data || null,
        cadence: streamsData.cadence?.data || null,
        watts: streamsData.watts?.data || null,
        temp: streamsData.temp?.data || null,
        gradeSmooth: streamsData.grade_smooth?.data || null,
        raw: streamsData,
        syncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    // Store in users/{userId}/activityStreams/{activityId}
    await adminDb.collection('users').doc(userId).collection('activityStreams').doc(activityId).set(stream);

    let computedAvgHr: number | undefined;
    let computedMaxHr: number | undefined;
    if (streamsData.heartrate?.data && streamsData.heartrate.data.length > 0) {
        let sum = 0;
        let count = 0;
        let max = 0;
        for (const hr of streamsData.heartrate.data) {
            if (hr > 0) {
                sum += hr;
                count++;
                if (hr > max) max = hr;
            }
        }
        if (count > 0) {
            computedAvgHr = sum / count;
            computedMaxHr = max;
        }
    }

    let computedAvgWatts: number | undefined;
    let computedMaxWatts: number | undefined;
    if (streamsData.watts?.data && streamsData.watts.data.length > 0) {
        let sum = 0;
        let count = 0;
        let max = 0;
        for (const watt of streamsData.watts.data) {
            if (watt > 0) {
                sum += watt;
                count++;
                if (watt > max) max = watt;
            }
        }
        if (count > 0) {
            computedAvgWatts = sum / count;
            computedMaxWatts = max;
        }
    }

    // Update activity doc
    const activityUpdates: Partial<CanonicalActivity> = {
        streamsSyncedAt: new Date().toISOString(),
        hasStreams: streamKeysAvailable.length > 0,
        streamKeysAvailable,
        ...(computedAvgHr ? { averageHeartRate: computedAvgHr, maxHeartRate: computedMaxHr, hasHeartRate: true } : {}),
        ...(computedAvgWatts ? { averageWatts: computedAvgWatts, maxWatts: computedMaxWatts, hasPower: true } : {}),
        updatedAt: new Date().toISOString()
    };
    await activityRef.set(activityUpdates, { merge: true });

    return NextResponse.json({ success: true, streamKeysAvailable });

  } catch (error: any) {
    console.error('Strava streams sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
