import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase/admin';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const htmlResponse = (message: string, isError: boolean = false) => `
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', error: ${isError}, message: "${message}" }, '*');
            window.close();
          } else {
            window.location.href = '/settings';
          }
        </script>
        <p>${message}. This window should close automatically.</p>
      </body>
    </html>
  `;

  if (error) {
    return new NextResponse(htmlResponse(`Strava connection error: ${error}`, true), { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code || !state) {
    return new NextResponse(htmlResponse('Invalid callback parameters', true), { headers: { 'Content-Type': 'text/html' } });
  }

  // Validate state
  const stateDoc = await adminDb.collection('oauth_states').doc(state).get();
  if (!stateDoc.exists) {
    return new NextResponse(htmlResponse('Invalid or expired state parameter', true), { headers: { 'Content-Type': 'text/html' } });
  }

  const userId = stateDoc.data()?.uid;
  await adminDb.collection('oauth_states').doc(state).delete(); // single-use

  if (!userId) {
    return new NextResponse(htmlResponse('Could not identify user from state', true), { headers: { 'Content-Type': 'text/html' } });
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(htmlResponse('Server configuration is missing', true), { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const res = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code'
      })
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error('Strava token exchange failed:', errorData);
      return new NextResponse(htmlResponse('Token exchange failed', true), { headers: { 'Content-Type': 'text/html' } });
    }

    const data = await res.json();

    // Store in Firestore users/{userId}/connections/strava
    await adminDb.collection('users').doc(userId).collection('connections').doc('strava').set({
      provider: 'strava',
      connected: true,
      athleteId: data.athlete.id,
      athleteUsername: data.athlete.username || '',
      athleteFirstname: data.athlete.firstname || '',
      athleteLastname: data.athlete.lastname || '',
      scope: 'read,activity:read_all,profile:read_all',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at, // unix timestamp
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSyncAt: null,
      lastSyncError: null,
      reauthRequired: false
    }, { merge: true });

    // Also update athlete profile to show strava is connected (safe summary)
    await adminDb.collection('users').doc(userId).set({
      stravaConnected: true,
      stravaAthleteId: String(data.athlete.id),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return new NextResponse(htmlResponse('Authentication successful'), { headers: { 'Content-Type': 'text/html' } });

  } catch (err: any) {
    console.error('Error during Strava callback:', err);
    return new NextResponse(htmlResponse(`Server error: ${err.message}`, true), { headers: { 'Content-Type': 'text/html' } });
  }
}
