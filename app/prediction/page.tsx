'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Award, 
  HelpCircle, 
  Zap, 
  Activity, 
  RefreshCw,
  Compass
} from 'lucide-react';

export default function PredictionPage() {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();

  const vdot = athleteProfile?.vdotScore;

  // Jack Daniels equivalency calculations based on VDOT coefficient
  const getPredictions = (v: number) => {
    // Basic lookup and scaling approximation
    const c = 3000 / v; // scale base factor
    return [
      { name: '1500m Metric Mile', time: formatSecs(c * 0.26 * 60) },
      { name: 'Mile Run (1,609m)', time: formatSecs(c * 0.28 * 60) },
      { name: '3000m Track Run', time: formatSecs(c * 0.55 * 60) },
      { name: '5000m (5K Road Race)', time: formatSecs(c * 1.0 * 60) },
      { name: '10000m (10K Road Race)', time: formatSecs(c * 2.08 * 60) },
      { name: 'Half Marathon (21.1 km)', time: formatSecs(c * 4.60 * 60) },
      { name: 'Marathon (42.2 km)', time: formatSecs(c * 9.58 * 60) },
    ];
  };

  const formatSecs = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.round(totalSeconds % 60);

    const pad = (n: number) => String(n).padStart(2, '0');

    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const predictedList = vdot ? getPredictions(vdot) : null;

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Loading Predictions...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8 ">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Race Race Time Predictor</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
              Predict equivalent performances from standard distance limits
            </p>
          </div>
        </div>

        {predictedList && vdot ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">PREDICTED POTENTIALS</span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1">VDOT Equivalent Speed</h2>
              </div>

              <div className="space-y-2.5">
                {predictedList.map((pred, i) => (
                  <div key={i} className="flex justify-between items-center bg-zinc-800/50/40 p-3 rounded border border-white/10">
                    <span className="text-xs font-bold text-zinc-300 uppercase">{pred.name}</span>
                    <span className="text-xs font-bold text-[#FC5200]">{pred.time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">VDOT index basis</span>
                <div className="p-4 border border-white/10 rounded bg-[#FC5200]/5 text-center">
                  <span className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide font-bold tracking-wider block">Active VDOT Index</span>
                  <div className="text-3xl font-bold text-white mt-1">{vdot}</div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed mt-4">
                  Equivalent paces are mathematically deterministic. They project identical cellular oxygen utilization efficiency under static environmental parameters. Actual race outcomes depend on conditioning, weather, and course profiles.
                </p>
              </div>

              <button
                onClick={() => router.push('/vdot-calculator')}
                className="w-full bg-zinc-800/50 hover:bg-zinc-850 border border-white/10 text-xs font-bold uppercase tracking-wide py-3 rounded cursor-pointer transition-colors"
              >
                RECALIBRATE BASE VDOT INDEX
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Compass className="w-6 h-6 text-[#FC5200] animate-spin" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase">No Active VDOT Profile Score</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Predictor equations require a valid VDOT score registered to your athlete profile. Read race equivalent formulas here or calculate it via previous workout speed.
              </p>
              <button
                onClick={() => router.push('/vdot-calculator')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 border border-[#FC5200] bg-[#FC5200]/5 text-[#FC5200] text-xs font-bold rounded uppercase cursor-pointer hover:bg-[#FC5200] hover:text-black transition-all"
              >
                <span>Navigate to VDOT Calculator</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
