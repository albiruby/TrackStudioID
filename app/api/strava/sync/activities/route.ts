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

    // To implement incremental sync, get the latest activity date
    let afterParam = '';
    
    // Only in page 1 do we want to check and restrict by 'after'
    if (page === 1) {
      const latestActQuery = await adminDb.collection('users').doc(userId).collection('activities')
          .orderBy('startDateLocal', 'desc')
          .limit(1)
          .get();
      if (!latestActQuery.empty) {
          const latestAct = latestActQuery.docs[0].data();
          if (latestAct.startDateLocal) {
              const epoch = Math.floor(new Date(latestAct.startDateLocal).getTime() / 1000);
              // fetch everything since latest activity we have
              afterParam = `&after=${epoch}`;
          }
      }
    }

    // Fetch activities from Strava
    const stravaActivities = await stravaFetch(userId, `/athlete/activities?page=${page}&per_page=${perPage}${afterParam}`);
    
    if (!Array.isArray(stravaActivities)) {
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    if (stravaActivities.length === 0) {
      // Nothing more to sync
      const { saveStravaConnection } = require('../../../../../lib/strava/server');
      await saveStravaConnection(userId, {
          lastSyncAt: new Date().toISOString(),
          lastSyncError: null
      });
      return NextResponse.json({ success: true, count: 0, hasMore: false });
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
    }

    await batch.commit();
    
    // Update lastSyncAt on Strava connection
    const { saveStravaConnection } = require('../../../../../lib/strava/server');
    await saveStravaConnection(userId, {
        lastSyncAt: new Date().toISOString(),
        lastSyncError: null
    });

    return NextResponse.json({ success: true, count: syncedCount, hasMore: stravaActivities.length === perPage });
  } catch (err: any) {
    console.error('Strava Activity Sync Error:', err);
    if (err.message && err.message.includes('Rate Limited')) {
        return NextResponse.json({ error: 'Strava rate limit reached. Try again later.' }, { status: 429 });
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
