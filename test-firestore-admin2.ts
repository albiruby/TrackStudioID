import * as admin from 'firebase-admin';
import appletConfig from './firebase-applet-config.json';
admin.initializeApp({ projectId: appletConfig.projectId });

try {
  // @ts-ignore
  const db1 = admin.firestore(admin.app(), appletConfig.firestoreDatabaseId);
  console.log("DB1 projectId:", (db1 as any)._settings?.projectId || (db1 as any)._projectId, "databaseId:", (db1 as any)._settings?.databaseId || (db1 as any)._databaseId?.database);
} catch(e) { console.error(e) }

try {
  const { getFirestore } = require('firebase-admin/firestore');
  const db2 = getFirestore(admin.app(), appletConfig.firestoreDatabaseId);
  console.log("DB2 projectId:", (db2 as any)._settings?.projectId || (db2 as any)._projectId, "databaseId:", (db2 as any)._settings?.databaseId || (db2 as any)._databaseId?.database);
} catch(e) { console.error(e) }
