'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, Activity, RefreshCw, Database, Compass, AlertTriangle, 
  Layers, Clock, Zap, Heart, TrendingUp, TrendingDown, Route, Target, CheckCircle2
} from 'lucide-react';
import { 
  getActivities, 
  getSplits,
  getActivityStream
} from '../../lib/firebase/firestore';
import { CanonicalActivity, CanonicalSplit, CanonicalActivityStream } from '../../data/types';
import { formatDistanceKm, formatDuration, formatPace, isRealNumber } from '../../lib/data/dataLaw';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

function safePace(movingSeconds: number | null | undefined, distanceMeters: number | null | undefined): number | null {
  if (!movingSeconds || !distanceMeters || distanceMeters <= 0) return null;
  return movingSeconds / (distanceMeters / 1000);
}

function formatPaceSec(seconds: number | null): string {
  if (seconds === null || !isRealNumber(seconds) || seconds <= 0 || seconds > 3600) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const formatDelta = (valA: number | null | undefined, valB: number | null | undefined, formatter: (v: number) => string, lowerIsBetter = false) => {
  if (valA === null || valA === undefined || valB === null || valB === undefined) return <span className="text-zinc-600">—</span>;
  const diff = valA - valB;
  if (Math.abs(diff) < 0.0001) return <span className="text-zinc-500">Same</span>;
  const isPositive = diff > 0;
  const sign = isPositive ? '+' : '';
  let color = 'text-zinc-400';
  
  if (lowerIsBetter) {
    color = isPositive ? 'text-red-400' : 'text-emerald-400';
  } else {
    color = isPositive ? 'text-emerald-400' : 'text-red-400';
  }
  
  return <span className={color}>{sign}{formatter(Math.abs(diff))}</span>;
};

export default function CompareActivitiesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [actAId, setActAId] = useState<string>('');
  const [actBId, setActBId] = useState<string>('');

  const [streamA, setStreamA] = useState<CanonicalActivityStream | null>(null);
  const [streamB, setStreamB] = useState<CanonicalActivityStream | null>(null);

  const [splitsA, setSplitsA] = useState<CanonicalSplit[]>([]);
  const [splitsB, setSplitsB] = useState<CanonicalSplit[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const acts = await getActivities(user.uid);
        const sortedActs = (acts || []).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setActivities(sortedActs);
        if (sortedActs.length > 0) setActAId(sortedActs[0].id);
        if (sortedActs.length > 1) setActBId(sortedActs[1].id);
      } catch (e) {
        console.error('Failed to load Compare Lab activities:', e);
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

  useEffect(() => {
    if (!actAId) return;
    getActivityStream(actAId).then(setStreamA).catch(() => setStreamA(null));
    getSplits(actAId).then(list => setSplitsA(list || [])).catch(() => setSplitsA([]));
  }, [actAId]);

  useEffect(() => {
    if (!actBId) return;
    getActivityStream(actBId).then(setStreamB).catch(() => setStreamB(null));
    getSplits(actBId).then(list => setSplitsB(list || [])).catch(() => setSplitsB([]));
  }, [actBId]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest font-bold font-mono">Calibrating Diagnostic Datasets...</span>
      </div>
    );
  }

  const actA = activities.find(a => a.id === actAId);
  const actB = activities.find(a => a.id === actBId);

  // Computed Difference Cards Check & Stats
  const hasRouteA = !!(actA?.summaryPolyline || actA?.polyline || actA?.startLatlng);
  const hasRouteB = !!(actB?.summaryPolyline || actB?.polyline || actB?.startLatlng);

  const effA = (actA?.averageHeartRate && actA?.movingTimeSeconds && actA?.distanceMeters) ? ((actA.distanceMeters/1000) / actA.movingTimeSeconds) * actA.averageHeartRate : null;
  const effB = (actB?.averageHeartRate && actB?.movingTimeSeconds && actB?.distanceMeters) ? ((actB.distanceMeters/1000) / actB.movingTimeSeconds) * actB.averageHeartRate : null;

  const mSplitsA = splitsA.filter(s => s.splitType === 'metric').sort((a,b) => a.splitIndex - b.splitIndex);
  const mSplitsB = splitsB.filter(s => s.splitType === 'metric').sort((a,b) => a.splitIndex - b.splitIndex);
  const maxSplits = Math.max(mSplitsA.length, mSplitsB.length);

  // Built Stream Grid
  const streamGrid: any[] = [];
  if (streamA && streamB && streamA.distance && streamB.distance && streamA.distance.length > 0 && streamB.distance.length > 0) {
    const maxDist = Math.max(streamA.distance[streamA.distance.length - 1] || 0, streamB.distance[streamB.distance.length - 1] || 0);
    const bucketSize = 100;
    const buckets = Math.ceil(maxDist / bucketSize);

    for (let i = 0; i < buckets; i++) {
        streamGrid.push({
            distIndex: i * bucketSize,
            distLabel: `${((i * bucketSize) / 1000).toFixed(1)}km`,
            a_hr: null as number | null, b_hr: null as number | null,
            a_pace: null as number | null, b_pace: null as number | null,
            a_cad: null as number | null, b_cad: null as number | null,
            a_elev: null as number | null, b_elev: null as number | null,
            a_power: null as number | null, b_power: null as number | null,
        });
    }

    const assignStream = (stream: CanonicalActivityStream, prefix: 'a_' | 'b_') => {
        if (!stream.distance) return;
        for (let i = 0; i < stream.distance.length; i++) {
            const idx = Math.floor(stream.distance[i] / bucketSize);
            if (streamGrid[idx]) {
                if (streamGrid[idx][`${prefix}hr`] === null && stream.heartrate?.[i]) streamGrid[idx][`${prefix}hr`] = stream.heartrate[i];
                if (streamGrid[idx][`${prefix}pace`] === null && stream.velocitySmooth?.[i]) streamGrid[idx][`${prefix}pace`] = Math.min(600, 1000 / stream.velocitySmooth[i]); // clip max to 10:00/km graph scale
                if (streamGrid[idx][`${prefix}cad`] === null && stream.cadence?.[i]) streamGrid[idx][`${prefix}cad`] = stream.cadence[i] * 2;
                if (streamGrid[idx][`${prefix}elev`] === null && stream.altitude?.[i]) streamGrid[idx][`${prefix}elev`] = stream.altitude[i];
                if (streamGrid[idx][`${prefix}power`] === null && stream.watts?.[i]) streamGrid[idx][`${prefix}power`] = stream.watts[i];
            }
        }
    };
    assignStream(streamA, 'a_');
    assignStream(streamB, 'b_');
  }

  // Derived Diff Winners
  let winnerPace = null; 
  if (actA && actB && actA.distanceMeters && actB.distanceMeters) {
      const pA = actA.movingTimeSeconds / actA.distanceMeters;
      const pB = actB.movingTimeSeconds / actB.distanceMeters;
      winnerPace = pA < pB ? 'A' : pA > pB ? 'B' : 'Tie';
  }

  let winnerHr = null;
  if (actA?.averageHeartRate && actB?.averageHeartRate) {
      winnerHr = actA.averageHeartRate < actB.averageHeartRate ? 'A' : actA.averageHeartRate > actB.averageHeartRate ? 'B' : 'Tie';
  }

  let winnerElev = null;
  if (actA?.elevationGainMeters !== undefined && actB?.elevationGainMeters !== undefined) {
      winnerElev = actA.elevationGainMeters > actB.elevationGainMeters ? 'A' : actA.elevationGainMeters < actB.elevationGainMeters ? 'B' : 'Tie';
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg shadow-sm">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-white font-mono leading-none">Compare Activities</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1.5 font-bold">
              Analyze deterministic splits, streams, and route telemetry side-by-side.
            </p>
          </div>
        </div>

        {/* SELECTORS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111113] border border-white/10 p-5 rounded-lg space-y-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 text-[100px] font-black opacity-5 text-white leading-none pt-8">A</div>
             <span className="text-xs text-[#FC5200] font-bold font-mono tracking-widest uppercase block mb-3">ACTIVITY A SELECTOR</span>
             <select
                value={actAId}
                onChange={(e) => setActAId(e.target.value)}
                className="w-full bg-[#1c1c1e] border border-white/15 p-3 outline-none focus:border-[#FC5200] text-sm text-zinc-200 font-mono rounded z-10 relative"
              >
                {activities.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.startDate.slice(0,10)} | {a.name} | {formatDistanceKm(a.distanceMeters)}
                  </option>
                ))}
              </select>
          </div>

          <div className="bg-[#111113] border border-white/10 p-5 rounded-lg space-y-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 text-[100px] font-black opacity-5 text-white leading-none pt-8">B</div>
             <span className="text-xs text-indigo-400 font-bold font-mono tracking-widest uppercase block mb-3">ACTIVITY B SELECTOR</span>
             <select
                value={actBId}
                onChange={(e) => setActBId(e.target.value)}
                className="w-full bg-[#1c1c1e] border border-white/15 p-3 outline-none focus:border-indigo-500 text-sm text-zinc-200 font-mono rounded z-10 relative"
              >
                <option value="">-- Select Benchmark --</option>
                {activities.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.startDate.slice(0,10)} | {a.name} | {formatDistanceKm(a.distanceMeters)}
                  </option>
                ))}
              </select>
          </div>
        </div>

        {actA && actB ? (
            <div className="space-y-6">

                {/* SUMMARY COMPARISON TABLE */}
                <div className="bg-[#111113] border border-white/10 rounded-lg overflow-hidden font-mono text-xs shadow-sm">
                    <div className="grid grid-cols-4 bg-zinc-900/90 border-b border-white/10 p-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider hidden sm:grid">
                        <div className="col-span-1">METRIC</div>
                        <div className="col-span-1 text-[#FC5200]">ACTIVITY A</div>
                        <div className="col-span-1 text-indigo-400">ACTIVITY B</div>
                        <div className="col-span-1">DIFFERENCE (A vs B)</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">DATE</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{actA.startDate.slice(0, 10)}</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{actB.startDate.slice(0, 10)}</div>
                        <div className="col-span-2 sm:col-span-1 text-zinc-600">—</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">DISTANCE</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{formatDistanceKm(actA.distanceMeters)}</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{formatDistanceKm(actB.distanceMeters)}</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(actA.distanceMeters, actB.distanceMeters, (v) => formatDistanceKm(v))}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">MOVING TIME</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{formatDuration(actA.movingTimeSeconds)}</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{formatDuration(actB.movingTimeSeconds)}</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(actA.movingTimeSeconds, actB.movingTimeSeconds, (v) => formatDuration(v), true)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">AVG PACE</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{formatPaceSec(safePace(actA.movingTimeSeconds, actA.distanceMeters))}</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{formatPaceSec(safePace(actB.movingTimeSeconds, actB.distanceMeters))}</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(safePace(actA.movingTimeSeconds, actA.distanceMeters), safePace(actB.movingTimeSeconds, actB.distanceMeters), (v) => formatPaceSec(v), true)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">AVG HR</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{actA.averageHeartRate || '—'} bpm</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{actB.averageHeartRate || '—'} bpm</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(actA.averageHeartRate, actB.averageHeartRate, (v) => `${Math.round(v)} bpm`, true)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">ELEVATION</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{actA.elevationGainMeters !== undefined ? `${actA.elevationGainMeters}m` : '—'}</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{actB.elevationGainMeters !== undefined ? `${actB.elevationGainMeters}m` : '—'}</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(actA.elevationGainMeters, actB.elevationGainMeters, (v) => `${Math.round(v)}m`)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">CADENCE</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{actA.cadenceAvg ? `${Math.round(actA.cadenceAvg * 2)} spm` : '—'}</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{actB.cadenceAvg ? `${Math.round(actB.cadenceAvg * 2)} spm` : '—'}</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(actA.cadenceAvg ? actA.cadenceAvg * 2 : null, actB.cadenceAvg ? actB.cadenceAvg * 2 : null, (v) => `${Math.round(v)} spm`)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-white/5 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">CALORIES</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{actA.calories || '—'}</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{actB.calories || '—'}</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(actA.calories, actB.calories, (v) => `${Math.round(v)} kcal`)}</div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 p-4 items-center hover:bg-white/5 transition-colors gap-2">
                        <div className="col-span-2 sm:col-span-1 text-zinc-400 font-bold">AVG POWER</div>
                        <div className="col-span-1 text-[#FC5200] sm:text-white">{actA.averageWatts || '—'} W</div>
                        <div className="col-span-1 text-indigo-400 sm:text-white">{actB.averageWatts || '—'} W</div>
                        <div className="col-span-2 sm:col-span-1">{formatDelta(actA.averageWatts, actB.averageWatts, (v) => `${Math.round(v)} W`)}</div>
                    </div>
                </div>

                {/* DIFFERENCE CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                       <span className="text-[10px] text-zinc-500 font-bold mb-2 uppercase block font-mono">Faster Activity</span>
                       <h4 className={`text-sm md:text-base font-bold font-mono ${winnerPace === 'A' ? 'text-[#FC5200]' : winnerPace === 'B' ? 'text-indigo-400' : 'text-zinc-400'}`}>
                           {winnerPace === 'A' ? 'Activity A' : winnerPace === 'B' ? 'Activity B' : 'Tie / N/A'}
                       </h4>
                    </div>

                    <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                       <span className="text-[10px] text-zinc-500 font-bold mb-2 uppercase block font-mono">Lower Avg HR</span>
                       <h4 className={`text-sm md:text-base font-bold font-mono ${winnerHr === 'A' ? 'text-[#FC5200]' : winnerHr === 'B' ? 'text-indigo-400' : 'text-zinc-400'}`}>
                           {winnerHr === 'A' ? 'Activity A' : winnerHr === 'B' ? 'Activity B' : 'Tie / N/A'}
                       </h4>
                    </div>

                    <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                       <span className="text-[10px] text-zinc-500 font-bold mb-2 uppercase block font-mono">More Elevation</span>
                       <h4 className={`text-sm md:text-base font-bold font-mono ${winnerElev === 'A' ? 'text-[#FC5200]' : winnerElev === 'B' ? 'text-indigo-400' : 'text-zinc-400'}`}>
                           {winnerElev === 'A' ? 'Activity A' : winnerElev === 'B' ? 'Activity B' : 'Tie / N/A'}
                       </h4>
                    </div>
                    
                    <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                       <span className="text-[10px] text-zinc-500 font-bold mb-2 uppercase block font-mono">Pace Stability</span>
                       {(streamGrid.length > 0) ? (
                            <span className="text-zinc-300 text-xs mt-1 block font-mono uppercase">Inspect visual stream below.</span>
                       ) : (
                            <span className="text-amber-500 text-xs mt-1 block font-bold uppercase font-mono">Streams required.</span>
                       )}
                    </div>
                    
                    <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                       <span className="text-[10px] text-zinc-500 font-bold mb-2 uppercase block font-mono">Better Efficiency (HR)</span>
                       <h4 className={`text-sm md:text-base font-bold font-mono ${effA && effB && effA > effB ? 'text-[#FC5200]' : effA && effB && effB > effA ? 'text-indigo-400' : 'text-zinc-400'}`}>
                           {(effA && effB) ? (effA > effB ? 'Activity A' : effA < effB ? 'Activity B' : 'Tie') : 'N/A'}
                       </h4>
                    </div>

                    <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                       <span className="text-[10px] text-zinc-500 font-bold mb-2 uppercase block font-mono">GPS Route Match</span>
                       {(!hasRouteA || !hasRouteB) ? (
                            <span className="text-amber-500 text-xs mt-1 block font-bold uppercase font-mono">GPS required.</span>
                       ) : (
                            <span className="text-zinc-300 text-xs mt-1 block font-mono uppercase">Manual only.</span>
                       )}
                    </div>
                </div>

                {/* SPLIT COMPARISON */}
                <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                        <Route className="w-4 h-4 text-zinc-400" />
                        Split Matrix Comparison
                    </h3>

                    {(mSplitsA.length > 0 || mSplitsB.length > 0) ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs whitespace-nowrap min-w-[700px]">
                                <thead>
                                    <tr className="border-b border-white/10 text-zinc-500 text-[10px]">
                                        <th className="p-3 font-bold uppercase w-16">Split</th>
                                        <th className="p-3 font-bold uppercase text-[#FC5200]">A Pace</th>
                                        <th className="p-3 font-bold uppercase text-indigo-400">B Pace</th>
                                        <th className="p-3 font-bold uppercase">Pace Diff</th>
                                        <th className="p-3 font-bold uppercase text-[#FC5200]">A HR</th>
                                        <th className="p-3 font-bold uppercase text-indigo-400">B HR</th>
                                        <th className="p-3 font-bold uppercase">HR Diff</th>
                                        <th className="p-3 font-bold uppercase">Elev Diff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({length: maxSplits}).map((_, i) => {
                                        const sa = mSplitsA[i];
                                        const sb = mSplitsB[i];
                                        const eDiffA = sa?.elevationDifferenceMeters !== null && sa?.elevationDifferenceMeters !== undefined ? sa.elevationDifferenceMeters : null;
                                        const eDiffB = sb?.elevationDifferenceMeters !== null && sb?.elevationDifferenceMeters !== undefined ? sb.elevationDifferenceMeters : null;
                                        return (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-3 text-zinc-300 font-bold">Km {i + 1}</td>
                                                <td className="p-3 text-[#FC5200]">{sa?.paceSecPerKm ? formatPaceSec(sa.paceSecPerKm) : '—'}</td>
                                                <td className="p-3 text-indigo-400">{sb?.paceSecPerKm ? formatPaceSec(sb.paceSecPerKm) : '—'}</td>
                                                <td className="p-3">{formatDelta(sa?.paceSecPerKm, sb?.paceSecPerKm, (v) => formatPaceSec(v), true)}</td>
                                                <td className="p-3 text-[#FC5200]">{sa?.averageHeartRate ? Math.round(sa.averageHeartRate) : '—'}</td>
                                                <td className="p-3 text-indigo-400">{sb?.averageHeartRate ? Math.round(sb.averageHeartRate) : '—'}</td>
                                                <td className="p-3">{formatDelta(sa?.averageHeartRate, sb?.averageHeartRate, (v) => `${Math.round(v)}`, true)}</td>
                                                <td className="p-3">{formatDelta(eDiffA, eDiffB, (v) => `${Math.round(v)}m`)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-amber-500 text-xs uppercase font-bold p-4 bg-amber-500/10 border border-amber-500/20 rounded font-mono">
                            <AlertTriangle className="w-4 h-4 inline mr-2 -mt-0.5" />
                            Splits are not available. Both activities require metric splits.
                        </div>
                    )}
                </div>

                {/* STREAM COMPARISON */}
                <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-8 shadow-sm">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                        <TrendingUp className="w-4 h-4 text-zinc-400" />
                        Stream Telemetry Comparison
                    </h3>

                    {streamGrid.length > 0 ? (
                        <>
                            {/* PACE STREAM */}
                            <div className="space-y-4">
                                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">Pace Stream (min/km)</span>
                                <div className="h-48 w-full border border-white/5 bg-zinc-950/50 rounded p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={streamGrid}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="distLabel" stroke="#71717a" fontSize={9} tickLine={false} tickMargin={8} minTickGap={30} />
                                            <YAxis reversed domain={['dataMin', 'dataMax']} stroke="#71717a" fontSize={9} tickLine={false} tickCount={5} tickFormatter={(v) => formatPaceSec(v)} />
                                            <RechartsTooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', fontFamily: 'monospace'}} labelStyle={{color: '#a1a1aa'}} formatter={(val: number) => formatPaceSec(val)} />
                                            <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                                            <Line type="monotone" name="A Pace" dataKey="a_pace" stroke="#FC5200" strokeWidth={1.5} dot={false} connectNulls />
                                            <Line type="monotone" name="B Pace" dataKey="b_pace" stroke="#818cf8" strokeWidth={1.5} dot={false} connectNulls />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* HEART RATE STREAM */}
                            <div className="space-y-4">
                                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">Heart Rate Stream (BPM)</span>
                                {streamA?.heartrate || streamB?.heartrate ? (
                                <div className="h-48 w-full border border-white/5 bg-zinc-950/50 rounded p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={streamGrid}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="distLabel" stroke="#71717a" fontSize={9} tickLine={false} tickMargin={8} minTickGap={30} />
                                            <YAxis domain={['auto', 'auto']} stroke="#71717a" fontSize={9} tickLine={false} tickCount={5} />
                                            <RechartsTooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', fontFamily: 'monospace'}} labelStyle={{color: '#a1a1aa'}} />
                                            <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                                            <Line type="monotone" name="A Heart Rate" dataKey="a_hr" stroke="#FC5200" strokeWidth={1.5} dot={false} connectNulls />
                                            <Line type="monotone" name="B Heart Rate" dataKey="b_hr" stroke="#818cf8" strokeWidth={1.5} dot={false} connectNulls />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                ) : (
                                    <div className="text-amber-500 text-xs uppercase font-bold font-mono">Heart rate data is not available for one or both activities.</div>
                                )}
                            </div>

                            {/* CADENCE STREAM */}
                            <div className="space-y-4">
                                <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">Cadence Stream (SPM)</span>
                                {streamA?.cadence || streamB?.cadence ? (
                                <div className="h-48 w-full border border-white/5 bg-zinc-950/50 rounded p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={streamGrid}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                            <XAxis dataKey="distLabel" stroke="#71717a" fontSize={9} tickLine={false} tickMargin={8} minTickGap={30} />
                                            <YAxis domain={['auto', 'auto']} stroke="#71717a" fontSize={9} tickLine={false} tickCount={5} />
                                            <RechartsTooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', fontFamily: 'monospace'}} labelStyle={{color: '#a1a1aa'}} />
                                            <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                                            <Line type="monotone" name="A Cadence" dataKey="a_cad" stroke="#FC5200" strokeWidth={1.5} dot={false} connectNulls />
                                            <Line type="monotone" name="B Cadence" dataKey="b_cad" stroke="#818cf8" strokeWidth={1.5} dot={false} connectNulls />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                ) : (
                                    <div className="text-amber-500 text-xs uppercase font-bold font-mono">Cadence stream is required.</div>
                                )}
                            </div>

                            {/* POWER/ELEVATION STREAM */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">Power Stream (W)</span>
                                    {streamA?.watts || streamB?.watts ? (
                                    <div className="h-48 w-full border border-white/5 bg-zinc-950/50 rounded p-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={streamGrid}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                <XAxis dataKey="distLabel" stroke="#71717a" fontSize={9} tickLine={false} tickMargin={8} minTickGap={30} />
                                                <YAxis domain={['auto', 'auto']} stroke="#71717a" fontSize={9} tickLine={false} tickCount={5} />
                                                <RechartsTooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', fontFamily: 'monospace'}} labelStyle={{color: '#a1a1aa'}} />
                                                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                                                <Line type="monotone" name="A Power" dataKey="a_power" stroke="#FC5200" strokeWidth={1.5} dot={false} connectNulls />
                                                <Line type="monotone" name="B Power" dataKey="b_power" stroke="#818cf8" strokeWidth={1.5} dot={false} connectNulls />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    ) : (
                                        <div className="text-amber-500 text-xs uppercase font-bold font-mono">Power data is not available.</div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">Elevation Stream (m)</span>
                                    {streamA?.altitude || streamB?.altitude ? (
                                    <div className="h-48 w-full border border-white/5 bg-zinc-950/50 rounded p-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={streamGrid}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                <XAxis dataKey="distLabel" stroke="#71717a" fontSize={9} tickLine={false} tickMargin={8} minTickGap={30} />
                                                <YAxis domain={['auto', 'auto']} stroke="#71717a" fontSize={9} tickLine={false} tickCount={5} />
                                                <RechartsTooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', fontSize: '11px', fontFamily: 'monospace'}} labelStyle={{color: '#a1a1aa'}} />
                                                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
                                                <Line type="monotone" name="A Elev" dataKey="a_elev" stroke="#FC5200" strokeWidth={1.5} dot={false} connectNulls />
                                                <Line type="monotone" name="B Elev" dataKey="b_elev" stroke="#818cf8" strokeWidth={1.5} dot={false} connectNulls />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    ) : (
                                        <div className="text-amber-500 text-xs uppercase font-bold font-mono">Elevation data is not available.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-amber-500 text-xs uppercase font-bold p-4 bg-amber-500/10 border border-amber-500/20 rounded font-mono flex items-center">
                            <AlertTriangle className="w-4 h-4 inline mr-2" />
                            Stream telemetry is required for detailed visual comparison. At least one selected activity lacks synchronized stream channels.
                        </div>
                    )}
                </div>

                {/* DATA HEALTH PANEL */}
                <div className="bg-[#111113] border border-white/10 rounded-lg p-5 mt-6">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono block mb-3">Diagnostic Data Health Check</span>
                    <ul className="text-[10px] text-zinc-400 font-mono uppercase space-y-2">
                        <li className="flex items-center gap-2">
                            {activities.length > 1 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            Activities eligible for comparison
                        </li>
                        <li className="flex items-center gap-2">
                            {streamA && streamB ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            Activities with streams
                        </li>
                        <li className="flex items-center gap-2">
                            {splitsA.length > 0 && splitsB.length > 0 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            Activities with splits
                        </li>
                        <li className="flex items-center gap-2">
                            {hasRouteA && hasRouteB ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            Activities with GPS
                        </li>
                    </ul>
                </div>

            </div>
        ) : (
            <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 shadow-sm py-20">
                <Database className="w-12 h-12 text-zinc-700 mx-auto" />
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase font-mono tracking-widest">Select Benchmarks</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto uppercase font-mono">
                        Choose two real synced activities from the dropdowns above to initiate the deterministic comparison engine.
                    </p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
