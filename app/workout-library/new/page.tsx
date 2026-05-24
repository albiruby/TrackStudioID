'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { saveCustomWorkout } from '../../../lib/firebase/firestore';
import { db } from '../../../lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Dumbbell,
  Check,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Activity,
  AlertCircle,
  Save,
  Layers,
  Sparkles,
  Zap,
  Eye,
  Settings,
  HelpCircle,
  RefreshCw
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

export default function NewWorkoutPage() {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();

  // Root Form inputs
  const [title, setTitle] = useState('');
  const [sportType, setSportType] = useState<'run' | 'ride' | 'strength' | 'other'>('run');
  const [workoutType, setWorkoutType] = useState<'easy' | 'long_run' | 'tempo' | 'threshold' | 'interval' | 'repetition' | 'race' | 'recovery' | 'custom'>('easy');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Workout steps list state
  const [steps, setSteps] = useState<WorkoutStep[]>([]);

  // User zones state loaded from firestore or profile
  const [hrZones, setHrZones] = useState<Record<string, [number, number]> | null>(null);
  const [paceZones, setPaceZones] = useState<Record<string, [number, number]> | null>(null);
  const [fetchingZones, setFetchingZones] = useState(true);

  // Operation save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch zones from Firebase
  useEffect(() => {
    if (!user || !db) return;
    const uid = user.uid;

    async function fetchUserZones() {
      setFetchingZones(true);
      try {
        // Direct probe users/{uid}/settings/heartRateZones
        const heartRateZonesRef = doc(db, 'users', uid, 'settings', 'heartRateZones');
        const snap = await getDoc(heartRateZonesRef);
        
        if (snap.exists()) {
          const zData = snap.data();
          setHrZones({
            z1: zData.z1 || [0, 0],
            z2: zData.z2 || [0, 0],
            z3: zData.z3 || [0, 0],
            z4: zData.z4 || [0, 0],
            z5: zData.z5 || [0, 0],
          });
        } else if (athleteProfile?.hrZones) {
          setHrZones(athleteProfile.hrZones as any);
        }

        // Check if there are pace zones under athleteProfile
        if (athleteProfile?.paceZones) {
          setPaceZones(athleteProfile.paceZones as any);
        }
      } catch (err) {
        console.error("Failed to load calibration zones:", err);
      } finally {
        setFetchingZones(false);
      }
    }

    fetchUserZones();
  }, [user, athleteProfile]);

  // Tags management
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!substringMatches(tagInput, tags)) {
      setTags([...tags, tagInput.toLowerCase().trim()]);
    }
    setTagInput('');
  };

  const substringMatches = (tag: string, list: string[]) => {
    return list.includes(tag.toLowerCase().trim());
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  // STEP CREATION LOGICS
  const createNewEmptyStep = (type: WorkoutStep['type']): WorkoutStep => {
    const stepId = `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    if (type === 'repeat') {
      return {
        id: stepId,
        order: steps.length + 1,
        name: "Repeat Block Sets",
        type: 'repeat',
        repeatCount: 2,
        childSteps: [
          {
            id: `st_sub_${Date.now()}_1`,
            order: 1,
            name: "Work Interval",
            type: 'work',
            durationSeconds: 120,
            targetRpe: 7
          },
          {
            id: `st_sub_${Date.now()}_2`,
            order: 2,
            name: "Recovery Jog/Spin",
            type: 'recovery',
            durationSeconds: 120,
            targetRpe: 2
          }
        ]
      };
    }
    
    return {
      id: stepId,
      order: steps.length + 1,
      name: `${type.toUpperCase()} Segment`,
      type,
      durationSeconds: 300,
      targetRpe: 4
    };
  };

  const addParentStep = (type: WorkoutStep['type']) => {
    const newStep = createNewEmptyStep(type);
    setSteps([...steps, newStep]);
  };

  const removeParentStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  // Helper method to mutate specific step values
  const updateParentStep = (id: string, updates: Partial<WorkoutStep>) => {
    setSteps(prevSteps => prevSteps.map(step => {
      if (step.id === id) {
        return { ...step, ...updates };
      }
      return step;
    }));
  };

  // Nested steps edits inside repeat blocks
  const addNestedStep = (repeatStepId: string, type: WorkoutStep['type']) => {
    setSteps(prevSteps => prevSteps.map(step => {
      if (step.id === repeatStepId && step.type === 'repeat') {
        const subId = `st_sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const order = (step.childSteps?.length || 0) + 1;
        const subStep: WorkoutStep = {
          id: subId,
          order,
          name: `${type.toUpperCase()} Effort`,
          type,
          durationSeconds: 120,
          targetRpe: 5
        };
        return {
          ...step,
          childSteps: [...(step.childSteps || []), subStep]
        };
      }
      return step;
    }));
  };

  const removeNestedStep = (repeatStepId: string, subStepId: string) => {
    setSteps(prevSteps => prevSteps.map(step => {
      if (step.id === repeatStepId && step.type === 'repeat') {
        return {
          ...step,
          childSteps: (step.childSteps || []).filter(sub => sub.id !== subStepId)
        };
      }
      return step;
    }));
  };

  const updateNestedStep = (repeatStepId: string, subStepId: string, updates: Partial<WorkoutStep>) => {
    setSteps(prevSteps => prevSteps.map(step => {
      if (step.id === repeatStepId && step.type === 'repeat') {
        return {
          ...step,
          childSteps: (step.childSteps || []).map(sub => {
            if (sub.id === subStepId) {
              return { ...sub, ...updates };
            }
            return sub;
          })
        };
      }
      return step;
    }));
  };

  // REORDERING STEPS (UP/DOWN MOVEMENT)
  const moveParentStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const items = [...steps];
    const temporary = items[index];
    items[index] = items[newIndex];
    items[newIndex] = temporary;

    // recompute order indexes
    const updated = items.map((item, idx) => ({ ...item, order: idx + 1 }));
    setSteps(updated);
  };

  const moveNestedStep = (repeatStepId: string, index: number, direction: 'up' | 'down') => {
    setSteps(prevSteps => prevSteps.map(step => {
      if (step.id === repeatStepId && step.type === 'repeat') {
        const subItems = [...(step.childSteps || [])];
        if (direction === 'up' && index === 0) return step;
        if (direction === 'down' && index === subItems.length - 1) return step;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const temporary = subItems[index];
        subItems[index] = subItems[newIndex];
        subItems[newIndex] = temporary;

        const updatedSubs = subItems.map((s, idx) => ({ ...s, order: idx + 1 }));
        return {
          ...step,
          childSteps: updatedSubs
        };
      }
      return step;
    }));
  };

  // DETERMINISTIC ESTIMATORS FOR THE ROOT WORKOUT DOCUMENT
  const sumWorkoutDuration = (): number => {
    return steps.reduce((total, step) => {
      if (step.type === 'repeat') {
        const repeatMultiplier = step.repeatCount || 1;
        const childTotal = (step.childSteps || []).reduce((subSum, sub) => subSum + (sub.durationSeconds || 0), 0);
        return total + (childTotal * repeatMultiplier);
      }
      return total + (step.durationSeconds || 0);
    }, 0);
  };

  const sumWorkoutDistance = (): number => {
    return steps.reduce((total, step) => {
      if (step.type === 'repeat') {
        const repeatMultiplier = step.repeatCount || 1;
        const childTotal = (step.childSteps || []).reduce((subSum, sub) => subSum + (sub.distanceMeters || 0), 0);
        return total + (childTotal * repeatMultiplier);
      }
      return total + (step.distanceMeters || 0);
    }, 0);
  };

  // THE DETERMINISTIC FIREBASE SUBSTANTIATION SAVE CALL
  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      setErrorMsg("Workout Title is a required structural parameter.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    const workoutId = `w_custom_${Date.now()}`;
    const calculatedDuration = sumWorkoutDuration();
    const calculatedDistance = sumWorkoutDistance();

    const workoutPayload = {
      id: workoutId,
      userId: user.uid,
      title: title.trim(),
      sportType,
      source: 'manual',
      workoutType,
      description: description.trim() || undefined,
      scheduledDate: scheduledDate || undefined,
      estimatedDurationSeconds: calculatedDuration > 0 ? calculatedDuration : undefined,
      estimatedDistanceMeters: calculatedDistance > 0 ? calculatedDistance : undefined,
      steps: steps.map((s, idx) => ({ ...s, order: idx + 1 })),
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveCustomWorkout(user.uid, workoutId, workoutPayload);
      setSaveSuccess(true);
      setTimeout(() => {
        router.push('/workout-library');
      }, 1500);
    } catch (err: any) {
      console.error("Save error committed to server:", err);
      setErrorMsg(err.message || "Failed to preserve custom athletic template into Firebase archives.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 font-mono">Calibrating Creator environment...</span>
      </div>
    );
  }

  const isZonesMissing = !hrZones && !paceZones;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1200px] w-full mx-auto space-y-6">

        {/* HEADER BRANDING PANEL */}
        <div className="flex items-center gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <button
            onClick={() => router.push('/workout-library')}
            className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Workout Builder</h1>
            </div>
            <p className="text-xs text-zinc-400 font-sans mt-1.5">
              Draft structured workout templates with deterministic target metrics. Empty template starting layout.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWorkout} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT 1 COL: STRUCTURAL META DETAILS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase font-mono">META DATA</span>
                <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Core Parameters</h2>
              </div>

              <div className="space-y-4">
                {/* TITLE */}
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Workout Title (required)</span>
                  <input
                    type="text"
                    required
                    required-id="workout-title-input"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="e.g., Threshold Lactate Progressive Block"
                    className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-sans"
                  />
                </div>

                {/* SPORT TYPE */}
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Sport discipline</span>
                  <select
                    value={sportType}
                    onChange={(e) => setSportType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-white/10 text-zinc-350 p-3 text-xs rounded select-none outline-none focus:border-[#FC5200] font-sans"
                  >
                    <option value="run">Running (Run)</option>
                    <option value="ride">Cycling (Ride)</option>
                    <option value="strength">Strength / Weight Training</option>
                    <option value="other">Other / Aerobic Restore</option>
                  </select>
                </div>

                {/* WORKOUT TYPE */}
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Intensity Style (Type)</span>
                  <select
                    value={workoutType}
                    onChange={(e) => setWorkoutType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-white/10 text-zinc-350 p-3 text-xs rounded select-none outline-none focus:border-[#FC5200] font-sans"
                  >
                    <option value="easy">Easy Aerobic</option>
                    <option value="long_run">Long Run</option>
                    <option value="tempo">Tempo Pace</option>
                    <option value="threshold">Lactate Threshold</option>
                    <option value="interval">VO2Max Interval</option>
                    <option value="repetition">Repetition Speed</option>
                    <option value="race">Race simulation</option>
                    <option value="recovery">Active Recovery</option>
                    <option value="custom">Custom Block</option>
                  </select>
                </div>

                {/* SCHEDULED DATE */}
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Target Schedule Date (optional)</span>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 font-mono rounded"
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Workout Instructions (optional)</span>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide specific notes regarding pacing targets, warm-up conditions, or physical sensations expected."
                    className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-sans resize-none leading-relaxed"
                  />
                </div>

                {/* TAGS */}
                <div className="space-y-2">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Search Tags / Markers</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="e.g., threshold, track"
                      className="flex-1 bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2 text-zinc-200 rounded"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-250 hover:text-white border border-white/10 text-xs rounded uppercase font-bold font-mono transition"
                    >
                      Add
                    </button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((t, idx) => (
                        <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-950 text-zinc-400 border border-white/5 text-[10px] uppercase font-mono font-bold rounded">
                          {t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(idx)}
                            className="hover:text-red-400 text-zinc-650"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LIVE DETERMINISTIC SUMMARY PANEL */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-[10px] text-[#FC5200] font-semibold tracking-wider uppercase font-mono">DETERMINISTIC ANALYSIS</span>
                <h3 className="text-sm font-semibold text-white uppercase mt-0.5">Calculated Workout Yield</h3>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-white/5 pb-2 text-zinc-400">
                  <span>SEGMENTS COUNT:</span>
                  <strong className="text-white">{steps.length} blocks</strong>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 text-zinc-400">
                  <span>ESTIMATED TIME:</span>
                  <strong className="text-white flex items-center gap-1 font-bold">
                    <Clock className="w-3.5 h-3.5 text-[#FC5200]" />
                    {sumWorkoutDuration() > 0 ? `${Math.floor(sumWorkoutDuration() / 60)} mins` : "0m (Open)"}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 text-zinc-400">
                  <span>ESTIMATED DISTANCE:</span>
                  <strong className="text-white flex items-center gap-1 font-bold">
                    <Activity className="w-3.5 h-3.5 text-[#FC5200]" />
                    {sumWorkoutDistance() > 0 ? `${(sumWorkoutDistance() / 1000).toFixed(2)} km` : "0 km (Open)"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 2 COLS: STEPS BUILDER WORKSPACE */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase font-mono">WORKOUT STEPS SCHEMATA</span>
                  <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Segments Sequence</h2>
                  <p className="text-xs text-zinc-450 mt-1">
                    Assemble and parameterize workout steps sequentially. Use repeats for structure blocks.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addParentStep('work')}
                    className="px-2.5 py-1.5 bg-zinc-950/40 hover:bg-zinc-900 border border-white/10 hover:border-white/20 text-[#FC5200] text-[10px] uppercase font-bold rounded font-mono transition flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Step
                  </button>
                  <button
                    type="button"
                    onClick={() => addParentStep('repeat')}
                    className="px-2.5 py-1.5 bg-zinc-950/40 hover:bg-[#FC5200]/10 border border-[#FC5200]/30 hover:border-[#FC5200] text-white text-[10px] uppercase font-bold rounded font-mono transition flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3 text-[#FC5200]" /> Repeat Block
                  </button>
                </div>
              </div>

              {/* STAGE DISPLAY AREA FOR THE STEPS */}
              {steps.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-xl p-16 text-center text-zinc-550 space-y-3">
                  <Dumbbell className="w-8 h-8 mx-auto text-zinc-700 animate-pulse" />
                  <p className="text-xs uppercase font-mono tracking-wide">Segments stage empty</p>
                  <p className="text-[11px] text-zinc-500 font-sans max-w-sm mx-auto">
                    Click "Step" or "Repeat Block" above to begin composing. Perfect mathematical accuracy preserved.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {steps.map((step, index) => {
                    if (step.type === 'repeat') {
                      return (
                        <div key={step.id} className="border-l-2 border-[#FC5200] bg-zinc-950/40 p-5 rounded-r-lg space-y-4 relative">
                          {/* Repeat block header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-white bg-[#FC5200]/20 border border-[#FC5200]/40 p-1 px-2.5 rounded font-extrabold uppercase">
                                Repeat Block
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-zinc-350">
                                <span className="font-mono">Repeat sets:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={step.repeatCount || 2}
                                  onChange={(e) => updateParentStep(step.id, { repeatCount: parseInt(e.target.value) || 1 })}
                                  className="w-12 bg-zinc-900 border border-white/15 hover:border-white/30 text-center p-1 rounded font-mono text-white font-bold"
                                />
                                <span>times</span>
                              </div>
                            </div>

                            {/* Reordering/delete repeat block */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveParentStep(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-zinc-550 hover:text-white hover:bg-zinc-900 border border-white/5 rounded cursor-pointer disabled:opacity-20"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveParentStep(index, 'down')}
                                disabled={index === steps.length - 1}
                                className="p-1 text-zinc-550 hover:text-white hover:bg-zinc-900 border border-white/5 rounded cursor-pointer disabled:opacity-20"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeParentStep(step.id)}
                                className="p-1.5 text-zinc-650 hover:text-red-400 hover:bg-zinc-900/50 rounded cursor-pointer transition"
                                title="Remove entire block"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <span className="text-[10px] text-zinc-550 uppercase font-mono block">Subsegment efforts:</span>

                          {/* Nested children steps */}
                          <div className="pl-4 border-l border-white/10 space-y-3">
                            {step.childSteps?.map((subStep, subIdx) => (
                              <div key={subStep.id} className="bg-zinc-900/30 p-4 rounded border border-white/5 space-y-3 relative">
                                <div className="flex items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-500">#{subIdx + 1}</span>
                                    <select
                                      value={subStep.type}
                                      onChange={(e) => updateNestedStep(step.id, subStep.id, { type: e.target.value as any })}
                                      className="bg-zinc-950 border border-white/10 text-zinc-350 p-1 rounded font-mono text-[10px] uppercase outline-none"
                                    >
                                      <option value="warmup">Warmup</option>
                                      <option value="work">Work segment</option>
                                      <option value="recovery">Recovery float</option>
                                      <option value="cooldown">Cooldown</option>
                                      <option value="rest">Rest</option>
                                    </select>

                                    <input
                                      type="text"
                                      placeholder="Segment Title"
                                      value={subStep.name}
                                      onChange={(e) => updateNestedStep(step.id, subStep.id, { name: e.target.value })}
                                      className="bg-zinc-950 border border-white/10 p-1 px-2 text-[10px] text-zinc-300 rounded font-sans max-w-[120px]"
                                    />
                                  </div>

                                  {/* Sub-orders and removal */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => moveNestedStep(step.id, subIdx, 'up')}
                                      disabled={subIdx === 0}
                                      className="p-0.5 text-zinc-650 hover:text-white disabled:opacity-10"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveNestedStep(step.id, subIdx, 'down')}
                                      disabled={subIdx === (step.childSteps?.length || 0) - 1}
                                      className="p-0.5 text-zinc-650 hover:text-white disabled:opacity-10"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeNestedStep(step.id, subStep.id)}
                                      className="text-zinc-650 hover:text-red-400 p-0.5"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Params configuration block */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                                  {/* Step duration selection */}
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Duration seconds</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={subStep.durationSeconds || ''}
                                      onChange={(e) => updateNestedStep(step.id, subStep.id, { durationSeconds: parseInt(e.target.value) || undefined })}
                                      placeholder="e.g., 120"
                                      className="w-full bg-zinc-950 border border-white/10 p-1 px-1.5 text-[10px] font-mono rounded text-zinc-300 outline-none"
                                    />
                                  </div>

                                  {/* Step distance selection */}
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Distance meters</span>
                                    <input
                                      type="number"
                                      min={0}
                                      value={subStep.distanceMeters || ''}
                                      onChange={(e) => updateNestedStep(step.id, subStep.id, { distanceMeters: parseInt(e.target.value) || undefined })}
                                      placeholder="e.g., 400"
                                      className="w-full bg-zinc-950 border border-white/10 p-1 px-1.5 text-[10px] font-mono rounded text-zinc-300 outline-none"
                                    />
                                  </div>

                                  {/* Step HR zone selector */}
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Heart rate intensity zone</span>
                                    {hrZones ? (
                                      <select
                                        value={subStep.targetHeartRateZone || ''}
                                        onChange={(e) => updateNestedStep(step.id, subStep.id, { targetHeartRateZone: e.target.value || undefined })}
                                        className="w-full bg-zinc-950 border border-white/10 p-1 text-[10px] font-mono text-zinc-300 rounded outline-none cursor-pointer"
                                      >
                                        <option value="">No HR Target</option>
                                        <option value="z1">Z1 Recovery ({hrZones.z1[0]}-{hrZones.z1[1]} bpm)</option>
                                        <option value="z2">Z2 Base Aerobic ({hrZones.z2[0]}-{hrZones.z2[1]} bpm)</option>
                                        <option value="z3">Z3 Tempo Endurance ({hrZones.z3[0]}-{hrZones.z3[1]} bpm)</option>
                                        <option value="z4">Z4 Threshold ({hrZones.z4[0]}-{hrZones.z4[1]} bpm)</option>
                                        <option value="z5">Z5 VO2Max Limit ({hrZones.z5[0]}-{hrZones.z5[1]} bpm)</option>
                                      </select>
                                    ) : (
                                      <div className="text-[8px] bg-red-950/20 border border-red-900/40 text-red-400 p-1 rounded font-sans">
                                        Training zones are required to use zone-based targets.
                                      </div>
                                    )}
                                  </div>

                                  {/* Manual Pace target */}
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Target pace (min:sec/km)</span>
                                    <input
                                      type="text"
                                      placeholder="e.g., 4:15"
                                      value={subStep.targetPaceMinSecPerKm || ''}
                                      onChange={(e) => updateNestedStep(step.id, subStep.id, { targetPaceMinSecPerKm: e.target.value || undefined })}
                                      className="w-full bg-zinc-950 border border-white/10 p-1 px-1.5 text-[10px] font-mono rounded text-zinc-350 outline-none"
                                    />
                                  </div>

                                  {/* Power target */}
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Target power (Watts)</span>
                                    <input
                                      type="number"
                                      placeholder="e.g., 250"
                                      value={subStep.targetPowerWatts || ''}
                                      onChange={(e) => updateNestedStep(step.id, subStep.id, { targetPowerWatts: parseInt(e.target.value) || undefined })}
                                      className="w-full bg-zinc-950 border border-white/10 p-1 px-1.5 text-[10px] font-mono rounded text-zinc-350 outline-none"
                                    />
                                  </div>

                                  {/* RPE target */}
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-zinc-500 uppercase font-mono block">Target exertion RPE (1-10)</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={10}
                                      value={subStep.targetRpe || ''}
                                      onChange={(e) => updateNestedStep(step.id, subStep.id, { targetRpe: parseInt(e.target.value) || undefined })}
                                      placeholder="RPE Scale"
                                      className="w-full bg-zinc-950 border border-[#white]/10 p-1 text-[10px] font-mono rounded text-zinc-350 outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Step notes line */}
                                <div className="space-y-1">
                                  <span className="text-[9px] text-zinc-550 uppercase font-mono block">Instructions / notes</span>
                                  <input
                                    type="text"
                                    placeholder="e.g., Concentrated focus on flat hip level cadence spin"
                                    value={subStep.notes || ''}
                                    onChange={(e) => updateNestedStep(step.id, subStep.id, { notes: e.target.value })}
                                    className="w-full bg-zinc-950 border border-white/10 p-1 px-2 text-[10px] text-zinc-400 rounded outline-none"
                                  />
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => addNestedStep(step.id, 'work')}
                              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5 text-[9px] uppercase font-mono font-bold rounded cursor-pointer transition flex items-center gap-1"
                            >
                              <Plus className="w-2.5 h-2.5 text-[#FC5200]" />
                              Add Step To Block
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={step.id} className="border-l bg-zinc-950/20 border-white/10 p-5 rounded-r-lg space-y-4 relative">
                        {/* Parent step header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-zinc-900 border border-white/10 p-1 px-2.5 text-zinc-350 rounded font-bold uppercase">
                              #{index + 1}
                            </span>
                            <select
                              value={step.type}
                              onChange={(e) => updateParentStep(step.id, { type: e.target.value as any })}
                              className="bg-zinc-900 border border-white/10 text-zinc-350 p-1 rounded font-mono text-[10px] uppercase outline-none"
                            >
                              <option value="warmup">Warmup</option>
                              <option value="work">Work segment</option>
                              <option value="recovery">Recovery float</option>
                              <option value="cooldown">Cooldown</option>
                              <option value="rest">Rest</option>
                            </select>

                            <input
                              type="text"
                              required
                              placeholder="Segment Title"
                              value={step.name}
                              onChange={(e) => updateParentStep(step.id, { name: e.target.value })}
                              className="bg-zinc-900 border border-white/10 p-1 px-2 text-[10px] text-zinc-300 rounded font-sans max-w-[150px]"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveParentStep(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-zinc-550 hover:text-white hover:bg-zinc-900 border border-white/5 rounded cursor-pointer disabled:opacity-20"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveParentStep(index, 'down')}
                              disabled={index === steps.length - 1}
                              className="p-1 text-zinc-550 hover:text-white hover:bg-zinc-900 border border-white/5 rounded cursor-pointer disabled:opacity-20"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeParentStep(step.id)}
                              className="p-1.5 text-zinc-650 hover:text-red-400 hover:bg-zinc-900/50 rounded cursor-pointer transition"
                              title="Delete Step"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Regular parent step parameters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                          {/* Duration input */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Duration seconds</span>
                            <input
                              type="number"
                              min={0}
                              value={step.durationSeconds || ''}
                              onChange={(e) => updateParentStep(step.id, { durationSeconds: parseInt(e.target.value) || undefined })}
                              placeholder="e.g., 300"
                              className="w-full bg-zinc-900 border border-white/10 p-1 p-2 text-[10px] font-mono rounded text-zinc-300 outline-none"
                            />
                          </div>

                          {/* Distance input */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Distance meters</span>
                            <input
                              type="number"
                              min={0}
                              value={step.distanceMeters || ''}
                              onChange={(e) => updateParentStep(step.id, { distanceMeters: parseInt(e.target.value) || undefined })}
                              placeholder="e.g., 1000"
                              className="w-full bg-zinc-900 border border-white/10 p-1 p-2 text-[10px] font-mono rounded text-zinc-300 outline-none"
                            />
                          </div>

                          {/* HR zone configuration dropdown */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Heart rate intensity zone</span>
                            {hrZones ? (
                              <select
                                value={step.targetHeartRateZone || ''}
                                onChange={(e) => updateParentStep(step.id, { targetHeartRateZone: e.target.value || undefined })}
                                className="w-full bg-zinc-900 border border-white/10 p-2 text-[10px] font-mono text-zinc-300 rounded outline-none cursor-pointer"
                              >
                                <option value="">No HR Target</option>
                                <option value="z1">Z1 Recovery ({hrZones.z1[0]}-{hrZones.z1[1]} bpm)</option>
                                <option value="z2">Z2 Base Aerobic ({hrZones.z2[0]}-{hrZones.z2[1]} bpm)</option>
                                <option value="z3">Z3 Tempo Endurance ({hrZones.z3[0]}-{hrZones.z3[1]} bpm)</option>
                                <option value="z4">Z4 Threshold ({hrZones.z4[0]}-{hrZones.z4[1]} bpm)</option>
                                <option value="z5">Z5 VO2Max Limit ({hrZones.z5[0]}-{hrZones.z5[1]} bpm)</option>
                              </select>
                            ) : (
                              <div className="text-[8px] bg-red-950/20 border border-red-900/40 text-red-500 p-2 rounded font-sans leading-tight">
                                Training zones are required to use zone-based targets.
                              </div>
                            )}
                          </div>

                          {/* Manual Pace target */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Target pace (min:sec/km)</span>
                            <input
                              type="text"
                              placeholder="e.g., 4:15"
                              value={step.targetPaceMinSecPerKm || ''}
                              onChange={(e) => updateParentStep(step.id, { targetPaceMinSecPerKm: e.target.value || undefined })}
                              className="w-full bg-zinc-900 border border-white/10 p-2 text-[10px] font-mono rounded text-zinc-350 outline-none"
                            />
                          </div>

                          {/* Power limit */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Target power (Watts)</span>
                            <input
                              type="number"
                              placeholder="e.g., 250"
                              value={step.targetPowerWatts || ''}
                              onChange={(e) => updateParentStep(step.id, { targetPowerWatts: parseInt(e.target.value) || undefined })}
                              className="w-full bg-zinc-900 border border-white/10 p-2 text-[10px] font-mono rounded text-zinc-350 outline-none"
                            />
                          </div>

                          {/* RPE target */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono block">Target exertion RPE (1-10)</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={step.targetRpe || ''}
                              onChange={(e) => updateParentStep(step.id, { targetRpe: parseInt(e.target.value) || undefined })}
                              placeholder="RPE Scale"
                              className="w-full bg-zinc-900 border border-white/10 p-2 text-[10px] font-mono rounded text-zinc-350 outline-none"
                            />
                          </div>
                        </div>

                        {/* Step notes */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-550 uppercase font-mono block">Instructions / notes</span>
                          <input
                            type="text"
                            placeholder="e.g., Gradual progressive warmup, focus on posture"
                            value={step.notes || ''}
                            onChange={(e) => updateParentStep(step.id, { notes: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 p-2 text-[10px] text-zinc-400 rounded outline-none shadow-inner"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SAVING OPERATION CONTROLS */}
              <div className="pt-4 border-t border-white/15 space-y-4">
                {saveSuccess && (
                  <div className="bg-emerald-950/20 border border-emerald-900 p-3 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 animate-flash">
                    <Check className="w-4 h-4" /> WORKOUT DESIGN SAVED AND INDEXED SUCCESSFULLY INTO PLATFORM ARCHIVES
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-red-950/20 border border-red-900 text-red-500 p-3 text-xs rounded uppercase font-bold flex items-center gap-2 select-none">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono block max-w-sm">
                    ⚠️ Saved manual workouts will compile in your index. Syncing dynamic plans from Intervals.icu requires background API authorization under settings.
                  </span>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-[#FC5200]/50 text-black font-extrabold text-xs uppercase tracking-wider rounded select-none cursor-pointer transition-all flex items-center gap-1.5 shrink-0 shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'COMMITTING TEMPLATE...' : 'SAVE WORKOUT DESIGN'}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
