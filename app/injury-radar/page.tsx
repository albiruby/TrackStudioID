'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  ShieldAlert, 
  RefreshCw, 
  Database,
  Activity
} from 'lucide-react';
import { getWellnessLogs } from '../../lib/firebase/firestore';
import { DailyWellnessLog } from '../../data/types';

export default function InjuryRadarPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const data = await getWellnessLogs(user.uid);
        setWellnessLogs(data);
      } catch (e) {
        console.error('Failed to load logs for injury radar:', e);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  const latestMobility = wellnessLogs.length > 0 ? wellnessLogs[0].muscleSoreness : null;

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Loading...</span>
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
              <ShieldAlert className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Injury Risk Analysis</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Analyze localized physical sorenesses mapped directly from active wellness logs
            </p>
          </div>
        </div>

        {latestMobility !== null && latestMobility !== undefined ? (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SENSING LOCAL SORENESS</span>
              <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">Muscular Mobility Index</h3>
            </div>

            <div className="bg-zinc-900 p-4 border border-white/10 rounded-lg text-xs space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase font-bold text-xs">Active Muscle Strain Index:</span>
                <span className="text-white font-extrabold">{latestMobility} / 5</span>
              </div>
              
              <div className="h-px bg-zinc-800/50 my-1" />

              {latestMobility >= 4 ? (
                <div className="text-red-400 font-bold uppercase tracking-wide leading-relaxed text-xs p-2.5 bg-red-950/20 border border-red-900/50 rounded">
                  ⚠️ HIGH SORENESS STRAIN: High muscular fatigue detected! Limit high velocity training to reduce risk profile.
                </div>
              ) : (
                <div className="text-emerald-400 font-bold uppercase leading-relaxed text-xs p-2.5 bg-emerald-950/20 border border-emerald-950/50 rounded">
                  🟢 OPTIMAL CONDITION: Heart Rate muscular fatigue registers inside adequate bounds.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">No active radar signals detected</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Log daily muscle soreness indices inside the morning wellness check to light up injury radar warning sectors.
              </p>
              <button
                onClick={() => router.push('/morning-check')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 border border-[#FC5200] bg-[#FC5200]/5 text-[#FC5200] text-xs font-bold rounded uppercase cursor-pointer hover:bg-[#FC5200] hover:text-black transition-all"
              >
                <span>Log Wellness Check</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
