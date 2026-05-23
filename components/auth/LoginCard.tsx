'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { RefreshCw, ShieldAlert } from 'lucide-react';

export function LoginCard() {
  const { signInWithGoogle } = useAuth();
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [authProgress, setAuthProgress] = useState(false);

  const handleGoogleAuth = async () => {
    setAuthProgress(true);
    setErrorStatus(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorStatus(
        err?.message?.includes('popup_closed_by_user')
          ? 'Proses autentikasi dibatalkan oleh pengguna (Auth popup closed).'
          : 'Gagal melakukan otorisasi Google Auth. Silakan periksa koneksi sandbox Anda.'
      );
    } finally {
      setAuthProgress(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#111113] border border-white/10 rounded-xl p-8 space-y-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-[#FC5200]/20">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FC5200]/5 rounded-full blur-[40px] pointer-events-none" />

      {/* HEADER SEGMENT */}
      <div className="text-center space-y-2 relative z-10">
        <div className="inline-block bg-[#FC5200] text-black font-extrabold px-3 py-1 rounded text-xs italic tracking-wider font-mono uppercase">
          SECURE LOGIN
        </div>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter uppercase text-white">TRACK.STUDIO</h1>
          <p className="text-sm font-sans text-zinc-400 tracking-wider uppercase">PERFORMANCE DASHBOARD • V3.0</p>
        </div>
      </div>

      {/* DATA INDICATORS */}
      <div className="border border-white/10 p-4 bg-[#111113]/60 rounded-lg space-y-2 text-xs text-zinc-400 relative z-10">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 uppercase tracking-wider">DATA INTEGRITY:</span>
          <span className="text-green-500 font-bold uppercase">VERIFIED</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 uppercase tracking-wider">DATA SOURCING:</span>
          <span className="text-[#FC5200] font-bold uppercase">MANUAL & API</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 uppercase tracking-wider">AI MODELS:</span>
          <span className="text-red-500 font-bold uppercase">DISABLED</span>
        </div>
      </div>

      {/* DOCK OF AUTHENTICATION ACTIONS */}
      <div className="space-y-4 font-mono relative z-10">
        <button
          onClick={handleGoogleAuth}
          disabled={authProgress}
          className="w-full h-12 flex items-center justify-center gap-3 bg-[#FC5200] hover:bg-[#ff651a] disabled:bg-zinc-800/50 text-black disabled:text-zinc-600 font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all duration-300 shadow-lg shadow-[#FC5200]/10 hover:shadow-[#FC5200]/20 cursor-pointer active:scale-[0.98]"
        >
          {authProgress ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <span>SIGN IN WITH GOOGLE ATHLETE ID</span>
          )}
        </button>
      </div>

      {/* VERDICTS / ERRORS */}
      {errorStatus && (
        <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-lg text-center relative z-10 animate-fade-in">
          <p className="text-xs text-red-500 leading-relaxed">{errorStatus}</p>
        </div>
      )}

      {/* ADVISORY FOOTER */}
      <div className="text-xs text-zinc-600 text-center leading-normal pt-4 border-t border-white/10/60 flex items-center justify-center gap-1.5 relative z-10">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-zinc-555" />
        <span>Strict database sandboxes and rules are active under FireShield.</span>
      </div>
    </div>
  );
}
