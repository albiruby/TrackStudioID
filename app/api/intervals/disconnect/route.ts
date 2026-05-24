import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebase/admin';
import { saveIntervalsConnection } from '../../../../lib/intervals/server';

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
    } catch (e) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await saveIntervalsConnection(userId, {
      connected: false,
      authMethod: null,
      apiKey: null,
      accessToken: null,
      refreshToken: null,
      athleteId: null,
      athleteName: null,
      tokenExpiresAt: null,
      lastSyncError: null
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting intervals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
