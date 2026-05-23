'use client';

import React from 'react';
import { useAuth } from '../context/auth-context';
import TrackStudioShell from '../components/track-studio-shell';
import { RefreshCw, Play, ShieldCheck, Database, Award } from 'lucide-react';

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Loading flight indicators...</span>
      </div>
    );
  }

  if (user) {
    return <TrackStudioShell activeTab="dashboard" />;
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col justify-between p-6 sm:p-12 selection:bg-[#FC5200] selection:text-black">
      
      {/* HEADER DASHBOARD NAME */}
      <header className="max-w-4xl w-full mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-[#FC5200] text-black font-bold flex items-center justify-center text-xs rounded">
            T
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-300">TRACK.STUDIO V3</span>
        </div>
        <span className="text-xs border border-white/10 px-2 py-0.5 rounded text-zinc-500 font-bold uppercase tracking-wider">
          STANDALONE SHEETS V3.01
        </span>
      </header>

      {/* CORE INTRO DUCTUS PANEL */}
      <main className="max-w-md w-full mx-auto my-auto py-16 space-y-8 animate-fade-in">
        <div className="space-y-4 text-center sm:text-left">
          
          <div className="inline-block px-2.5 py-0.8 bg-[#FC5200]/10 border border-[#FC5200]/30 text-[#FC5200] text-xs uppercase font-bold rounded tracking-wider">
            PERFORMANCE TOOLS
          </div>

          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#F5F5F5] leading-tight uppercase tracking-tight">
            The Endurance <span className="text-[#FC5200]">Dashboard</span> for Athletes
          </h1>

          <p className="text-sm text-zinc-400 font-sans leading-relaxed">
            Data-driven sports science tools for endurance runners. Track training load ratios, VDOT scores, shoe mileage, course records, and resting recovery indicators.
          </p>
        </div>

        {/* LOGIN CONTAINER CONSOLE */}
        <div className="bg-[#111113] border border-white/10 rounded-xl p-8 space-y-6 shadow-xl">
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="font-heading text-lg font-bold text-white uppercase tracking-wider">Log In</h2>
            <p className="text-sm text-zinc-400 font-sans leading-normal">
              Sign in to access your running dashboard and wellness records.
            </p>
          </div>

          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-[#FC5200] hover:bg-[#e44a00] active:scale-[0.99] text-black font-bold text-sm py-4 rounded-lg uppercase tracking-wide cursor-pointer transition-all shadow-lg"
          >
            <Play className="w-5 h-5 fill-current" />
            Continue with Google
          </button>

          <div className="grid grid-cols-3 gap-2 text-center pt-4 border-t border-white/5">
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase">REAL DATA</div>
              <p className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide mt-1">NO MOCK VALUES</p>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase">CALCULATOR</div>
              <p className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide mt-1">VDOT MODEL</p>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase">SECURITY</div>
              <p className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide mt-1">PRIVATE DATA</p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER STATUTORY DECREE */}
      <footer className="max-w-4xl w-full mx-auto pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-zinc-400 text-xs uppercase tracking-wider text-center sm:text-left">
        <span>© {new Date().getFullYear()} TRACK.STUDIO ENDURANCE ARCHIVE. ALL RIGHTS SECURED.</span>
        <div className="flex gap-6">
          <span className="hover:text-zinc-400">TERMS</span>
          <span className="hover:text-zinc-400">LAWS OF DATA</span>
        </div>
      </footer>

    </div>
  );
}
