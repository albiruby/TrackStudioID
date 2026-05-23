import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../../lib/firebase/admin';
import { stravaFetch } from '../../../../../lib/strava/server';
import { mapStravaActivityToLocalSchema } from '../../../../../lib/strava/mapper';
import { CanonicalActivity } from '../../../../../data/types';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const urlParams = new URL(req.url).searchParams;
    const page = parseInt(urlParams.get('page') || '1');
    const perPage = parseInt(urlParams.get('per_page') || '30');

    // Fetch activities from Strava
    const stravaActivities = await stravaFetch(userId, `/athlete/activities?page=${page}&per_page=${perPage}`);
    
    if (!Array.isArray(stravaActivities)) {
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const collectionRef = adminDb.collection('users').doc(userId).collection('activities');
    const batch = adminDb.batch();
    
    let syncedCount = 0;

    for (const raw of stravaActivities) {
        const canonical = mapStravaActivityToLocalSchema(userId, raw);
        if (!canonical) continue;
        
        // id is either externalId or fallback
        const _id = String(canonical.id || raw.id);
        const docRef = collectionRef.doc(_id);
        batch.set(docRef, canonical, { merge: true });
        syncedCount++;
        
        // Firestore batches can only process 500 ops, so limit if needed. 
        // 30 per_page is safe here.
    }

    await batch.commit();
    
    // Update lastSyncAt on Strava connection
    await adminDb.collection('users').doc(userId).collection('privateConnections').doc('strava').set({
        lastSyncAt: new Date().toISOString(),
        lastSyncError: null
    }, { merge: true });

    return NextResponse.json({ success: true, count: syncedCount });
  } catch (err: any) {
    console.error('Strava Activity Sync Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
