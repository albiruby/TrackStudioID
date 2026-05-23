import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    await adminDb.collection('users').doc(userId).collection('privateConnections').doc('strava').delete();

    await adminDb.collection('users').doc(userId).set({
      stravaConnected: false,
      stravaAthleteId: null,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Strava disconnect error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
