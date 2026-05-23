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
    const res = await fetch(`https://www.strava.com/api/v3/activities/${canonicalActivity.externalId}/streams?keys=${keys}&key_by_type=true`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
        let msg = 'Failed to fetch streams';
        if (res.status === 401 || res.status === 403) msg = 'Strava API authentication failed';
        else if (res.status === 404) msg = 'Streams not found on Strava';
        return NextResponse.json({ error: msg }, { status: res.status });
    }

    const streamsData = await res.json();
    
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

    // Update activity doc
    const activityUpdates: Partial<CanonicalActivity> = {
        streamsSyncedAt: new Date().toISOString(),
        hasStreams: streamKeysAvailable.length > 0,
        streamKeysAvailable,
        updatedAt: new Date().toISOString()
    };
    await activityRef.set(activityUpdates, { merge: true });

    return NextResponse.json({ success: true, streamKeysAvailable });

  } catch (error: any) {
    console.error('Strava streams sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
