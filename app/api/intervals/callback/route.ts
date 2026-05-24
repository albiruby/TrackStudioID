import { NextRequest, NextResponse } from 'next/server';
import { saveIntervalsConnection } from '../../../../lib/intervals/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  let userId = '';
  try {
    const stateObj = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    userId = stateObj.userId;
  } catch(e) {
    return NextResponse.json({ error: 'Invalid state structure' }, { status: 400 });
  }
  
  if (!userId) {
     return NextResponse.json({ error: 'Invalid user in state' }, { status: 400 });
  }

  try {
    const { serverEnv } = require('../../../../lib/env.server');
    const clientId = serverEnv.INTERVALS_CLIENT_ID;
    const clientSecret = serverEnv.INTERVALS_CLIENT_SECRET;
    const redirectUri = serverEnv.INTERVALS_REDIRECT_URI;

    const tokenResponse = await fetch('https://intervals.icu/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri || '',
      }),
    });

    if (!tokenResponse.ok) {
       console.error("Token response error", await tokenResponse.text());
       return NextResponse.json({ error: 'Failed to exchange code' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();

    // Fetch athlete using token to verify
    const verifyResp = await fetch('https://intervals.icu/api/v1/athlete/0', {
       headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    let resolvedAthleteId = '0';
    let athleteName = null;
    
    if (verifyResp.ok) {
        const verifyData = await verifyResp.json();
        resolvedAthleteId = verifyData.id;
        athleteName = verifyData.name;
    }

    await saveIntervalsConnection(userId, {
      provider: 'intervals',
      connected: true,
      authMethod: 'oauth',
      apiKey: null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
      athleteId: resolvedAthleteId,
      athleteName: athleteName,
      lastSyncError: null,
      updatedAt: new Date().toISOString(),
    });

    return new NextResponse(`
      <html>
        <body>
          <p>Intervals.icu connection successful. You can close this window.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/settings';
            }
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  } catch (error: any) {
    console.error('Error in intervals callback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
