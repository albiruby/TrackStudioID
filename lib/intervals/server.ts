import { adminDb } from '../firebase/admin';
import { IntervalsConnection, SafeIntervalsStatus } from './types';
import { refreshIntervalsTokenIfNeeded } from './auth';

export async function getIntervalsConnection(userId: string): Promise<IntervalsConnection | null> {
  try {
    const doc = await adminDb.collection('users').doc(userId).collection('connections').doc('intervals').get();
    if (!doc.exists) return null;
    return doc.data() as IntervalsConnection;
  } catch (e) {
    console.error('Error fetching intervals connection', e);
    return null;
  }
}

export async function saveIntervalsConnection(userId: string, data: Partial<IntervalsConnection>): Promise<void> {
  const docRef = adminDb.collection('users').doc(userId).collection('connections').doc('intervals');
  await docRef.set({
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function markIntervalsConnectionError(userId: string, error: string): Promise<void> {
  await saveIntervalsConnection(userId, { lastSyncError: error });
}

export async function intervalsFetch(userId: string, endpoint: string, options: RequestInit = {}): Promise<Response> {
  const connection = await getIntervalsConnection(userId);
  if (!connection || !connection.connected) {
    throw new Error('Intervals.icu not connected');
  }

  let headers: HeadersInit = { ...options.headers };

  if (connection.authMethod === 'oauth') {
    const token = await refreshIntervalsTokenIfNeeded(userId, connection);
    headers = { ...headers, Authorization: `Bearer ${token}` };
  } else if (connection.authMethod === 'api_key' && connection.apiKey) {
    headers = { ...headers, Authorization: `Basic ${Buffer.from(`API_KEY:${connection.apiKey}`).toString('base64')}` };
  } else {
    throw new Error('Invalid authentication method for Intervals.icu');
  }

  const url = `https://intervals.icu/api/v1${endpoint}`;
  return fetch(url, { ...options, headers });
}
