import * as admin from 'firebase-admin';
import { adminDb } from '../firebase/admin';
import { IntervalsConnection, SafeIntervalsStatus } from './types';
import { refreshIntervalsTokenIfNeeded } from './auth';

export async function getIntervalsConnection(userId: string): Promise<IntervalsConnection | null> {
  let docExists = false;
  let docData: any = {};
  let privDocExists = false;
  let privDocData: any = {};

  try {
    const doc = await adminDb.collection('users').doc(userId).collection('connections').doc('intervals').get();
    docExists = doc.exists;
    docData = doc.data() || {};
  } catch (err: any) {
    if (err.code === 5 || err.code === 7 || err.message?.includes('NOT_FOUND') || err.message?.includes('Missing or insufficient permissions')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Debug] Intervals connection doc missing for user ${userId}`);
      }
      return null;
    }
    console.error('Error fetching intervals connection', err);
    return null;
  }
  
  if (!docExists) return null;

  try {
    const privDoc = await adminDb.collection('users').doc(userId).collection('privateConnections').doc('intervals').get();
    privDocExists = privDoc.exists;
    privDocData = privDoc.data() || {};
  } catch (err: any) {
    // Ignore private missing doc
  }
  
  const publicData = docData as Partial<IntervalsConnection>;
  
  // Proactive Security Migration: Move tokens to private collection if they are stored in the public doc
  if (publicData.apiKey || publicData.accessToken || publicData.refreshToken) {
      console.log(`[Security] Migrating legacy leaked Intervals tokens for user ${userId}`);
      await saveIntervalsConnection(userId, { ...publicData, ...privDocData } as IntervalsConnection);
  }
  
  return {
    ...publicData,
    ...privDocData
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
