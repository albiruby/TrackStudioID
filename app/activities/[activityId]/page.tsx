'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { 
  getActivity, 
  getActivityStream, 
  getLaps,
  getSplits,
  getBestEfforts,
  deleteActivity,
  upsertActivity
} from '../../../lib/firebase/firestore';
import { 
  safeDisplay, 
  formatDistanceKm, 
  formatDuration, 
  formatPace, 
  computePaceFromDistanceTime, 
  normalizeDate, 
  getActivityDataHealth 
} from '../../../lib/data/dataLaw';
import { CanonicalActivity, CanonicalActivityStream, CanonicalLap, CanonicalSplit, CanonicalBestEffort } from '../../../data/types';
import { mapActivityToPayload } from '../../../lib/export/exportPayload';
import ExportCardStudio from '../../../components/export/ExportCardStudio';
import { 
  ArrowLeft, 
  Trash2, 
  Calendar, 
  Clock, 
  Heart, 
  Loader2, 
  Footprints, 
  Bookmark, 
  ChevronRight,
  RefreshCw,
  Activity,
  Mountain,
  FastForward,
  MapPin,
  CheckCircle,
  XCircle,
  TrendingUp,
  Thermometer,
  List,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Line,
  CartesianGrid
} from 'recharts';

interface ActivityDetailPageProps {
  params: Promise<{ activityId: string }>;
}

export default function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();
  
  const { activityId } = use(params);

  const [activity, setActivity] = useState<CanonicalActivity | null>(null);
  const [stream, setStream] = useState<CanonicalActivityStream | null>(null);
  const [laps, setLaps] = useState<CanonicalLap[] | null>(null);
  const [splits, setSplits] = useState<CanonicalSplit[] | null>(null);
  const [bestEfforts, setBestEfforts] = useState<CanonicalBestEffort[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncingDetails, setSyncingDetails] = useState(false);
  const [syncingStreams, setSyncingStreams] = useState(false);
  const [syncingStructured, setSyncingStructured] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !athleteProfile) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [act, str, lps, spl, be] = await Promise.all([
          getActivity(activityId),
          getActivityStream(activityId),
          getLaps(activityId),
          getSplits(activityId),
          getBestEfforts(activityId)
        ]);

        if (act) setActivity(act);
        if (str) setStream(str);
        if (lps) setLaps(lps);
        if (spl) setSplits(spl);
        if (be) setBestEfforts(be);
      } catch (err) {
        console.error('[Error loading activity detail]:', err);
      } finally {
        setLoading(false);
      }
    };

    if (athleteProfile) {
      loadData();
    }
  }, [activityId, athleteProfile, authLoading, router]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently erase this athletic activity from Firestore?')) return;
    setIsDeleting(true);
    try {
      await deleteActivity(activityId);
      router.push('/data-health');
    } catch (err) {
      console.error('[Delete Error]:', err);
      setIsDeleting(false);
    }
  };

  const handleSyncDetail = async () => {
    setSyncingDetails(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/strava/sync/activity-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ activityId: activity?.id })
      });
      if (res.ok) window.location.reload();
      else alert('Failed to sync details');
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingDetails(false);
    }
  };

  const handleSyncStreams = async () => {
    setSyncingStreams(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/strava/sync/activity-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ activityId: activity?.id })
      });
      if (res.ok) window.location.reload();
      else alert('Failed to sync streams');
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingStreams(false);
    }
  };

  const handleSyncStructured = async () => {
    setSyncingStructured(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/strava/sync/activity-structured-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ activityId: activity?.id })
      });
      const data = await res.json();
      if (res.ok) window.location.reload();
      else alert(data.error || 'Failed to sync structured data');
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingStructured(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs tracking-wider uppercase font-bold text-zinc-500">Retrieving Canonical Record</span>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center p-4">
        <div className="border border-zinc-800 bg-[#111113] p-8 rounded-lg max-w-sm w-full text-center space-y-4">
          <ChevronRight className="w-8 h-8 text-red-500 mx-auto rotate-90" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-500">Record Not Detected</h2>
          <p className="text-xs text-zinc-400">Activity {activityId} was not found.</p>
          <button onClick={() => router.push('/')} className="w-full bg-zinc-900 border border-zinc-700 p-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 uppercase rounded mt-4 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const calculatedPaceSec = computePaceFromDistanceTime(activity.distanceMeters, activity.movingTimeSeconds);
  const healthBadge = getActivityDataHealth(activity);

  const getGraphDataPoints = () => {
    if (!stream || !stream.time) return [];
    
    // Downsample chart data to max 500 points for UI render performance
    const rawLen = stream.time.length;
    const step = Math.max(1, Math.floor(rawLen / 500));
    
    const results = [];
    for (let idx = 0; idx < rawLen; idx += step) {
      results.push({
        index: idx,
        Time: stream.time[idx],
        Distance: stream.distance?.[idx] || 0,
        HeartRate: stream.heartrate?.[idx] ?? null,
        Altitude: stream.altitude?.[idx] ?? null,
        Cadence: stream.cadence?.[idx] ?? null,
        Watts: stream.watts?.[idx] ?? null,
        Velocity: stream.velocitySmooth?.[idx] ?? null,
        Pace: stream.velocitySmooth?.[idx] && stream.velocitySmooth[idx] > 0 ? (1000 / stream.velocitySmooth[idx]) : null,
        Temperature: stream.temp?.[idx] ?? null,
        Grade: stream.gradeSmooth?.[idx] ?? null
      });
    }
    return results;
  };

  const chartData = getGraphDataPoints();
  const hasAnyStreamKeys = activity.hasStreams || (stream?.time && stream.time.length > 0);
  const canRenderHr = !!stream?.heartrate && stream.heartrate.length > 0;
  const canRenderElev = !!stream?.altitude && stream.altitude.length > 0;
  const canRenderPower = !!stream?.watts && stream.watts.length > 0;
  const canRenderCadence = !!stream?.cadence && stream.cadence.length > 0;
  
  // Calculate Terrain logic IF grade or elev exists
  let terrainDistribution: { uphill: number, flat: number, downhill: number } | null = null;
  if (stream?.gradeSmooth && stream.gradeSmooth.length > 0) {
      let uph = 0; let flat = 0; let dwn = 0;
      stream.gradeSmooth.forEach(g => {
         if (g > 1) uph++;
         else if (g < -1) dwn++;
         else flat++;
      });
      const tot = uph + flat + dwn;
      terrainDistribution = { 
          uphill: Math.round((uph/tot)*100), 
          flat: Math.round((flat/tot)*100), 
          downhill: Math.round((dwn/tot)*100) 
      };
  }

  // Calculate HR Zones
  const hrZonesRaw = athleteProfile?.hrZones; 
  let hrDistribution: { z1: number, z2: number, z3: number, z4: number, z5: number, total: number } | null = null;
  let hrZonesError = "";
  if (!stream?.heartrate || stream.heartrate.length === 0) {
      hrZonesError = "Heart rate stream data is required.";
  } else if (!hrZonesRaw) {
      hrZonesError = "Heart rate zones are required.";
  } else {
      hrDistribution = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, total: 0 };
      for (let i = 0; i < stream.heartrate.length - 1; i++) {
          const hr = stream.heartrate[i];
          const duration = stream.time![i+1] - stream.time![i];
          if (duration > 0 && duration < 300) { 
              if (hr >= hrZonesRaw.z5[0]) hrDistribution.z5 += duration;
              else if (hr >= hrZonesRaw.z4[0]) hrDistribution.z4 += duration;
              else if (hr >= hrZonesRaw.z3[0]) hrDistribution.z3 += duration;
              else if (hr >= hrZonesRaw.z2[0]) hrDistribution.z2 += duration;
              else if (hr >= hrZonesRaw.z1[0]) hrDistribution.z1 += duration;
              hrDistribution.total += duration;
          }
      }
  }

  // Calculate Pace Zones
  const paceZonesRaw = athleteProfile?.paceZones;
  let paceDistribution: { z1: number, z2: number, z3: number, z4: number, z5: number, total: number } | null = null;
  let paceZonesError = "";
  const hasPaceData = stream?.velocitySmooth && stream.velocitySmooth.length > 0;
  
  if (!hasPaceData) {
      paceZonesError = "Pace stream data is required.";
  } else if (!paceZonesRaw) {
      paceZonesError = "Pace zones are required.";
  } else {
      paceDistribution = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, total: 0 };
      for (let i = 0; i < stream.velocitySmooth!.length - 1; i++) {
          const vel = stream.velocitySmooth![i];
          const duration = stream.time![i+1] - stream.time![i];
          if (duration > 0 && duration < 300 && vel > 0.5) {
              const paceSecPerKm = 1000 / vel;
              if (paceSecPerKm <= paceZonesRaw.z5[1]) paceDistribution.z5 += duration;
              else if (paceSecPerKm <= paceZonesRaw.z4[1]) paceDistribution.z4 += duration;
              else if (paceSecPerKm <= paceZonesRaw.z3[1]) paceDistribution.z3 += duration;
              else if (paceSecPerKm <= paceZonesRaw.z2[1]) paceDistribution.z2 += duration;
              else if (paceSecPerKm <= paceZonesRaw.z1[1]) paceDistribution.z1 += duration;
              paceDistribution.total += duration;
          }
      }
  }

  const booleanIcon = (val: boolean) => val ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-zinc-700" />;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col p-4 sm:p-8 font-sans">
      <div className="max-w-[1200px] w-full mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-wrap justify-between items-center bg-[#111113] p-4 border border-zinc-800/80 rounded gap-4 shadow-sm">
          <button onClick={() => router.push('/')} className="px-3 py-1.5 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Register</span>
          </button>

          <div className="flex flex-wrap gap-2">
            {!activity.detailSyncedAt && (
              <button onClick={handleSyncDetail} disabled={syncingDetails} className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors">
                <RefreshCw className={`w-3 h-3 ${syncingDetails ? 'animate-spin cursor-not-allowed' : ''}`} />
                <span>Sync Detail</span>
              </button>
            )}
            {activity.detailSyncedAt && !activity.streamsSyncedAt && (
              <button onClick={handleSyncStreams} disabled={syncingStreams} className="px-3 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-900/60 text-indigo-400 rounded text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-2 transition-colors">
                <RefreshCw className={`w-3 h-3 ${syncingStreams ? 'animate-spin cursor-not-allowed' : ''}`} />
                <span>Sync Streams</span>
              </button>
            )}
            {activity.detailSyncedAt && !activity.structuredDataSyncedAt && (
              <button onClick={handleSyncStructured} disabled={syncingStructured} className="px-3 py-1.5 bg-pink-950/40 hover:bg-pink-900/60 border border-pink-900/60 text-pink-400 rounded text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-2 transition-colors">
                <RefreshCw className={`w-3 h-3 ${syncingStructured ? 'animate-spin cursor-not-allowed' : ''}`} />
                <span>Sync Laps & Splits</span>
              </button>
            )}
             <button onClick={() => setIsExportStudioOpen(true)} className="px-3 py-1.5 bg-[#FC5200]/15 hover:bg-[#FC5200]/25 border border-[#FC5200]/40 text-[#FC5200] hover:text-white rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-all cursor-pointer">
               Export Card
             </button>
            <button onClick={() => router.push(`/compare-lab?activityId=${activity.id}&tab=planned`)} className="px-3 py-1.5 bg-[#FC5200]/10 hover:bg-[#FC5200]/20 border border-[#FC5200]/30 text-[#FC5200] hover:text-white rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors">
              <Activity className="w-3.5 h-3.5" />
              <span>Compare Lab</span>
            </button>
            <button onClick={handleDelete} disabled={isDeleting} className="px-3 py-1.5 hover:bg-red-950/40 hover:border-red-900/60 border border-zinc-800 text-zinc-500 hover:text-red-400 rounded text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-2 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDeleting ? '...' : 'Erase'}</span>
            </button>
          </div>
        </div>

        {/* METADATA OVERVIEW */}
        <div className="bg-[#111113] border border-zinc-800/80 rounded p-6 sm:p-8 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold text-[9px] uppercase tracking-wider rounded">
              {activity.sportType || 'Activity'}
            </span>
            <span className={`text-[9px] border font-bold px-2 py-0.5 rounded uppercase tracking-wider ${healthBadge.color}`}>
              {healthBadge.label}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2 leading-none">
            {activity.name}
          </h1>

          <div className="flex items-center gap-3 md:gap-5 text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {normalizeDate(activity.startDate)}
            </span>
            <span className="text-zinc-700">&bull;</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date(activity.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
            <span className="text-zinc-700">&bull;</span>
            <span className="text-[#FC5200]">SRC: {activity.source?.toUpperCase() || 'MANUAL'}</span>
          </div>
        </div>

        {/* TOP METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-[#111113] rounded border border-zinc-800/80 p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Distance</span>
            <p className="text-xl md:text-2xl font-bold mt-1 text-zinc-100 font-mono">{formatDistanceKm(activity.distanceMeters)}</p>
          </div>
          <div className="bg-[#111113] rounded border border-zinc-800/80 p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Moving Time</span>
            <p className="text-xl md:text-2xl font-bold mt-1 text-zinc-100 font-mono">{formatDuration(activity.movingTimeSeconds || undefined)}</p>
          </div>
          <div className="bg-[#111113] rounded border border-zinc-800/80 p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Avg Pace</span>
            <p className="text-xl md:text-2xl font-bold mt-1 text-[#FC5200] font-mono">{formatPace(calculatedPaceSec)}</p>
          </div>
          <div className="bg-[#111113] rounded border border-zinc-800/80 p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Avg Heart Rate</span>
            <p className="text-xl md:text-2xl font-bold mt-1 text-zinc-100 font-mono">{activity.averageHeartRate ? Math.round(activity.averageHeartRate) : '—'} <span className="text-[10px] text-zinc-600 font-sans tracking-wide">BPM</span></p>
          </div>
          <div className="bg-[#111113] rounded border border-zinc-800/80 p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Avg Power</span>
            <p className="text-xl md:text-2xl font-bold mt-1 text-zinc-100 font-mono">{activity.averageWatts ? Math.round(activity.averageWatts) : '—'} <span className="text-[10px] text-zinc-600 font-sans tracking-wide">W</span></p>
          </div>
          <div className="bg-[#111113] rounded border border-zinc-800/80 p-5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Calories Burned</span>
            <p className="text-xl md:text-2xl font-bold mt-1 text-zinc-100 font-mono">{activity.calories ? Math.round(activity.calories) : '—'} <span className="text-[10px] text-zinc-600 font-sans tracking-wide">KCAL</span></p>
          </div>
        </div>

        {/* MAP & META ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-[#111113] border border-zinc-800/80 rounded p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4 inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FC5200]" /> GPS Route Map
              </h3>
              {(activity.polyline || activity.summaryPolyline) ? (
                <div className="w-full h-80 bg-zinc-950 border border-zinc-800 rounded flex flex-col items-center justify-center relative overflow-hidden">
                   <div className="absolute inset-0 pattern-grid-lg text-zinc-800/30"></div>
                   <span className="text-zinc-600 text-[10px] font-mono font-bold tracking-widest uppercase relative z-10 bg-[#111113] px-3 py-1 border border-zinc-800">Map renderer required</span>
                </div>
              ) : (
                <div className="w-full h-80 bg-black border border-dashed border-zinc-800/80 rounded flex items-center justify-center">
                   <span className="text-zinc-600/80 text-xs font-bold font-mono tracking-widest uppercase">This activity does not include GPS route data.</span>
                </div>
              )}
           </div>

           <div className="bg-[#111113] border border-zinc-800/80 rounded p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Data Integration Health
                </h3>
                <div className="grid grid-cols-1 gap-y-3.5 text-[10px] font-bold tracking-wider uppercase">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.detailSyncedAt)} Detailed Meta</div></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.streamsSyncedAt)} Sensor Streams</div></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.structuredDataSyncedAt)} Laps / Splits</div></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.hasBestEfforts)} Best Efforts</div></div>
                  <div className="w-full h-px bg-zinc-800/60 my-1"></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.averageHeartRate)} Heart Rate Data</div></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.averageWatts)} Power Data</div></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.cadenceAvg)} Cadence Data</div></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-zinc-400">{booleanIcon(!!activity.polyline)} GPS Polyline</div></div>
                </div>
              </div>
           </div>
        </div>

        {/* ACTIVITY STREAM ANALYSIS */}
        <div className="bg-[#111113] border border-zinc-800/80 rounded p-6">
          <div className="flex flex-col mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1 inline-flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FC5200]" /> High-Resolution Activity Streams
            </h3>
          </div>

          {!hasAnyStreamKeys ? (
             <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-800/80 rounded bg-zinc-900/30">
                <span className="text-zinc-600/80 text-xs font-bold uppercase tracking-widest font-mono">Stream data required</span>
             </div>
          ) : (
            <div className="h-80 w-full text-[10px] font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="Distance" stroke="#52525b" tick={{ fill: '#71717a' }} tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`} />
                  <YAxis yAxisId="left" stroke="#52525b" tick={{ fill: '#71717a' }} />
                  <YAxis yAxisId="right" orientation="right" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '4px' }} 
                    labelStyle={{ color: '#fff', marginBottom: '8px', fontSize: '11px', fontFamily: 'sans-serif', fontWeight: 'bold' }} 
                    labelFormatter={(val) => `${(val as number / 1000).toFixed(2)} km`}
                  />
                  {canRenderHr && <Line yAxisId="left" type="monotone" dataKey="HeartRate" name="Heart Rate" stroke="#ef4444" strokeWidth={1} dot={false} isAnimationActive={false} />}
                  {canRenderElev && <Line yAxisId="right" type="monotone" dataKey="Altitude" name="Altitude" stroke="#a1a1aa" strokeWidth={0.8} dot={false} isAnimationActive={false} />}
                  {canRenderPower && <Line yAxisId="left" type="monotone" dataKey="Watts" name="Power" stroke="#a855f7" strokeWidth={1} dot={false} isAnimationActive={false} />}
                  {canRenderCadence && <Line yAxisId="left" type="monotone" dataKey="Cadence" name="Cadence" stroke="#0ea5e9" strokeWidth={1} dot={false} isAnimationActive={false} />}
                </LineChart>
              </ResponsiveContainer>
              {(!canRenderHr && !canRenderElev && !canRenderPower && !canRenderCadence) && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-zinc-400 text-xs bg-[#111113]/90 px-4 py-2 uppercase font-bold tracking-wider font-sans border border-zinc-800">This activity does not include standard sensor streams.</span>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* DETAILS & TERRAIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111113] border border-zinc-800/80 rounded p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
              <Mountain className="w-4 h-4 text-emerald-500" /> Terrain Breakdown
            </h3>
            
            {!terrainDistribution ? (
               <div className="w-full flex-1 py-8 h-full min-h-[140px] flex items-center justify-center border border-dashed border-zinc-800/80 rounded">
                  <span className="text-zinc-600/80 text-[10px] uppercase font-bold font-mono tracking-widest text-center px-4">Elevation or grade stream data is required.</span>
               </div>
            ) : (
               <div className="flex flex-col flex-1 h-[140px] justify-center gap-5">
                   <div className="w-full h-8 bg-zinc-900 rounded overflow-hidden flex border border-zinc-800">
                      <div className="h-full bg-red-900/60 transition-all flex items-center justify-center text-[9px] font-bold" style={{ width: `${terrainDistribution.uphill}%`}}>{terrainDistribution.uphill > 10 ? 'UPHILL' : ''}</div>
                      <div className="h-full bg-zinc-600/30 transition-all flex items-center justify-center text-[9px] font-bold text-zinc-400" style={{ width: `${terrainDistribution.flat}%`}}>{terrainDistribution.flat > 10 ? 'FLAT' : ''}</div>
                      <div className="h-full bg-emerald-900/40 transition-all flex items-center justify-center text-[9px] font-bold" style={{ width: `${terrainDistribution.downhill}%`}}>{terrainDistribution.downhill > 10 ? 'DOWNHILL' : ''}</div>
                   </div>
                   <div className="grid grid-cols-3 text-center text-[10px] uppercase font-bold tracking-wider text-zinc-400 gap-2">
                       <div><span className="text-red-400 block text-lg font-mono">{terrainDistribution.uphill}%</span> Uphill</div>
                       <div><span className="text-zinc-300 block text-lg font-mono">{terrainDistribution.flat}%</span> Flat / Level</div>
                       <div><span className="text-emerald-400 block text-lg font-mono">{terrainDistribution.downhill}%</span> Downhill</div>
                   </div>
               </div>
            )}
          </div>
          
          <div className="bg-[#111113] border border-zinc-800/80 rounded p-6 text-sm flex flex-col justify-between">
             <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
                  <List className="w-4 h-4 text-blue-500" /> Activity Metadata
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Elapsed Time</span>
                    <span className="text-zinc-200 font-mono text-xs">{formatDuration(activity.raw?.elapsed_time || activity.movingTimeSeconds || undefined)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Device</span>
                    <span className="text-zinc-200 font-mono text-xs">{activity.deviceName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Elevation Range</span>
                    <span className="text-zinc-200 font-mono text-xs">{activity.elevLow != null && activity.elevHigh != null ? `${activity.elevLow}m - ${activity.elevHigh}m` : '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-800/60">
                    <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold">Temperature</span>
                    <span className="text-zinc-200 font-mono text-xs">{stream?.temp ? `${Math.round(stream.temp.reduce((a,b)=>a+b,0)/stream.temp.length)} °C (Avg)` : '—'}</span>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* DISTRIBUTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111113] border border-zinc-800/80 rounded p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" /> Heart Rate Distribution
            </h3>
            {hrZonesError ? (
               <div className="w-full flex-1 py-8 h-[140px] flex items-center justify-center border border-dashed border-zinc-800/80 rounded">
                  <span className="text-zinc-600/80 text-[10px] uppercase font-bold font-mono tracking-widest text-center px-4">{hrZonesError}</span>
               </div>
            ) : hrDistribution ? (
                <div className="space-y-3 font-mono text-[10px]">
                  {[
                    { label: 'Z5 Max', val: hrDistribution.z5, num: 5 },
                    { label: 'Z4 Threshold', val: hrDistribution.z4, num: 4 },
                    { label: 'Z3 Tempo', val: hrDistribution.z3, num: 3 },
                    { label: 'Z2 Aerobic', val: hrDistribution.z2, num: 2 },
                    { label: 'Z1 Recovery', val: hrDistribution.z1, num: 1 }
                  ].map((z, i) => {
                      const pct = hrDistribution!.total > 0 ? (z.val / hrDistribution!.total) * 100 : 0;
                      return (
                         <div key={i} className="flex items-center gap-3">
                            <div className="w-24 text-zinc-400 font-sans font-bold uppercase tracking-wider">{z.label}</div>
                            <div className="flex-1 h-3 bg-zinc-900 rounded overflow-hidden">
                               <div className="h-full bg-red-900" style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="w-16 text-right text-zinc-300">{formatDuration(z.val || undefined)}</div>
                            <div className="w-10 text-right text-zinc-500">{Math.round(pct)}%</div>
                         </div>
                      );
                  })}
                </div>
            ) : null}
          </div>
          <div className="bg-[#111113] border border-zinc-800/80 rounded p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Pace Zone Distribution
            </h3>
            {paceZonesError ? (
               <div className="w-full flex-1 py-8 h-[140px] flex items-center justify-center border border-dashed border-zinc-800/80 rounded">
                  <span className="text-zinc-600/80 text-[10px] uppercase font-bold font-mono tracking-widest text-center px-4">{paceZonesError}</span>
               </div>
            ) : paceDistribution ? (
                <div className="space-y-3 font-mono text-[10px]">
                  {[
                    { label: 'Z5 Anaerobic', val: paceDistribution.z5, num: 5 },
                    { label: 'Z4 Threshold', val: paceDistribution.z4, num: 4 },
                    { label: 'Z3 Tempo', val: paceDistribution.z3, num: 3 },
                    { label: 'Z2 Aerobic', val: paceDistribution.z2, num: 2 },
                    { label: 'Z1 Recovery', val: paceDistribution.z1, num: 1 }
                  ].map((z, i) => {
                      const pct = paceDistribution!.total > 0 ? (z.val / paceDistribution!.total) * 100 : 0;
                      return (
                         <div key={i} className="flex items-center gap-3">
                            <div className="w-28 text-zinc-400 font-sans font-bold uppercase tracking-wider">{z.label}</div>
                            <div className="flex-1 h-3 bg-zinc-900 rounded overflow-hidden">
                               <div className="h-full bg-indigo-900" style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="w-16 text-right text-zinc-300">{formatDuration(z.val || undefined)}</div>
                            <div className="w-10 text-right text-zinc-500">{Math.round(pct)}%</div>
                         </div>
                      );
                  })}
                </div>
            ) : null}
          </div>
        </div>

        {/* LAPS */}
        <div className="bg-[#111113] border border-zinc-800/80 rounded overflow-hidden p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-pink-500" /> Canonical Laps Data
          </h3>
          {laps && laps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="text-[9px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60">
                  <tr>
                    <th className="pb-3 font-bold px-2">Lap</th>
                    <th className="pb-3 font-bold px-2">Name</th>
                    <th className="pb-3 font-bold px-2">Dist (m)</th>
                    <th className="pb-3 font-bold px-2">Moving Time</th>
                    <th className="pb-3 font-bold px-2 text-[#FC5200]">Pace Avg</th>
                    <th className="pb-3 font-bold px-2">HR Avg/Max</th>
                    <th className="pb-3 font-bold px-2">Cadence</th>
                    <th className="pb-3 font-bold px-2">Pwr Avg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {laps.map((lap, i) => (
                    <tr key={i} className="hover:bg-zinc-900 transition-colors">
                      <td className="py-2.5 px-2 font-mono text-zinc-400">{lap.lapIndex}</td>
                      <td className="py-2.5 px-2 text-zinc-300 font-bold">{lap.name || `Lap ${lap.lapIndex}`}</td>
                      <td className="py-2.5 px-2 font-mono text-zinc-300">{Math.round(lap.distanceMeters || 0)}</td>
                      <td className="py-2.5 px-2 font-mono text-zinc-300">{formatDuration(lap.movingTimeSeconds ?? undefined)}</td>
                      <td className="py-2.5 px-2 font-mono text-indigo-400 font-bold">{lap.paceSecPerKm ? formatPace(lap.paceSecPerKm) : '—'}</td>
                      <td className="py-2.5 px-2 font-mono text-red-500">{(lap.averageHeartRate || lap.maxHeartRate) ? `${Math.round(lap.averageHeartRate||0)} / ${Math.round(lap.maxHeartRate||0)}` : '—'}</td>
                      <td className="py-2.5 px-2 font-mono text-zinc-300">{lap.averageCadence ? Math.round(lap.averageCadence) : '—'}</td>
                      <td className="py-2.5 px-2 font-mono text-purple-400">{lap.averageWatts ? Math.round(lap.averageWatts) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="w-full py-10 text-center border border-dashed border-zinc-800/80 rounded">
                <span className="text-zinc-600/80 text-[10px] font-bold font-mono tracking-widest uppercase">No laps recorded for this activity.</span>
             </div>
          )}
        </div>

        {/* SPLITS */}
        <div className="bg-[#111113] border border-zinc-800/80 rounded overflow-hidden p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
            <List className="w-4 h-4 text-orange-500" /> Per-KM Metric Splits
          </h3>
          {splits && splits.filter(s => s.splitType === 'metric').length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="text-[9px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60">
                  <tr>
                    <th className="pb-3 font-bold px-2 text-zinc-300">KM</th>
                    <th className="pb-3 font-bold px-2 text-[#FC5200]">Pace Avg</th>
                    <th className="pb-3 font-bold px-2">Moving Time</th>
                    <th className="pb-3 font-bold px-2">Elev (±)</th>
                    <th className="pb-3 font-bold px-2">HR Avg</th>
                    <th className="pb-3 font-bold px-2">Pwr Avg</th>
                    <th className="pb-3 font-bold px-2">Cadence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 font-mono">
                  {splits.filter(s => s.splitType === 'metric').map((split, i) => (
                    <tr key={i} className="hover:bg-zinc-900 transition-colors">
                      <td className="py-2.5 px-2 text-zinc-200 font-bold">{split.splitIndex}</td>
                      <td className="py-2.5 px-2 font-bold text-zinc-200">{split.paceSecPerKm ? formatPace(split.paceSecPerKm) : '—'}</td>
                      <td className="py-2.5 px-2 text-zinc-400">{formatDuration(split.movingTimeSeconds ?? undefined)}</td>
                      <td className="py-2.5 px-2 text-emerald-500">{split.elevationDifferenceMeters ? (split.elevationDifferenceMeters > 0 ? `+${Math.round(split.elevationDifferenceMeters)}` : Math.round(split.elevationDifferenceMeters)) : '—'}</td>
                      <td className="py-2.5 px-2 text-red-500">{split.averageHeartRate ? Math.round(split.averageHeartRate) : '—'}</td>
                      <td className="py-2.5 px-2 text-purple-400">{split.averageWatts ? Math.round(split.averageWatts) : '—'}</td>
                      <td className="py-2.5 px-2 text-blue-400">{split.averageCadence ? Math.round(split.averageCadence) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="w-full py-10 text-center border border-dashed border-zinc-800/80 rounded">
                <span className="text-zinc-600/80 text-[10px] font-bold font-mono tracking-widest uppercase">Metric splits not generated for this activity.</span>
             </div>
          )}
        </div>

        {/* BEST EFFORTS */}
        <div className="bg-[#111113] border border-zinc-800/80 rounded p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-5 inline-flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" /> Best Efforts
          </h3>
          {bestEfforts && bestEfforts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {bestEfforts.map((be, i) => (
                 <div key={i} className="p-4 border border-zinc-800/80 rounded bg-zinc-900 flex flex-col hover:border-zinc-700 transition-colors">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-2">{be.name}</span>
                    <span className="text-2xl font-bold font-mono text-zinc-100">{formatDuration(be.elapsedTimeSeconds ?? undefined)}</span>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-zinc-800/50 text-[10px] uppercase font-bold text-zinc-500">
                       <span className="text-indigo-400 tracking-wider font-mono">{be.paceSecPerKm ? formatPace(be.paceSecPerKm) + '/km' : '— pace'}</span>
                       {be.averageHeartRate && <span className="text-red-500/80 flex items-center gap-1 font-mono"><Heart className="w-3 h-3 text-red-500/60"/> {Math.round(be.averageHeartRate)}</span>}
                    </div>
                 </div>
               ))}
            </div>
          ) : (
             <div className="w-full py-10 text-center border border-dashed border-zinc-800/80 rounded">
                <span className="text-zinc-600/80 text-[10px] font-bold font-mono tracking-widest uppercase">Best effort data is not available for this activity.</span>
             </div>
          )}
        </div>

        {/* EXPORT CARD STUDIO MODAL */}
        {activity && (
          <ExportCardStudio
            payload={mapActivityToPayload(activity, athleteProfile?.displayName || 'Athlete')}
            isOpen={isExportStudioOpen}
            onClose={() => setIsExportStudioOpen(false)}
            preferredUnits={athleteProfile?.units || 'metric'}
          />
        )}

      </div>
    </div>
  );
}
