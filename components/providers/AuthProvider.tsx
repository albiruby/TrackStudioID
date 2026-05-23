'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { auth, db, isFirebaseConfigValid, firebaseMissingKeys } from '../../lib/firebase/client';
import { logoutUser } from '../../lib/firebase/auth';
import { AthleteProfile } from '../../types/track-studio';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
    },
    operationType,
    path,
  };
  console.error('Firestore Error Payload:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: FirebaseUser | null;
  athleteProfile: AthleteProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateAthleteProfile: (updates: Partial<AthleteProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigValid) {
      setLoading(false);
      return;
    }

    // Validate connection to Firestore on initialization
    async function testConnection() {
      if (!db) return;
      try {
        await getDocFromServer(doc(db, '_track_studio_system_test_', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. Client is offline.");
        }
      }
    }
    testConnection();

    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Get or create users/{uid} document
          const userRef = doc(db, 'users', firebaseUser.uid);
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }

          if (userSnap && userSnap.exists()) {
            const data = userSnap.data();
            const emailPrefix = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User';
            const finalDisplayName = data.displayName || firebaseUser.displayName || emailPrefix;

            setAthleteProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: finalDisplayName,
              photoURL: firebaseUser.photoURL,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              // Fallback fields in memory for UI presentation compatibility (NO database writes of these metrics)
              weightKg: data.weightKg || 70.0,
              heightCm: data.heightCm || 175.0,
              restingHR: data.restingHR || 42,
              maxHR: data.maxHR || 190,
              thresholdHR: data.thresholdHR || 165,
              vdotScore: data.vdotScore || 45.0,
              stravaConnected: data.stravaConnected || false,
            });
          } else {
            const emailPrefix = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User';
            const finalDisplayName = firebaseUser.displayName || emailPrefix;

            const newDoc = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || null,
              displayName: finalDisplayName || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              settings: {},
            };

            try {
              await setDoc(userRef, newDoc);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }

            setAthleteProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: finalDisplayName,
              photoURL: firebaseUser.photoURL,
              weightKg: 70.0,
              heightCm: 175.0,
              restingHR: 42,
              maxHR: 190,
              thresholdHR: 165,
              vdotScore: 45.0,
              stravaConnected: false,
            });
          }
        } else {
          setUser(null);
          setAthleteProfile(null);
        }
      } catch (err) {
        console.error('Error loading athlete profile:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please configure sandbox credentials.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAthleteProfile(null);
      setLoading(false);
    }
  };

  const updateAthleteProfile = async (updates: Partial<AthleteProfile>) => {
    if (!user || !db) return;
    const userRef = doc(db, 'users', user.uid);
    
    // We only merge standard user keys or settings updates into Firestore user profile
    const cleanedUpdates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) cleanedUpdates.displayName = updates.displayName;
    if (updates.weightKg !== undefined) cleanedUpdates.weightKg = updates.weightKg;
    if (updates.heightCm !== undefined) cleanedUpdates.heightCm = updates.heightCm;
    if (updates.restingHR !== undefined) cleanedUpdates.restingHR = updates.restingHR;
    if (updates.maxHR !== undefined) cleanedUpdates.maxHR = updates.maxHR;
    if (updates.thresholdHR !== undefined) cleanedUpdates.thresholdHR = updates.thresholdHR;
    if (updates.vdotScore !== undefined) cleanedUpdates.vdotScore = updates.vdotScore;
    if (updates.stravaConnected !== undefined) cleanedUpdates.stravaConnected = updates.stravaConnected;

    try {
      await setDoc(userRef, cleanedUpdates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }

    setAthleteProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // If environment variables are missing, show a beautiful diagnostic setup error instead of crashing the process
  if (!isFirebaseConfigValid) {
    return (
      <div className="min-h-screen bg-transparent text-zinc-200 flex flex-col items-center justify-center p-4 ">
        <div className="max-w-2xl w-full border border-red-900 bg-black/40 p-8 rounded-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#FC5200]" />
          <div className="mb-6">
            <span className="p-1 px-3 bg-red-950/40 text-red-500 font-bold text-xs uppercase tracking-wider rounded border border-red-900 inline-block">
              DIAGNOSTIC STATUS: CONNECTION OFFLINE
            </span>
            <h1 className="text-xl font-bold uppercase tracking-wide text-[#FC5200] mt-3">
              FIREBASE REQUISITION SYSTEM MISCONFIGURED
            </h1>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1">
              Google AI Studio Sandbox Env integration is not fully completed yet.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-zinc-400 leading-relaxed font-sans">
              To integrate Firebase automatically using Google AI Studio's built-in feature:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400 font-sans">
              <li>Click the <span className="text-[#FC5200] font-bold font-mono">"Firebase Integration"</span> button in AI Studio’s sidebar panel.</li>
              <li>Select the <span className="font-bold">"Add database and auth — Firestore & Auth with Firebase"</span> option.</li>
              <li>Complete the setup prompts. AI Studio will automatically provision and expose the required environment variables below.</li>
            </ol>

            <div className="bg-[#111113] border border-white/10 p-4 rounded mt-4">
              <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-2">
                UNRESOLVED ENVIRONMENT PORT PROPERTIES (MISSING CLIENT-SIDE KEYS):
              </span>
              <ul className="space-y-1 text-xs">
                {firebaseMissingKeys.map((key) => (
                  <li key={key} className="text-red-400 flex items-center gap-2">
                    <span className="text-red-500">✕</span> {key}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="text-xs text-zinc-400 uppercase mt-4 text-center border-t border-white/10 pt-4 font-mono">
              SYSTEM CONSOLE STATUS PORT: 3000 // DETERMINISTIC ATHLETE MODEL V3.0
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        athleteProfile,
        loading,
        signInWithGoogle,
        logout,
        signOut: logout,
        updateAthleteProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
