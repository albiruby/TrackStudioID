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

    const { athleteId, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const targetAthleteId = athleteId || '0';

    // Verify credentials
    const url = `https://intervals.icu/api/v1/athlete/${targetAthleteId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Invalid API key or athlete ID' }, { status: 400 });
    }

    const athleteData = await response.json();
    const resolvedAthleteId = athleteData.id || targetAthleteId;
    const athleteName = athleteData.name || null;

    await saveIntervalsConnection(userId, {
      provider: 'intervals',
      connected: true,
      authMethod: 'api_key',
      athleteId: resolvedAthleteId,
      athleteName: athleteName,
      apiKey: apiKey,
      lastSyncError: null,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, athleteId: resolvedAthleteId, athleteName });
  } catch (error: any) {
    console.error('Error connecting intervals api key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
