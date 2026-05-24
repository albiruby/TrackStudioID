import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';
import { clientEnv } from '../env.client';

const firebaseConfig = {
  apiKey: clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID || appletConfig.appId,
};

const missingKeysList = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);

export const isFirebaseConfigValid = missingKeysList.length === 0;
export const firebaseMissingKeys = missingKeysList;

export const app = isFirebaseConfigValid
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

// CRITICAL: The app will break without specifying the correct firestore database ID
export const db = app
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : (null as unknown as ReturnType<typeof getFirestore>);

export const auth = app
  ? getAuth(app)
  : (null as unknown as ReturnType<typeof getAuth>);

