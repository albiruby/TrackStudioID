import { NextRequest, NextResponse } from 'next/server';
import { getSafeIntervalsStatus } from '../../../../lib/intervals/status';
import { adminAuth } from '../../../../lib/firebase/admin';

export async function GET(req: NextRequest) {
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
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSafeIntervalsStatus(userId);
    const hasOAuth = !!(process.env.INTERVALS_CLIENT_ID && process.env.INTERVALS_CLIENT_SECRET && process.env.INTERVALS_REDIRECT_URI);

    return NextResponse.json({ ...status, hasOAuth });
  } catch (error: any) {
    console.error('Error fetching intervals status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
