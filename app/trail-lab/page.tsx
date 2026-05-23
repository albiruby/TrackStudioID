'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Compass, 
  RefreshCw, 
  Database,
  Activity
} from 'lucide-react';
import { getActivities } from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';

export default function TrailLabPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const data = await getActivities(user.uid);
        setActivities(data);
      } catch (e) {
        console.error('Failed to load trail activities:', e);
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

  // Aggregate cumulative climbing
  const totalClimb = activities.reduce((sum, current) => sum + (current.elevationGainMeters || 0), 0);
  const climbActivities = activities.filter(a => (a.elevationGainMeters || 0) > 0);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold font-mono">Opening Elevation Dial...</span>
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
              <Compass className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Elevation & Trail Laboratory</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Analyze cumulative elevation gains, climbs matrices, and gradient thresholds
            </p>
          </div>
        </div>

        {climbActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">CUMULATIVE LOAD STATS</span>
                <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">Vertical climbing logs</h3>
              </div>

              <div className="bg-zinc-800/50/40 border border-white/10 p-6 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-white/10/60">
                  <span className="text-zinc-400 text-xs">TOTAL GAIN GAINED:</span>
                  <span className="text-[#FC5200] font-bold">{totalClimb.toFixed(0)} Vertical Metres</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 text-xs">CLIMBED WORKOUTS:</span>
                  <span className="text-white font-bold">{climbActivities.length} logs</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {climbActivities.slice(0,3).map((c) => (
                <div key={c.id} className="bg-[#111113] border border-white/10 w-full p-6 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-xs text-[#FC5200] font-bold block">{c.startDate.slice(0,10)}</span>
                    <span className="text-white font-bold mt-0.5 block">{c.name}</span>
                  </div>
                  <span className="text-white font-extrabold">+{c.elevationGainMeters} m</span>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">No elevations recorded</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Elevation calculations are fully deterministic and derive from workout logs. Upload trail or mountain runs to populate elevation charts.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
