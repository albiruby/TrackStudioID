import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebase/admin';
import { getSafeStravaStatus } from '../../../../lib/strava/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const data = await getSafeStravaStatus(userId);
    
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Strava status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

