import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { db, storage } from '../firebase/client';
import { ExportCardPayload } from './exportPayload';

export type ExportAssetType = 'activity_card' | 'report_card' | 'route_art';

export interface ExportAssetMetadata {
  id: string;
  userId: string;
  type: ExportAssetType;
  sourceId: string;
  storagePath: string;
  downloadUrl: string;
  createdAt: string;
  dataSource: 'strava' | 'intervals' | 'system';
  templateName: string;
  aspectRatio: string;
}

export async function saveExportAsset(
  userId: string,
  type: ExportAssetType,
  sourceId: string,
  dataSource: 'strava' | 'intervals' | 'system',
  templateName: string,
  aspectRatio: string,
  blob: Blob
): Promise<boolean> {
  if (!db || !storage) {
    throw new Error('Firebase Storage or Firestore is not configured');
  }

  // Generate an ID for the asset
  const timestamp = new Date().toISOString();
  const exportId = `${type}_${sourceId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '');

  const storagePath = `users/${userId}/exports/${exportId}.png`;
  const storageRef = ref(storage, storagePath);

  // Upload the blob
  await uploadBytes(storageRef, blob, {
    contentType: 'image/png'
  });

  // Getting download url
  const downloadUrl = await getDownloadURL(storageRef);

  // Save metadata to Firestore
  const metadata: ExportAssetMetadata = {
    id: exportId,
    userId,
    type,
    sourceId,
    storagePath,
    downloadUrl,
    createdAt: timestamp,
    dataSource,
    templateName,
    aspectRatio
  };

  const docRef = doc(db, 'users', userId, 'exportAssets', exportId);
  await setDoc(docRef, metadata);

  return true;
}
