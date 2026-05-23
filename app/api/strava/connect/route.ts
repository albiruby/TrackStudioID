import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../lib/firebase/admin';

export async function GET(req: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`;

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
  
  // Generate secure state
  const stateId = crypto.randomUUID();
  await adminDb.collection('oauth_states').doc(stateId).set({
    uid: userId,
    createdAt: new Date().toISOString()
  });

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${encodeURIComponent(scopes)}&state=${stateId}`;

  return NextResponse.json({ url: authUrl });
}

