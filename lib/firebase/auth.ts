import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
} from 'firebase/auth';
import { auth } from './client';

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please configure client environment variables.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return signInWithPopup(auth, provider);
};

export const logoutUser = async () => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please configure client environment variables.');
  }
  return signOut(auth);
};

