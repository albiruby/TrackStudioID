'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { db } from '../../../lib/firebase/client';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { deleteCustomWorkout } from '../../../lib/firebase/firestore';
import {
  ArrowLeft,
  Dumbbell,
  Clock,
  Activity,
  Trash2,
  Calendar,
  Layers,
  AlertCircle,
  RefreshCw,
  Zap,
  Tag,
  BookOpen
} from 'lucide-react';

interface WorkoutStep {
  id: string;
  order: number;
  name: string;
  type: 'warmup' | 'work' | 'recovery' | 'cooldown' | 'rest' | 'repeat';
  durationSeconds?: number;
  distanceMeters?: number;
  targetPaceMinSecPerKm?: string;
  targetHeartRateZone?: string;
  targetPowerWatts?: number;
  targetCadence?: number;
  targetRpe?: number;
  notes?: string;
  repeatCount?: number;
  childSteps?: WorkoutStep[];
}

interface CanonicalWorkout {
  id: string;
  userId: string;
  title: string;
  sportType: 'run' | 'ride' | 'strength' | 'other';
  source: 'manual' | 'intervals';
  workoutType: 'easy' | 'long_run' | 'tempo' | 'threshold' | 'interval' | 'repetition' | 'race' | 'recovery' | 'custom';
  description?: string;
  scheduledDate?: string;
  estimatedDurationSeconds?: number;
  estimatedDistanceMeters?: number;
  steps: WorkoutStep[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  raw?: any;
}

export default function WorkoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params?.workoutId as string;
  
  const { user, loading: authLoading } = useAuth();
  
  const [workout, setWorkout] = useState<CanonicalWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !workoutId) return;
    const uid = user.uid;

    async function fetchWorkoutDetail() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const docRef = doc(db, 'users', uid, 'workouts', workoutId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setWorkout({ id: snap.id, ...snap.data() } as CanonicalWorkout);
        } else {
          setErrorMsg("Workout template not found in your tracking database. It may have been relocated or deleted.");
        }
      } catch (err: any) {
        console.error("Error fetching workout steps:", err);
        setErrorMsg("Failed to retrieve athletic workout steps from server databases.");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkoutDetail();
  }, [user, workoutId]);

  const handleDelete = async () => {
    if (!user || !workoutId) return;
    if (confirm("Are you absolutely sure you want to permanently delete this structured workout design?")) {
      setDeleting(true);
      try {
        await deleteCustomWorkout(user.uid, workoutId);
        router.push('/workout-library');
      } catch (err) {
        console.error("Failed to delete from database:", err);
        alert("Failed to delete custom workout.");
        setDeleting(false);
      }
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '—';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '—';
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const getStepBg = (type: string) => {
    switch (type) {
      case 'warmup': return 'border-amber-500/20 bg-amber-500/5';
      case 'work': return 'border-[#FC5200]/35 bg-[#FC5200]/5';
      case 'recovery': return 'border-emerald-500/20 bg-emerald-500/5';
      case 'cooldown': return 'border-sky-500/20 bg-sky-500/5';
      case 'rest': return 'border-zinc-500/20 bg-zinc-500/5';
      default: return 'border-white/10 bg-zinc-900/40';
    }
  };

  const getStepTextAccent = (type: string) => {
    switch (type) {
      case 'warmup': return 'text-amber-400';
      case 'work': return 'text-[#FC5200]';
      case 'recovery': return 'text-emerald-400';
      case 'cooldown': return 'text-sky-400';
      case 'rest': return 'text-zinc-400';
      default: return 'text-white';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 font-mono">Loading Core Sequence...</span>
      </div>
    );
  }

  if (errorMsg || !workout) {
    return (
      <div className="min-h-screen bg-transparent text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111113] border border-white/10 p-8 rounded-lg text-center space-y-4 shadow-xl">
          <AlertCircle className="w-10 h-10 text-[#FC5200] mx-auto" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">Index lookups failed</h2>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            {errorMsg || "Requested workout is unaccessible."}
          </p>
          <button
            onClick={() => router.push('/workout-library')}
            className="px-4 py-2 bg-zinc-900 border border-white/10 text-xs text-white uppercase rounded hover:border-white/20 transition cursor-pointer"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1000px] w-full mx-auto space-y-6 animate-fade-in">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/workout-library')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FC5200]" />
                <span className="text-[10px] text-zinc-450 font-mono uppercase font-bold">WORKOUT PROFILE SPECIFICATION</span>
              </div>
              <h1 className="text-base font-bold uppercase tracking-wide text-white mt-0.5 font-sans leading-tight">
                {workout.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-950/20 border border-red-900/50 hover:bg-red-950/40 text-red-400 font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer transition select-none flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? "DELETING..." : "Delete Design"}
            </button>
          </div>
        </div>

        {/* BODY DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* LEFT 1 COL: AT-A-GLANCE CONSTANTS */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
              <span className="text-[10px] text-[#FC5200] font-mono font-bold uppercase block tracking-wider">Metrics Inventory</span>
              
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-500 uppercase">Sport Type:</span>
                  <span className="text-white uppercase font-bold">{workout.sportType}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-500 uppercase">Workout Style:</span>
                  <span className="text-[#FC5200] uppercase font-bold">{workout.workoutType}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-500 uppercase">Origin:</span>
                  <span className="text-white uppercase font-bold">{workout.source}</span>
                </div>
                {workout.scheduledDate && (
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-zinc-500 uppercase">Target Date:</span>
                    <span className="text-white uppercase font-bold">{workout.scheduledDate}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-zinc-500 uppercase">Estimated Duration:</span>
                  <span className="text-white font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#FC5200]" />
                    {formatDuration(workout.estimatedDurationSeconds)}
                  </span>
                </div>
                {workout.estimatedDistanceMeters ? (
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-zinc-500 uppercase">Estimated Distance:</span>
                    <span className="text-white font-bold flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-[#FC5200]" />
                      {formatDistance(workout.estimatedDistanceMeters)}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* TAGS INDEX DISPLAY */}
              {workout.tags && workout.tags.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <span className="text-[9px] text-zinc-500 uppercase font-mono block">Categorization Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {workout.tags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-950 text-zinc-400 border border-white/5 text-[9px] font-mono uppercase rounded flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-zinc-650" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {workout.description && (
              <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-2">Instructions Notes</span>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed whitespace-pre-line">
                  {workout.description}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT 2 COLS: STRUCTURED SEQ STEPS VISUALIZATION */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
              <div>
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">EXECUTION PIPELINE</span>
                <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-0.5">Steps Specification</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Deterministic segments schema configured for real workout execution tracking.
                </p>
              </div>

              {(!workout.steps || workout.steps.length === 0) ? (
                <div className="border border-dashed border-white/5 rounded-lg p-12 text-center text-zinc-600 font-mono text-xs">
                  This workout design does not contain any execution steps.
                </div>
              ) : (
                <div className="space-y-4 font-mono select-none">
                  {workout.steps.map((st, idx) => {
                    const isRepeat = st.type === 'repeat';

                    if (isRepeat) {
                      return (
                        <div key={st.id || idx} className="border-l-2 border-[#FC5200] bg-zinc-950/40 p-5 rounded-r-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-white bg-[#FC5200]/20 border border-[#FC5200]/40 p-1 px-2 rounded uppercase">
                              Repeat Block Sets
                            </span>
                            <span className="text-xs text-zinc-400">
                              Perform the following subsegments <strong className="text-white font-mono font-bold">{st.repeatCount || 2} times</strong> sequentially:
                            </span>
                          </div>

                          <div className="pl-4 border-l border-white/10 space-y-3 mt-2">
                            {st.childSteps && st.childSteps.length > 0 ? (
                              st.childSteps.map((child, childIdx) => (
                                <div key={child.id || childIdx} className={`border p-4 rounded-lg space-y-2.5 ${getStepBg(child.type)}`}>
                                  <div className="flex justify-between items-center bg-transparent">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-zinc-500">#{childIdx + 1}</span>
                                      <span className={`text-xs uppercase font-extrabold tracking-wider ${getStepTextAccent(child.type)}`}>
                                        {child.type}
                                      </span>
                                      <span className="text-xs text-white font-sans font-bold uppercase">{child.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-[10px] text-zinc-400">
                                      {child.durationSeconds ? (
                                        <span>Duration: {formatDuration(child.durationSeconds)}</span>
                                      ) : child.distanceMeters ? (
                                        <span>Distance: {formatDistance(child.distanceMeters)}</span>
                                      ) : <span>Open time</span>}
                                    </div>
                                  </div>

                                  {/* Step details inside repeat */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[10px] text-zinc-400">
                                    {child.targetHeartRateZone && (
                                      <div className="bg-black/10 p-1.5 px-2.5 rounded border border-white/5">
                                        <span className="text-zinc-550 block text-[9px]">HR ZONE</span>
                                        <strong className="text-white uppercase font-bold block">{child.targetHeartRateZone}</strong>
                                      </div>
                                    )}
                                    {child.targetPaceMinSecPerKm && (
                                      <div className="bg-black/10 p-1.5 px-2.5 rounded border border-white/5">
                                        <span className="text-zinc-550 block text-[9px]">TARGET PACE</span>
                                        <strong className="text-white block">{child.targetPaceMinSecPerKm} /km</strong>
                                      </div>
                                    )}
                                    {child.targetPowerWatts && (
                                      <div className="bg-black/10 p-1.5 px-2.5 rounded border border-white/5">
                                        <span className="text-zinc-550 block text-[9px]">POWER TARGET</span>
                                        <strong className="text-white block">{child.targetPowerWatts} Watts</strong>
                                      </div>
                                    )}
                                    {child.targetRpe && (
                                      <div className="bg-black/10 p-1.5 px-2.5 rounded border border-white/5">
                                        <span className="text-zinc-550 block text-[9px]">RPE SCALE</span>
                                        <strong className="text-white block">{child.targetRpe} / 10</strong>
                                      </div>
                                    )}
                                  </div>

                                  {child.notes && (
                                    <div className="text-[10px] text-zinc-500 italic font-sans block">
                                      {child.notes}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-zinc-650 italic">No subsegments within block.</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={st.id || idx} className={`border p-5 rounded-lg space-y-3.5 ${getStepBg(st.type)}`}>
                        <div className="flex justify-between items-center bg-transparent">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 font-extrabold">SEGMENT #{idx + 1}</span>
                            <span className={`text-xs uppercase font-extrabold tracking-wider ${getStepTextAccent(st.type)}`}>
                              {st.type}
                            </span>
                            <span className="text-xs text-white font-sans font-bold uppercase">{st.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            {st.durationSeconds ? (
                              <span>Duration: {formatDuration(st.durationSeconds)}</span>
                            ) : st.distanceMeters ? (
                              <span>Distance: {formatDistance(st.distanceMeters)}</span>
                            ) : <span>Open / manually triggered</span>}
                          </div>
                        </div>

                        {/* Regular step parameters list */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[10px] text-zinc-400 pt-1 pb-1">
                          {st.targetHeartRateZone && (
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                              <span className="text-zinc-550 block text-[9px] font-bold">HR ZONE</span>
                              <strong className="text-white uppercase font-bold block mt-0.5">{st.targetHeartRateZone}</strong>
                            </div>
                          )}
                          {st.targetPaceMinSecPerKm && (
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                              <span className="text-zinc-550 block text-[9px] font-bold">TARGET PACE</span>
                              <strong className="text-white block mt-0.5">{st.targetPaceMinSecPerKm} /km</strong>
                            </div>
                          )}
                          {st.targetPowerWatts && (
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                              <span className="text-zinc-550 block text-[9px] font-bold">POWER</span>
                              <strong className="text-white block mt-0.5">{st.targetPowerWatts} Watts</strong>
                            </div>
                          )}
                          {st.targetRpe && (
                            <div className="bg-black/20 p-2 rounded border border-white/5">
                              <span className="text-zinc-550 block text-[9px] font-bold">RPE EXERTION</span>
                              <strong className="text-white block mt-0.5">{st.targetRpe} / 10</strong>
                            </div>
                          )}
                        </div>

                        {st.notes && (
                          <div className="text-[11px] text-zinc-500 font-sans leading-relaxed pt-1.5 border-t border-white/5">
                            {st.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
