import * as admin from 'firebase-admin';
import { adminDb } from '../firebase/admin';
import { IntervalsConnection, SafeIntervalsStatus } from './types';
import { refreshIntervalsTokenIfNeeded } from './auth';

export async function getIntervalsConnection(userId: string): Promise<IntervalsConnection | null> {
  try {
    const [doc, privDoc] = await Promise.all([
      adminDb.collection('users').doc(userId).collection('connections').doc('intervals').get(),
      adminDb.collection('users').doc(userId).collection('privateConnections').doc('intervals').get()
    ]);
    
    if (!doc.exists) return null;
    
    const publicData = doc.data() as Partial<IntervalsConnection>;
    
    // Proactive Security Migration: Move tokens to private collection if they are stored in the public doc
    if (publicData.apiKey || publicData.accessToken || publicData.refreshToken) {
        console.log(`[Security] Migrating legacy leaked Intervals tokens for user ${userId}`);
        await saveIntervalsConnection(userId, { ...publicData, ...(privDoc.exists ? privDoc.data() : {}) } as IntervalsConnection);
    }
    
    return {
      ...publicData,
      ...(privDoc.exists ? privDoc.data() : {})
    } as IntervalsConnection;
  } catch (e) {
    console.error('Error fetching intervals connection', e);
    return null;
  }
}

export async function saveIntervalsConnection(userId: string, data: Partial<IntervalsConnection>): Promise<void> {
  const now = new Date().toISOString();
  const publicData: any = { updatedAt: now };
  const privateData: any = { updatedAt: now };
  
  const privateKeys = ['apiKey', 'accessToken', 'refreshToken', 'tokenExpiresAt'];
  
  Object.keys(data).forEach(key => {
    if (privateKeys.includes(key)) {
      privateData[key] = (data as any)[key];
    } else {
      publicData[key] = (data as any)[key];
    }
  });

  // Ensure public doc explicitly deletes leaked private keys
  privateKeys.forEach(key => {
    publicData[key] = admin.firestore.FieldValue.delete();
  });

  const promises = [];
  promises.push(adminDb.collection('users').doc(userId).collection('connections').doc('intervals').set(publicData, { merge: true }));
  
  if (Object.keys(privateData).length > 1) {
    promises.push(adminDb.collection('users').doc(userId).collection('privateConnections').doc('intervals').set(privateData, { merge: true }));
  }
  
  await Promise.all(promises);
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
