import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../../lib/firebase/admin';
import { getStravaConnection } from '../../../../lib/strava/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const data = await getStravaConnection(userId);
    
    if (!data) {
      return NextResponse.json({ connected: false });
    }

    const scopes = data.scope ? data.scope.split(',') : [];
    const missingScopes = [];
    if (!scopes.includes('activity:read_all')) missingScopes.push('activity:read_all');
    if (!scopes.includes('profile:read_all')) missingScopes.push('profile:read_all');

    const expiresAt = data.expiresAt * 1000;
    const isExpired = Date.now() >= expiresAt;

    return NextResponse.json({
      connected: true,
      athleteId: data.athleteId,
      athleteName: `${data.athleteFirstname} ${data.athleteLastname}`.trim(),
      connectedAt: data.connectedAt,
      lastSyncAt: data.lastSyncAt,
      lastSyncError: data.lastSyncError || null,
      isExpired,
      reauthRequired: !!data.reauthRequired,
      expiresAt: new Date(expiresAt).toISOString(),
      missingScopes: missingScopes.length > 0 ? missingScopes : null,
      scopes: data.scope,
    });
  } catch (err: any) {
    console.error('Strava status error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
