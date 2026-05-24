import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '../../../../lib/env.server';

export async function GET(req: NextRequest) {
  const clientId = serverEnv.INTERVALS_CLIENT_ID;
  const redirectUri = serverEnv.INTERVALS_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Intervals.icu OAuth is not configured' }, { status: 500 });
  }

  const userId = req.nextUrl.searchParams.get('userId');
  if(!userId) {
     return NextResponse.json({ error: 'userId is required' }, { status: 400 }); 
  }

  const state = Math.random().toString(36).substring(7);
  const stateObj = { userId, nonce: state };
  const stateStr = Buffer.from(JSON.stringify(stateObj)).toString('base64');
  
  const authUrl = new URL('https://intervals.icu/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'ACTIVITY:READ WELLNESS:READ CALENDAR:READ ATHLETE:READ');
  authUrl.searchParams.set('state', stateStr);

  return NextResponse.redirect(authUrl.toString());
}
