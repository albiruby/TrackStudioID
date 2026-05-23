'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { 
  getActivity, 
  getActivityStream, 
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
import { CanonicalActivity, CanonicalActivityStream } from '../../../data/types';
import { 
  ArrowLeft, 
  Trash2, 
  Calendar, 
  Clock, 
  Compass, 
  Heart, 
  Loader2, 
  Footprints, 
  Award, 
  Bookmark, 
  ChevronRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  Gauge
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
  
  // Unwrapping params Promise in Next.js 15 style
  const { activityId } = use(params);

  const [activity, setActivity] = useState<CanonicalActivity | null>(null);
  const [stream, setStream] = useState<CanonicalActivityStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && !athleteProfile) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [act, str] = await Promise.all([
          getActivity(activityId),
          getActivityStream(activityId)
        ]);

        if (act) {
          setActivity(act);
          setNotes(act.notes || '');
        }
        if (str) {
          setStream(str);
        }
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
      router.push('/');
    } catch (err) {
      console.error('[Delete Error]:', err);
      setIsDeleting(false);
    }
  };

  const handleNotesSave = async () => {
    if (!activity) return;
    try {
      const updated = await upsertActivity({
        ...activity,
        notes: notes
      });
      setActivity(updated);
      setIsEditingNotes(false);
    } catch (err) {
      console.error('[Save Notes Error]:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs tracking-wider uppercase">LOADING TELEMETRY LAB STREAMS...</span>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-transparent text-zinc-200 flex flex-col items-center justify-center p-4 ">
        <div className="border border-white/10 bg-[#111113] p-8 rounded-lg max-w-sm w-full text-center space-y-4">
          <ChevronRight className="w-8 h-8 text-red-500 mx-auto rotate-90" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-400">RECORD NOT DETECTED</h2>
          <p className="text-xs text-zinc-400">
            The telemetry snapshot matching ID <strong className="text-zinc-400">{activityId}</strong> was not found in active cloud collections.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-zinc-800/50 border border-white/10 p-2 text-xs font-bold text-zinc-200 hover:text-white uppercase rounded cursor-pointer mt-4"
          >
            RETURN TO TERMINAL
          </button>
        </div>
      </div>
    );
  }

  const calculatedPaceSec = computePaceFromDistanceTime(activity.distanceMeters, activity.movingTimeSeconds);
  const healthBadge = getActivityDataHealth(activity);

  // Generate graph points based purely on real streams
  const getGraphDataPoints = () => {
    if (!stream || !stream.time) return [];
    
    return stream.time.map((t, idx) => ({
      index: idx,
      Time: t,
      Distance: stream.distance?.[idx] || 0,
      HeartRate: stream.heartrate?.[idx] ?? null,
      Altitude: stream.altitude?.[idx] ?? null,
      Cadence: stream.cadence?.[idx] ?? null,
      Watts: stream.watts?.[idx] ?? null,
      Velocity: stream.velocitySmooth?.[idx] ?? null,
    }));
  };

  const chartData = getGraphDataPoints();

  const hasAnyStreamKeys = activity.hasStreams || (stream?.time && stream.time.length > 0);
  const canRenderHr = stream?.heartrate && stream.heartrate.length > 0;
  const canRenderElev = stream?.altitude && stream.altitude.length > 0;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8 ">
      
      <div className="max-w-[1400px] w-full mx-auto space-y-6">
        
        {/* BACK ACTION & DELETE ROW */}
        <div className="flex justify-between items-center bg-[#111113] p-4 border border-white/10 rounded-lg">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded text-[10px] sm:text-xs tracking-wider uppercase cursor-pointer inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Athletes Register</span>
          </button>

          <div className="flex gap-2">
            {activity.source === 'strava' && !activity.detailSyncedAt && (
              <button
                onClick={async () => {
                  try {
                    const token = await user?.getIdToken();
                    const res = await fetch('/api/strava/sync/activity-detail', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ activityId: activity.id })
                    });
                    if (res.ok) {
                      window.location.reload();
                    } else {
                      alert('Failed to sync details');
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-900/60 text-emerald-400 rounded text-[10px] sm:text-xs tracking-wider uppercase cursor-pointer inline-flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Details</span>
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 hover:bg-red-950/40 border border-white/10 hover:border-red-900/60 text-zinc-500 hover:text-red-400 rounded text-[10px] sm:text-xs tracking-wider uppercase cursor-pointer inline-flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? '...' : 'Erase'}</span>
            </button>
          </div>
        </div>

        {/* PRIMARY DISPLAY META */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6 sm:p-8 space-y-4">
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="p-1 px-3 bg-zinc-800/50 border border-white/10 text-zinc-300 font-extrabold text-xs uppercase tracking-wider rounded">
              {activity.sportType}
            </span>
            <span className={`text-xs border font-bold px-2 py-0.5 rounded ${healthBadge.color}`}>
              {healthBadge.label}
            </span>
            <span className="text-zinc-400 text-xs">
              ID: {activity.id}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white tracking-tight leading-none">
            {activity.name}
          </h1>

          <div className="flex items-center gap-6 text-xs text-zinc-400 border-t border-white/10 pt-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span>{normalizeDate(activity.startDate)}</span>
            </span>
            <span className="text-zinc-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>{new Date(activity.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </span>
          </div>

        </div>

        {/* METRICS SUMMARY GRID BOXES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          
          <div className="bg-[#111113] rounded-lg border border-white/10 p-5 hover:border-white/10 transition-all">
            <span className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide font-bold">Total Distance</span>
            <p className="text-3xl md:text-4xl font-bold tracking-tight mt-2 text-white font-mono">
              {formatDistanceKm(activity.distanceMeters)}
            </p>
          </div>

          <div className="bg-[#111113] rounded-lg border border-white/10 p-5 hover:border-white/10 transition-all">
            <span className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide font-bold">Moving Duration</span>
            <p className="text-3xl md:text-4xl font-bold tracking-tight mt-2 text-white font-mono">
              {formatDuration(activity.movingTimeSeconds)}
            </p>
          </div>

          <div className="bg-[#111113] rounded-lg border border-white/10 p-5 hover:border-white/10 transition-all">
            <span className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide font-bold">Aerobic Pace</span>
            <p className="text-3xl md:text-4xl font-bold tracking-tight mt-2 text-[#FC5200] font-mono">
              {formatPace(calculatedPaceSec)}
            </p>
          </div>

          <div className="bg-[#111113] rounded-lg border border-white/10 p-5 hover:border-white/10 transition-all col-span-2 md:col-span-1">
            <span className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide font-bold">TRIMP workload</span>
            <p className="text-3xl md:text-4xl font-bold tracking-tight mt-2 text-yellow-500 font-mono">
              {activity.trainingLoad || 0}
            </p>
          </div>

        </div>

        {/* GRAPH DIAGRAM DISPLAY PANEL */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-tight text-white mb-1">Cardiorespiratory Form Stream</h3>
              <p className="text-sm font-sans text-zinc-400">Live heart-rate (BPM) decay plotted chronological across length of the workout session</p>
            </div>
            
            {activity.source === 'strava' && !hasAnyStreamKeys && (
              <button
                onClick={async () => {
                  try {
                    const token = await user?.getIdToken();
                    const res = await fetch('/api/strava/sync/activity-streams', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ activityId: activity.id })
                    });
                    if (res.ok) {
                      window.location.reload();
                    } else {
                      alert('Failed to sync streams');
                    }
                  } catch (err) {
                    console.error('Failed to sync streams', err);
                  }
                }}
                className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-900/60 text-purple-400 rounded text-[10px] tracking-wider uppercase cursor-pointer transition-colors"
              >
                Sync Streams
              </button>
            )}
          </div>

          {!hasAnyStreamKeys ? (
             <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded bg-black/20">
                <span className="text-zinc-500 text-xs font-mono font-bold uppercase tracking-widest">Stream data required</span>
             </div>
          ) : (
            <div className="h-64 font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="Distance" style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#3f3f46" tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`} />
                  <YAxis yAxisId="left" domain={['dataMin - 10', 'dataMax + 10']} style={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#3f3f46" />
                  <YAxis yAxisId="right" orientation="right" domain={['dataMin', 'dataMax']} hide />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '4px' }} labelStyle={{ color: '#fff' }} />
                  {canRenderHr && (
                    <Line yAxisId="left" type="monotone" dataKey="HeartRate" name="Heart Rate (BPM)" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  )}
                  {canRenderElev && (
                    <Line yAxisId="right" type="monotone" dataKey="Altitude" name="Altitude (m)" stroke="#3b82f6" strokeWidth={0.8} dot={false} isAnimationActive={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
              {(!canRenderHr && !canRenderElev) && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-zinc-500 text-xs font-mono bg-[#111113]/80 p-2 uppercase">This activity does not include this sensor stream.</span>
                 </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-500" />
              <div>
                <span className="text-sm font-sans text-zinc-400 block uppercase font-bold">Weighted HR Rating</span>
                <span className="text-sm font-bold text-white">{activity.averageHeartRate || '—'} bpm / {activity.maxHeartRate || '—'} max</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Footprints className="w-5 h-5 text-yellow-550" />
              <div>
                <span className="text-sm font-sans text-zinc-400 block uppercase font-bold">Step Rate Cadence</span>
                <span className="text-sm font-bold text-white">{activity.cadenceAvg || '—'} rpm avg</span>
              </div>
            </div>
          </div>

        </div>

        {/* NOTES REFLECTIONS SHEETS */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-tight text-white inline-flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-zinc-400" />
              <span>Athlete Reflections</span>
            </h3>
            {!isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-xs text-[#FC5200] hover:underline font-bold uppercase cursor-pointer border-none"
              >
                EDIT REFLECTION
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-zinc-800/50 border border-white/10 p-3 text-zinc-200 outline-none rounded text-xs"
                placeholder="Document cardiac stress responses, local muscle states, environmental vectors..."
              />
              <div className="flex justify-end gap-3 text-xs">
                <button
                  onClick={() => {
                    setNotes(activity.notes || '');
                    setIsEditingNotes(false);
                  }}
                  className="px-3 py-1.5 hover:bg-zinc-800/50 border border-white/10 text-zinc-400 rounded cursor-pointer uppercase font-bold text-xs"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleNotesSave}
                  className="px-3 py-1.5 bg-[#FC5200] text-black rounded font-bold cursor-pointer uppercase text-xs"
                >
                  SAVE NOTES
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-300 leading-relaxed italic bg-zinc-800/50/10 p-4 border border-white/10 rounded">
              {activity.notes ? activity.notes : 'No athletic reflections or laboratory observations documented for this workout session.'}
            </p>
          )}
        </div>

      </div>

    </div>
  );
}
