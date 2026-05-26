import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../lib/firebase/admin';
import { serverEnv } from '../../../../lib/env.server';
import { clientEnv } from '../../../../lib/env.client';

export async function GET(req: NextRequest) {
  const clientId = serverEnv.STRAVA_CLIENT_ID;
  const redirectUri = serverEnv.STRAVA_REDIRECT_URI || `${clientEnv.NEXT_PUBLIC_APP_URL}/api/strava/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'STRAVA_CLIENT_ID is not configured' }, { status: 500 });
  }

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

  const scopes = 'read,activity:read_all,profile:read_all';
  
  // Generate secure stateless state containing userId
  const stateObj = { uid: userId, createdAt: new Date().toISOString() };
  const stateId = Buffer.from(JSON.stringify(stateObj)).toString('base64');

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${encodeURIComponent(scopes)}&state=${stateId}`;

  return NextResponse.json({ url: authUrl });
}

