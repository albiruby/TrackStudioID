// Lightweight Firestore REST API utilities to bypass GCP IAM Permission Denied issues in the Cloud Run sandbox.
// It uses the user's actual Firebase ID Token (JWT) retrieved from current request headers,
// which is evaluated successfully by Firestore Security Rules.

import { headers } from 'next/headers';
import appletConfig from '../../firebase-applet-config.json';

export function fromFirestoreFormat(doc: any): any {
  if (!doc || !doc.fields) return null;
  const result: any = {};
  for (const [key, valueObj] of Object.entries(doc.fields)) {
    result[key] = unwrapValue(valueObj);
  }
  return result;
}

function unwrapValue(valObj: any): any {
  if (!valObj) return null;
  const key = Object.keys(valObj)[0];
  const value = valObj[key];
  if (key === 'mapValue') {
    return fromFirestoreFormat(value);
  } else if (key === 'arrayValue') {
    const list = value.values || [];
    return list.map((val: any) => unwrapValue(val));
  } else if (key === 'integerValue') {
    return parseInt(value, 10);
  } else if (key === 'doubleValue') {
    return parseFloat(value);
  } else if (key === 'booleanValue') {
    return value;
  } else {
    return value; // stringValue, nullValue, timestampValue, etc.
  }
}

export function toFirestoreFormat(obj: any): any {
  const fields: any = {};
  for (const [key, val] of Object.entries(obj)) {
    // Skip undefined or Firestore SentinelFieldValue equivalents
    if (val === undefined) continue;
    const wrapped = wrapValue(val);
    if (wrapped !== undefined) {
      fields[key] = wrapped;
    }
  }
  return { fields };
}

function wrapValue(val: any): any {
  if (val === null) {
    return { nullValue: null };
  }
  const type = typeof val;
  if (type === 'string') {
    return { stringValue: val };
  } else if (type === 'boolean') {
    return { booleanValue: val };
  } else if (type === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    } else {
      return { doubleValue: val };
    }
  } else if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(v => wrapValue(v))
      }
    };
  } else if (type === 'object') {
    return { mapValue: toFirestoreFormat(val) };
  }
  return undefined;
}

export async function fetchFirestoreREST(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', docPath: string, data?: any) {
  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get('authorization') || reqHeaders.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized Firestore REST access: Missing ID Token');
    }
    const token = authHeader.split('Bearer ')[1];

    const projectId = appletConfig.projectId;
    const databaseId = appletConfig.firestoreDatabaseId;

    // Clean leading or trailing slashes
    const cleanPath = docPath.replace(/^\/+|\/+$/g, '');

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${cleanPath}`;

    const headersObj: Record<string, string> = {
      'Authorization': `Bearer ${token}`
    };

    if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
      headersObj['Content-Type'] = 'application/json';
    }

    let requestBody: string | undefined;
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
      requestBody = JSON.stringify(toFirestoreFormat(data));
    }

    const response = await fetch(url, {
      method,
      headers: headersObj,
      body: requestBody,
    });

    if (!response.ok) {
      if (response.status === 404 && method === 'GET') {
        return null;
      }
      const errText = await response.text();
      throw new Error(`Firestore REST HTTP ${response.status}: ${errText}`);
    }

    if (method === 'GET') {
      const json = await response.json();
      return fromFirestoreFormat(json);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('fetchFirestoreREST error:', error.message);
    throw error;
  }
}
