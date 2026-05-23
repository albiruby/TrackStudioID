'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Settings, 
  RefreshCw, 
  Database,
  Activity
} from 'lucide-react';
import { getActivities } from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';
import { formatDistanceKm } from '../../lib/data/dataLaw';

export default function FormLabPage() {
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
        console.error('Failed to load form activities:', e);
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

  const runActivities = activities.filter(a => a.sportType.toLowerCase() === 'run' && a.cadenceAvg);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold font-mono">Initializing Mechanics Lab...</span>
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
              <Activity className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Running Form Analysis Lab</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Observe step frequency, landing cadence thresholds, and deterministic strides counts
            </p>
          </div>
        </div>

        {runActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {runActivities.map((a) => (
              <div key={a.id} className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <h3 className="font-mono text-base font-bold text-white tracking-tight uppercase">{a.name}</h3>
                  <span className="text-xs text-[#FC5200] font-bold uppercase">{a.startDate.slice(0, 10)}</span>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div className="bg-zinc-900 p-3 rounded border border-white/10 w-full text-center">
                    <span className="text-xs text-zinc-400 uppercase font-bold block">Average Cadence</span>
                    <span className="text-sm font-bold text-white mt-1 block">{a.cadenceAvg} Steps /min</span>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded border border-white/10 w-full text-center">
                    <span className="text-xs text-zinc-400 uppercase font-bold block">Distance Metric</span>
                    <span className="text-sm font-bold text-white mt-1 block">{formatDistanceKm(a.distanceMeters)}</span>
                  </div>
                </div>

                <p className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide leading-relaxed font-mono">
                  • Cadence telemetry mapped directly from your connected fitness streams database. No randomized variables are used.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">Form telemetry data missing</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Running cadence analytics require uploading runs with verified cadences telemetry datasets.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
