import { adminDb } from '../firebase/admin';
import { StravaConnection, StravaTokenResponse } from './types';

function getStravaAuthCollection(userId: string) {
  return adminDb.collection('users').doc(userId).collection('connections').doc('strava');
}

export async function getSafeStravaStatus(userId: string) {
  const doc = await getStravaAuthCollection(userId).get();
  if (!doc.exists) {
    return {
      connected: false,
      reauthRequired: false,
      isExpired: false,
      lastSyncAt: null,
      lastSyncError: null,
    };
  }
  const data = doc.data() as StravaConnection;
  return {
    connected: data.connected !== false,
    reauthRequired: !!data.reauthRequired,
    isExpired: (data.expiresAt * 1000) < Date.now(),
    athleteName: data.athleteFirstname ? `${data.athleteFirstname} ${data.athleteLastname || ''}`.trim() : data.athleteUsername,
    lastSyncAt: data.lastSyncAt || null,
    lastSyncError: data.lastSyncError || null,
    scopes: data.scope,
  };
}

export async function getStravaConnection(userId: string): Promise<StravaConnection | null> {
  const doc = await getStravaAuthCollection(userId).get();
  if (!doc.exists) return null;
  return doc.data() as StravaConnection;
}

export async function saveStravaConnection(userId: string, data: Partial<StravaConnection>) {
  await getStravaAuthCollection(userId).set({
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function refreshStravaTokenIfNeeded(userId: string): Promise<string> {
  const conn = await getStravaConnection(userId);
  if (!conn) throw new Error('Not Connected');
  if (conn.reauthRequired) throw new Error('Reauthorization Required');

  // Buffer of 5 minutes (300 seconds)
  const now = Math.floor(Date.now() / 1000);
  if (conn.expiresAt > now + 300) {
    return conn.accessToken; // Still valid
  }

  // Need to refresh
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Server configuration is missing');
  }

  try {
    const res = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: conn.refreshToken
      })
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error('Strava refresh error:', errText);
        // if bad refresh token, mark reauth required
        await saveStravaConnection(userId, { reauthRequired: true, lastSyncError: 'Token refresh failed' });
        throw new Error('Reauthorization Required');
    }

    const data: StravaTokenResponse = await res.json();
    
    await saveStravaConnection(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      reauthRequired: false,
      lastSyncError: null
    });

    return data.access_token;
  } catch (err: any) {
    throw err;
  }
}

export async function stravaFetch(userId: string, endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await refreshStravaTokenIfNeeded(userId);
    
    const url = endpoint.startsWith('http') ? endpoint : `https://www.strava.com/api/v3${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    });

    if (res.status === 401) {
        // Token expired? might have been revoked
        await saveStravaConnection(userId, { reauthRequired: true, lastSyncError: 'Unauthorized API call' });
        throw new Error('Reauthorization Required');
    }

    if (res.status === 429) {
        await saveStravaConnection(userId, { lastSyncError: 'API Rate Limited' });
        throw new Error('API Rate Limited');
    }

    if (!res.ok) {
        const errText = await res.text();
        await saveStravaConnection(userId, { lastSyncError: `Strava API Error: ${res.status}` });
        throw new Error(`Strava API Error: ${res.status}`);
    }

    return res.json();
}
