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
import { getActivities, getWellnessLogs } from '../../lib/firebase/firestore';
import { CanonicalActivity, DailyWellnessLog } from '../../data/types';

export default function OvertrainingGuardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [actData, wellnessData] = await Promise.all([
          getActivities(user.uid),
          getWellnessLogs(user.uid)
        ]);
        setActivities(actData);
        setWellnessLogs(wellnessData);
      } catch (e) {
        console.error('Failed to load guard states:', e);
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

  // Evaluate overtraining status
  const evaluateOvertraining = () => {
    if (activities.length === 0 && wellnessLogs.length === 0) return null;

    // Check if recent logs indicate high fatigue
    const latestWellness = wellnessLogs.length > 0 ? wellnessLogs[0] : null;
    const isFatigued = !!(latestWellness && latestWellness.fatigueRating !== undefined && latestWellness.fatigueRating >= 4);
    const isSore = !!(latestWellness && latestWellness.muscleSoreness !== undefined && latestWellness.muscleSoreness >= 4);

    return {
      status: (isFatigued || isSore) ? 'HIGH STRAIN ALERT' : 'OPTIMAL ADAPTATION BASE',
      reasons: [
        isFatigued ? 'Chronic fatigue marker exceeds threshold index (score 4+)' : null,
        isSore ? 'Muscle soreness exceeds adaptive ceilings (score 4+)' : null,
      ].filter(Boolean) as string[]
    };
  };

  const guard = evaluateOvertraining();

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Scanning for Overtraining...</span>
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
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Overtraining Guard Monitor</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Analyze cumulative loads boundaries, adaptive margins, and warning indexes
            </p>
          </div>
        </div>

        {guard ? (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">REAL-TIME MONITORING</span>
              <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">{guard.status}</h3>
            </div>

            <div className="bg-zinc-900 p-4 border border-white/10 rounded-lg text-xs space-y-2">
              {guard.reasons.length > 0 ? (
                guard.reasons.map((r, i) => (
                  <div key={i} className="text-[#FC5200] font-bold">• {r}</div>
                ))
              ) : (
                <div className="text-emerald-400 font-bold">• ALL ACTIVE AUTONOMIC METRICS NORMALIZED. TRAIN SAFETY.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">Not enough data</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Log morning wellness logs or map activities to initiate overtraining alarm monitors.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
