'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Activity, 
  RefreshCw, 
  Check, 
  HelpCircle,
  TrendingUp,
  Database
} from 'lucide-react';
import { getActivities } from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';
import { formatDistanceKm, formatDuration, formatPace } from '../../lib/data/dataLaw';

export default function CompareLabPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [actAId, setActAId] = useState<string>('');
  const [actBId, setActBId] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const data = await getActivities(user.uid);
        setActivities(data);
        if (data.length > 0) setActAId(data[0].id);
        if (data.length > 1) setActBId(data[1].id);
      } catch (e) {
        console.error('Failed to load compare activities:', e);
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

  const actA = activities.find(a => a.id === actAId);
  const actB = activities.find(a => a.id === actBId);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Loading Activities...</span>
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
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Workout Comparison</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
              Analyze speed, heart rates, duration, and metrics of two activities side-by-side
            </p>
          </div>
        </div>

        {activities.length > 0 ? (
          <div className="space-y-6">
            
            {/* SELECTORS BLOCK */}
            <div className="bg-[#111113] border border-white/10 p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold">Select workout A</span>
                <select
                  value={actAId}
                  onChange={(e) => setActAId(e.target.value)}
                  className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
                >
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.startDate.slice(0,10)} - {a.name} ({formatDistanceKm(a.distanceMeters)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold">Select workout B</span>
                <select
                  value={actBId}
                  onChange={(e) => setActBId(e.target.value)}
                  className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
                >
                  <option value="">-- Choose Comparison Item --</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.startDate.slice(0,10)} - {a.name} ({formatDistanceKm(a.distanceMeters)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SIDE-BY-SIDE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TARGET A */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <span className="text-sm font-sans text-zinc-400 font-bold uppercase tracking-wider">WORKOUT LAB A</span>
                    <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">{actA ? actA.name : 'Not selected'}</h3>
                  </div>
                  {actA && (
                    <span className="px-2 py-0.5 border border-white/10 bg-zinc-800/50 text-zinc-400 text-xs uppercase font-bold rounded">
                      {actA.sportType}
                    </span>
                  )}
                </div>

                {actA ? (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">LOG DATE:</span>
                      <span className="text-white">{actA.startDate.slice(0, 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">GAP DISTANCE:</span>
                      <span className="text-[#FC5200] font-bold">{formatDistanceKm(actA.distanceMeters)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">MOVING DURATION:</span>
                      <span className="text-white">{formatDuration(actA.movingTimeSeconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">AVERAGE PACE:</span>
                      <span className="text-white">{formatPace(actA.movingTimeSeconds / (actA.distanceMeters / 1000))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">AVERAGE HR:</span>
                      <span className="text-white">{actA.averageHeartRate ? `${actA.averageHeartRate} bpm` : '—'}</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-dashed border-white/10">
                      <span className="text-zinc-400">RPE (1-10 exertion):</span>
                      <span className="text-white">{actA.rpe || '—'}</span>
                    </div>
                    <div className="text-xs text-[#FC5200]/75 uppercase leading-relaxed font-mono">
                      * Athlete Notes: {actA.notes || '—'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 text-zinc-500 text-xs uppercase">
                    Choose an activity to load parameters
                  </div>
                )}
              </div>

              {/* TARGET B */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <span className="text-sm font-sans text-zinc-400 font-bold uppercase tracking-wider">WORKOUT LAB B</span>
                    <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">{actB ? actB.name : 'Not selected'}</h3>
                  </div>
                  {actB && (
                    <span className="px-2 py-0.5 border border-white/10 bg-zinc-800/50 text-zinc-400 text-xs uppercase font-bold rounded">
                      {actB.sportType}
                    </span>
                  )}
                </div>

                {actB ? (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">LOG DATE:</span>
                      <span className="text-white">{actB.startDate.slice(0, 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">GAP DISTANCE:</span>
                      <span className="text-[#FC5200] font-bold">{formatDistanceKm(actB.distanceMeters)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">MOVING DURATION:</span>
                      <span className="text-white">{formatDuration(actB.movingTimeSeconds)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">AVERAGE PACE:</span>
                      <span className="text-white">{formatPace(actB.movingTimeSeconds / (actB.distanceMeters / 1000))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">AVERAGE HR:</span>
                      <span className="text-white">{actB.averageHeartRate ? `${actB.averageHeartRate} bpm` : '—'}</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-dashed border-white/10">
                      <span className="text-zinc-400">RPE (1-10 exertion):</span>
                      <span className="text-white">{actB.rpe || '—'}</span>
                    </div>
                    <div className="text-xs text-[#FC5200]/75 uppercase leading-relaxed font-mono">
                      * Athlete Notes: {actB.notes || '—'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 text-zinc-500 text-xs uppercase">
                    Choose a comparison target to inspect delta
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase">NOT ENOUGH DATA</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Log activities into the central dashboard registry to enable an interactive workout comparison.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
