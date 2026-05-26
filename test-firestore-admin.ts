import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Firestore } from '@google-cloud/firestore';
import appletConfig from './firebase-applet-config.json';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: appletConfig.projectId });
}

async function run() {
  console.log("PROJECT ID:", appletConfig.projectId);
  console.log("DATABASE ID:", appletConfig.firestoreDatabaseId);

  try {
    console.log("Testing @google-cloud/firestore direct connection...");
    const dbDirect = new Firestore({
      projectId: appletConfig.projectId,
      databaseId: appletConfig.firestoreDatabaseId
    });
    const snapDirect = await dbDirect.collection('users').doc('12345').get();
    console.log("@google-cloud/firestore SUCCESS. Exists:", snapDirect.exists);
  } catch (err: any) {
    console.error("@google-cloud/firestore FAILED:", err.message);
  }

  try {
    const dbDefault = getFirestore(admin.app());
    console.log("Testing (default) database...");
    const snapDefault = await dbDefault.collection('users').doc('12345').get();
    console.log("(default) database query SUCCESS. Exists:", snapDefault.exists);
  } catch (err: any) {
    console.error("(default) database query FAILED:", err.message);
  }

  try {
    const dbCustom = getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
    console.log(`Testing custom database: ${appletConfig.firestoreDatabaseId}...`);
    const snapCustom = await dbCustom.collection('users').doc('12345').get();
    console.log("Custom database query SUCCESS. Exists:", snapCustom.exists);
  } catch (err: any) {
    console.error("Custom database query FAILED:", err.message);
  }
}

run();


