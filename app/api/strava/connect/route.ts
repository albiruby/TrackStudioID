import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'STRAVA_CLIENT_ID is not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const scopes = 'read,activity:read_all,profile:read_all';
  const state = `uid_${userId}`;

  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${encodeURIComponent(scopes)}&state=${state}`;

  return NextResponse.json({ url: authUrl });
}
