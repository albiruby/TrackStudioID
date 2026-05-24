import { saveIntervalsConnection } from './server';
import { IntervalsConnection } from './types';

export async function refreshIntervalsTokenIfNeeded(userId: string, connection: IntervalsConnection): Promise<string> {
  if (connection.authMethod !== 'oauth' || !connection.accessToken) {
    throw new Error('Not an OAuth connection');
  }

  // Refresh 5 minutes early
  if (connection.tokenExpiresAt && Date.now() / 1000 > connection.tokenExpiresAt - 300) {
    if (!connection.refreshToken) throw new Error('No refresh token available');

    // This requires backend Intervals client credentials in env vars
    // For now we just implement the stub
    /*
    const response = await fetch('https://intervals.icu/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INTERVALS_CLIENT_ID || '',
        client_secret: process.env.INTERVALS_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken
      })
    });
    if (!response.ok) {
       await saveIntervalsConnection(userId, { connected: false, lastSyncError: 'OAuth token refresh failed' });
       throw new Error('Token refresh failed');
    }
    const data = await response.json();
    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token || connection.refreshToken;
    const newExpiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

    await saveIntervalsConnection(userId, {
       accessToken: newAccessToken,
       refreshToken: newRefreshToken,
       tokenExpiresAt: newExpiresAt,
       lastSyncError: null
    });
    return newAccessToken;
    */
    return connection.accessToken; 
  }
  
  return connection.accessToken;
}
