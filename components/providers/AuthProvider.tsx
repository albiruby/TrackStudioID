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

          // Get the detailed athlete profile from subcollection users/{uid}/profile/athlete
          const athleteProfileRef = doc(db, 'users', firebaseUser.uid, 'profile', 'athlete');
          let athleteProfileSnap: any = null;
          try {
            athleteProfileSnap = await getDoc(athleteProfileRef);
          } catch (err) {
            console.error('Error fetching subcollection athlete profile:', err);
          }

          const hasSubprofile = athleteProfileSnap && athleteProfileSnap.exists();
          const subprofileData = (hasSubprofile && athleteProfileSnap) ? athleteProfileSnap.data() : null;

          if (userSnap && userSnap.exists()) {
            const data = userSnap.data();
            const emailPrefix = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User';
            const finalDisplayName = subprofileData?.displayName || data.displayName || firebaseUser.displayName || emailPrefix;

            setAthleteProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: finalDisplayName,
              photoURL: firebaseUser.photoURL,
              createdAt: subprofileData?.createdAt || data.createdAt || null,
              updatedAt: subprofileData?.updatedAt || data.updatedAt || null,
              
              // New genuine profile values
              birthDate: subprofileData?.birthDate || null,
              sex: subprofileData?.sex || null,
              heightCm: subprofileData?.heightCm || null,
              weightKg: subprofileData?.weightKg || null,
              restingHeartRate: subprofileData?.restingHeartRate || null,
              maxHeartRate: subprofileData?.maxHeartRate || null,
              lactateThresholdHeartRate: subprofileData?.lactateThresholdHeartRate || null,
              thresholdPaceSecPerKm: subprofileData?.thresholdPaceSecPerKm || null,
              thresholdPowerWatts: subprofileData?.thresholdPowerWatts || null,
              recentRaceResults: subprofileData?.recentRaceResults || [],
              preferredUnits: subprofileData?.preferredUnits || 'metric',

              // Backward compatibility fields without fake presets if not declared in DB
              restingHR: subprofileData?.restingHeartRate || data.restingHR || null,
              maxHR: subprofileData?.maxHeartRate || data.maxHR || null,
              thresholdHR: subprofileData?.lactateThresholdHeartRate || data.thresholdHR || null,
              units: subprofileData?.preferredUnits || data.units || 'metric',
              vdotScore: data.vdotScore || null,
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
              birthDate: null,
              sex: null,
              heightCm: null,
              weightKg: null,
              restingHeartRate: null,
              maxHeartRate: null,
              lactateThresholdHeartRate: null,
              thresholdPaceSecPerKm: null,
              thresholdPowerWatts: null,
              recentRaceResults: [],
              preferredUnits: 'metric',
              restingHR: null,
              maxHR: null,
              thresholdHR: null,
              units: 'metric',
              vdotScore: null,
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
    const athleteRef = doc(db, 'users', user.uid, 'profile', 'athlete');

    // Filter root document updates
    const rootUpdates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) rootUpdates.displayName = updates.displayName;
    if (updates.stravaConnected !== undefined) rootUpdates.stravaConnected = updates.stravaConnected;
    if (updates.vdotScore !== undefined) rootUpdates.vdotScore = updates.vdotScore;

    // Filter subcollection athlete document updates with precise field typing
    const athUpdates: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.displayName !== undefined) athUpdates.displayName = updates.displayName;
    if (updates.birthDate !== undefined) athUpdates.birthDate = updates.birthDate;
    if (updates.sex !== undefined) athUpdates.sex = updates.sex;
    if (updates.heightCm !== undefined) athUpdates.heightCm = updates.heightCm;
    if (updates.weightKg !== undefined) athUpdates.weightKg = updates.weightKg;
    if (updates.restingHeartRate !== undefined) athUpdates.restingHeartRate = updates.restingHeartRate;
    if (updates.maxHeartRate !== undefined) athUpdates.maxHeartRate = updates.maxHeartRate;
    if (updates.lactateThresholdHeartRate !== undefined) athUpdates.lactateThresholdHeartRate = updates.lactateThresholdHeartRate;
    if (updates.thresholdPaceSecPerKm !== undefined) athUpdates.thresholdPaceSecPerKm = updates.thresholdPaceSecPerKm;
    if (updates.thresholdPowerWatts !== undefined) athUpdates.thresholdPowerWatts = updates.thresholdPowerWatts;
    if (updates.recentRaceResults !== undefined) athUpdates.recentRaceResults = updates.recentRaceResults;
    if (updates.preferredUnits !== undefined) athUpdates.preferredUnits = updates.preferredUnits;

    // Backward compatibility property replication
    if (updates.restingHeartRate !== undefined && updates.restingHR === undefined) updates.restingHR = updates.restingHeartRate;
    if (updates.maxHeartRate !== undefined && updates.maxHR === undefined) updates.maxHR = updates.maxHeartRate;
    if (updates.lactateThresholdHeartRate !== undefined && updates.thresholdHR === undefined) updates.thresholdHR = updates.lactateThresholdHeartRate;
    if (updates.preferredUnits !== undefined && updates.units === undefined) updates.units = updates.preferredUnits;

    try {
      await setDoc(userRef, rootUpdates, { merge: true });
      await setDoc(athleteRef, athUpdates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/profile/athlete`);
    }

    setAthleteProfile((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
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
        {/* INVISIBLE RENDER FRAME FOR NEXTJS APP ROUTER TO PREVENT <HTML> IMPORT BUG */}
        <div className="hidden absolute opacity-0 pointer-events-none">{children}</div>
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
