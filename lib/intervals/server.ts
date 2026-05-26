import * as admin from 'firebase-admin';
import { adminDb } from '../firebase/admin';
import { IntervalsConnection, SafeIntervalsStatus } from './types';
import { refreshIntervalsTokenIfNeeded } from './auth';
import { fetchFirestoreREST } from '../firebase/rest-utils';

export async function getIntervalsConnection(userId: string): Promise<IntervalsConnection | null> {
  let publicData: any = null;
  let privData: any = null;

  try {
    const [doc, privDoc] = await Promise.all([
      adminDb.collection('users').doc(userId).collection('connections').doc('intervals').get(),
      adminDb.collection('users').doc(userId).collection('privateConnections').doc('intervals').get()
    ]);
    
    if (doc.exists) publicData = doc.data();
    if (privDoc.exists) privData = privDoc.data();
  } catch (e) {
    console.warn('[Admin SDK Info] falling back to Firestore REST for getIntervalsConnection');
    try {
      const [doc, privDoc] = await Promise.all([
        fetchFirestoreREST('GET', `users/${userId}/connections/intervals`),
        fetchFirestoreREST('GET', `users/${userId}/privateConnections/intervals`)
      ]);
      publicData = doc;
      privData = privDoc;
    } catch (restErr: any) {
      console.error('Firestore REST also failed in getIntervalsConnection:', restErr.message);
    }
  }

  if (!publicData) return null;
  
  // Proactive Security Migration: Move tokens to private collection if they are stored in the public doc
  if (publicData.apiKey || publicData.accessToken || publicData.refreshToken) {
      console.log(`[Security] Migrating legacy leaked Intervals tokens for user ${userId}`);
      await saveIntervalsConnection(userId, { ...publicData, ...(privData || {}) } as IntervalsConnection);
  }
  
  return {
    ...publicData,
    ...(privData || {})
  } as IntervalsConnection;
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

  try {
    const promises = [];
    promises.push(adminDb.collection('users').doc(userId).collection('connections').doc('intervals').set(publicData, { merge: true }));
    
    if (Object.keys(privateData).length > 1) {
      promises.push(adminDb.collection('users').doc(userId).collection('privateConnections').doc('intervals').set(privateData, { merge: true }));
    }
    
    await Promise.all(promises);
  } catch (e) {
    console.warn('[Admin SDK Info] falling back to Firestore REST for saveIntervalsConnection');
    try {
      // Remove Admin FieldValue.delete() sentinel before serializing to REST
      const cleanPublicData = { ...publicData };
      privateKeys.forEach(key => {
        delete cleanPublicData[key];
      });

      const promises = [];
      promises.push(fetchFirestoreREST('POST', `users/${userId}/connections/intervals`, cleanPublicData));
      if (Object.keys(privateData).length > 1) {
        promises.push(fetchFirestoreREST('POST', `users/${userId}/privateConnections/intervals`, privateData));
      }
      await Promise.all(promises);
    } catch (restErr: any) {
      console.error('Firestore REST also failed in saveIntervalsConnection:', restErr.message);
      throw restErr;
    }
  }
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
