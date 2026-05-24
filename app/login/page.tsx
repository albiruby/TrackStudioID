'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { db } from '../../lib/firebase/client';
import { RefreshCw, Shield, Terminal } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, signInWithGoogle, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      if (!db) {
        router.push('/dashboard');
        return;
      }
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const onboardingRef = doc(db, 'users', user.uid, 'settings', 'onboarding');
        const snap = await getDoc(onboardingRef);
        if (snap.exists() && snap.data()?.completed) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        router.push('/dashboard');
      }
    };
    checkOnboarding();
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication handshakes failed. Please verify sandbox environment variables.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-[#FC5200] ">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#FC5200]" />
        <span className="text-xs tracking-wider uppercase text-zinc-400">CONNECTING TO ATHLETIC SECURE PORTALS...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-200 flex flex-col items-center justify-center p-4 ">
      <div className="max-w-md w-full border border-white/10 bg-black/40 p-8 rounded-lg shadow-2xl relative overflow-hidden">
        
        {/* TOP ACCENT BAR */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FC5200]" />
        
        <div className="text-center space-y-2 mb-8">
          <span className="p-1 px-3 bg-[#FC5200] text-black font-bold text-xs uppercase tracking-wider rounded leading-none inline-block font-mono">
            TRACK.STUDIO
          </span>
          <h1 className="text-xl font-extrabold uppercase tracking-wider text-[#FC5200] mt-3">ATHLETE PORTAL</h1>
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-mono">
            Sports Science and Performance Platform
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/20 border border-red-900/60 p-3 rounded text-xs text-red-500 mb-6 font-mono break-all leading-relaxed">
            {errorMsg}
          </div>
        )}

        <div className="space-y-6">
          <div className="text-xs text-zinc-400 font-sans leading-relaxed text-center mb-4">
            Welcome to <span className="text-[#FC5200] font-mono font-bold">Track.Studio v3.0</span>. Access your elite performance statistics, performance timeline, and predictive aerobic VDOT modeling.
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={submitting}
            className="w-full bg-[#FC5200] hover:bg-[#e44a00] active:scale-[0.98] disabled:bg-zinc-800/50 text-black font-bold py-4 rounded text-xs select-none cursor-pointer tracking-wider uppercase transition-all flex items-center justify-center gap-3 border-none hover:shadow-[0_0_15px_rgba(252,82,0,0.3)]"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>SECURE CONSOLE CONNECTION...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 text-black font-bold" />
                <span>CONNECT WITH GOOGLE ATHLETE AUTH</span>
              </>
            )}
          </button>

          <div className="border-t border-white/10/80 pt-4 flex flex-col items-center gap-2">
            <div className="text-xs text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Terminal className="w-3.5 h-3.5" />
              <span>SECURE CLOUD SANDBOX CONNECTOR</span>
            </div>
            <p className="text-xs text-zinc-600 font-sans text-center max-w-xs">
              Requires an active Google Account associated with the Google AI Studio project workspace.
            </p>
          </div>
        </div>

        <div className="text-center mt-6 border-t border-white/10 pt-4">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
            SYSTEM PORT: 3000 // DETERMINISTIC CALCULATIONS ONLY
          </span>
        </div>

      </div>
    </div>
  );
}
