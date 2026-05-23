import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

async function testConnection() {
  try {
    const testDoc = doc(db, '_track_studio_system_test_', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase connection established successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    } else {
      console.warn("Firebase test connection warning (this is normal if permission denied on system test collection):", error);
    }
  }
}

// Invoke connection validation on startup
testConnection();
