import * as admin from 'firebase-admin';
import appletConfig from '../../firebase-applet-config.json';
import { clientEnv } from '../env.client';

if (!admin.apps.length) {
  try {
    const projectId = clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || appletConfig.projectId;
    process.env.FIREBASE_PROJECT_ID = projectId;
    process.env.GOOGLE_CLOUD_PROJECT = projectId;
    admin.initializeApp({ projectId });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = appletConfig.firestoreDatabaseId
  // @ts-ignore: firestoreDatabaseId is supported in newer firebase-admin but type definitions may not be updated
  ? admin.firestore(admin.app(), appletConfig.firestoreDatabaseId)
  : admin.firestore();
export const adminAuth = admin.auth();
