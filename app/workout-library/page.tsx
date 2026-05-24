'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { getImportedWorkouts, saveCustomWorkout, deleteCustomWorkout } from '../../lib/firebase/firestore';
import { formatDuration, formatDistanceKm } from '../../lib/data/dataLaw';
import { 
  ArrowLeft, 
  Dumbbell, 
  Check, 
  Plus, 
  RefreshCw, 
  Trash2,
  Sliders,
  Calendar,
  Layers,
  Search,
  BookOpen,
  Filter,
  CheckCircle,
  Eye,
  Activity,
  ChevronRight,
  Clock,
  Compass,
  AlertCircle
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

// Deterministic templates clearly labeled as standard presets (not AI/personalized)
const STANDARD_PRESETS = [
  {
    title: "Vanguard VO2Max 5x1K",
    sportType: "run",
    workoutType: "interval",
    description: "Classic 5x1000m interval session at Jack Daniels VO2Max intensity. Designed for peak aerobic capacity enhancement.",
    estimatedDurationSeconds: 3000,
    estimatedDistanceMeters: 8000,
    tags: ["speed", "vo2max", "intervals"],
    steps: [
      { id: "1", order: 1, name: "Warmup Jog", type: "warmup", durationSeconds: 600, notes: "Easy running, dynamic drills" },
      {
        id: "2",
        order: 2,
        name: "Speed Block",
        type: "repeat",
        repeatCount: 5,
        childSteps: [
          { id: "2-1", order: 1, name: "VO2Max Interval", type: "work", distanceMeters: 1000, targetHeartRateZone: "Z5", targetRpe: 9 },
          { id: "2-2", order: 2, name: "Recovery Float", type: "recovery", durationSeconds: 180, targetHeartRateZone: "Z1" }
        ]
      },
      { id: "3", order: 3, name: "Cooldown Jog", type: "cooldown", durationSeconds: 600 }
    ]
  },
  {
    title: "Symmetric Sweet Spot Tempo",
    sportType: "ride",
    workoutType: "tempo",
    description: "A steady cycling sweet-spot block involving 2x15 minute efforts. Excellent for muscular endurance training and aerobic capacity building.",
    estimatedDurationSeconds: 3600,
    estimatedDistanceMeters: 25000,
    tags: ["aerobic", "tempo", "bike"],
    steps: [
      { id: "1", order: 1, name: "Warmup Spin", type: "warmup", durationSeconds: 600 },
      {
        id: "2",
        order: 2,
        name: "Sweetspot Effort",
        type: "repeat",
        repeatCount: 2,
        childSteps: [
          { id: "2-1", order: 1, name: "Steady Sweet Spot Cruise", type: "work", durationSeconds: 900, targetHeartRateZone: "Z3", targetPowerWatts: 210 },
          { id: "2-2", order: 2, name: "Active Recovery Float", type: "recovery", durationSeconds: 300, targetHeartRateZone: "Z1" }
        ]
      },
      { id: "3", order: 3, name: "Cooldown Spin", type: "cooldown", durationSeconds: 600 }
    ]
  },
  {
    title: "Aerobic Recovery Restore",
    sportType: "run",
    workoutType: "recovery",
    description: "A strictly easy, conversational active recovery jog. Promotes tissue blood flow and cellular metabolic restore.",
    estimatedDurationSeconds: 2400,
    estimatedDistanceMeters: 6000,
    tags: ["recovery", "easy"],
    steps: [
      { id: "1", order: 1, name: "Recovery Run", type: "work", durationSeconds: 2400, targetHeartRateZone: "Z1", targetRpe: 3, notes: "Keep HR flat and conversation easy." }
    ]
  },
  {
    title: "Total Core Stability Focus",
    sportType: "strength",
    workoutType: "custom",
    description: "Symmetric isometric hold sets for basic core endurance and spine stabilization. Useful for structural running durability and performance.",
    estimatedDurationSeconds: 1200,
    tags: ["strength", "core", "injury-prevention"],
    steps: [
      { id: "1", order: 1, name: "Symmetric Planks", type: "work", durationSeconds: 60, notes: "Perform 3 sets of 1 minute" },
      { id: "2", order: 2, name: "Glute Bridges", type: "work", durationSeconds: 60, notes: "Focus on pelvis level symmetry" },
      { id: "3", order: 3, name: "Symmetric Bird-Dogs", type: "work", durationSeconds: 120, notes: "Keep spine stable" }
    ]
  }
];

export default function WorkoutLibraryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Appended custom works
  const [workouts, setWorkouts] = useState<CanonicalWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'intervals'>('all');
  const [sportFilter, setSportFilter] = useState<'all' | 'run' | 'ride' | 'strength' | 'other'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [presetSavedStatus, setPresetSavedStatus] = useState<string | null>(null);

  // Fetch from Firestore
  const loadWorkouts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getImportedWorkouts(user.uid);
      setWorkouts(list as CanonicalWorkout[]);
    } catch (e) {
      console.error("Failed to fetch workouts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadWorkouts();
    }
  }, [user]);

  const handleCreateFromPreset = async (preset: typeof STANDARD_PRESETS[0]) => {
    if (!user) return;
    const workoutId = `w_preset_${Date.now()}`;
    const newWorkout: Partial<CanonicalWorkout> = {
      id: workoutId,
      userId: user.uid,
      title: preset.title,
      sportType: preset.sportType as any,
      source: "manual",
      workoutType: preset.workoutType as any,
      description: preset.description,
      estimatedDurationSeconds: preset.estimatedDurationSeconds,
      estimatedDistanceMeters: preset.estimatedDistanceMeters,
      steps: preset.steps as any,
      tags: preset.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveCustomWorkout(user.uid, workoutId, newWorkout);
      setPresetSavedStatus(preset.title);
      await loadWorkouts();
      setTimeout(() => {
        setPresetSavedStatus(null);
        setShowPresetsMenu(false);
      }, 2000);
    } catch (err) {
      console.error("Error committing preset workout:", err);
    }
  };

  const handleRemoveWorkout = async (id: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this workout template?")) {
      try {
        await deleteCustomWorkout(user.uid, id);
        setWorkouts(prev => prev.filter(w => w.id !== id));
      } catch (err) {
        console.error("Failed to delete workout from Firestore:", err);
      }
    }
  };



  // Workout Types catalog list
  const WORKOUT_TYPES = [
    { value: 'easy', label: 'Easy' },
    { value: 'long_run', label: 'Long Run' },
    { value: 'tempo', label: 'Tempo' },
    { value: 'threshold', label: 'Threshold' },
    { value: 'interval', label: 'Interval' },
    { value: 'repetition', label: 'Repetition' },
    { value: 'race', label: 'Race' },
    { value: 'recovery', label: 'Recovery' },
    { value: 'custom', label: 'Custom' }
  ];

  // Filtering workouts logic
  const filteredWorkouts = workouts.filter(w => {
    const titleMatch = w.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (w.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const sourceMatch = sourceFilter === 'all' || w.source === sourceFilter;
    const sportMatch = sportFilter === 'all' || w.sportType?.toLowerCase() === sportFilter;
    const typeMatch = typeFilter === 'all' || w.workoutType === typeFilter;

    return titleMatch && sourceMatch && sportMatch && typeMatch;
  });

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 font-mono">Loading Workout Workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER BRANDING */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Workout Library</h1>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-1.5">
                Deterministic structured workout templates & synchronizations. Real data only.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="trigger-presets-button"
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="px-4 py-2 bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white rounded text-xs uppercase tracking-wider font-extrabold cursor-pointer transition select-none flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              Create From Preset
            </button>
            <button
              id="create-new-workout-button"
              onClick={() => router.push('/workout-library/new')}
              className="px-4 py-2 bg-[#FC5200] hover:bg-[#e44a00] text-black font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer transition select-none flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Workout
            </button>
          </div>
        </div>

        {/* PRESET DRAWER / SELECTOR */}
        {showPresetsMenu && (
          <div className="bg-[#111113] border border-white/10 p-6 rounded-lg space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#FC5200] font-mono font-bold uppercase">STANDARD EXAMPLES</span>
                <h3 className="text-sm font-semibold text-white uppercase mt-0.5">Static Standard Presets Template</h3>
                <p className="text-xs text-zinc-400">
                  Select a standard reference template to instantiate into your library. Not automated, personalized, or AI-generated.
                </p>
              </div>
              <button
                onClick={() => setShowPresetsMenu(false)}
                className="text-xs text-zinc-500 hover:text-white cursor-pointer uppercase font-mono"
              >
                [Close]
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STANDARD_PRESETS.map((preset, idx) => (
                <div key={idx} className="border border-white/5 bg-zinc-950/40 hover:border-white/10 p-4 rounded-lg flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/5 text-[9px] uppercase font-bold text-zinc-400 rounded">
                        {preset.sportType}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-550 uppercase">
                        {preset.workoutType}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase">{preset.title}</h4>
                    <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{preset.description}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500">
                      Steps: {preset.steps.length}
                    </span>
                    <button
                      onClick={() => handleCreateFromPreset(preset)}
                      className="px-2 py-1 bg-[#FC5200]/10 hover:bg-[#FC5200]/20 border border-[#FC5200]/20 hover:border-[#FC5200]/45 text-white text-[9px] uppercase font-bold tracking-wider rounded cursor-pointer transition"
                    >
                      {presetSavedStatus === preset.title ? "COMMITTING..." : "INSTANTIATE"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {presetSavedStatus && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 text-center text-emerald-400 text-xs rounded uppercase font-bold">
                ✓ PRESET "{presetSavedStatus}" COMMITTED TO THE WORKOUT ARCHIVE SYSTEM
              </div>
            )}
          </div>
        )}

        {/* FILTERS AND CONTROLS GRID */}
        <div className="bg-[#111113] border border-white/10 p-4 rounded-lg flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-550" />
            <input
              type="text"
              placeholder="Search by title or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 pl-10 text-zinc-200 rounded font-sans"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-stretch sm:items-center">
            {/* Source filtration */}
            <div className="flex items-center gap-1 border border-white/10 p-1 bg-zinc-950/40 rounded-lg shrink-0">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold px-2">SOURCE</span>
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 text-[9px] font-mono uppercase font-bold rounded cursor-pointer transition ${sourceFilter === 'all' ? 'bg-[#FC5200] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                onClick={() => setSourceFilter('manual')}
                className={`px-2.5 py-1 text-[9px] font-mono uppercase font-bold rounded cursor-pointer transition ${sourceFilter === 'manual' ? 'bg-[#FC5200] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                Manual
              </button>
              <button
                onClick={() => setSourceFilter('intervals')}
                className={`px-2.5 py-1 text-[9px] font-mono uppercase font-bold rounded cursor-pointer transition ${sourceFilter === 'intervals' ? 'bg-[#FC5200] text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                Intervals.icu
              </button>
            </div>

            {/* Sport filters */}
            <div className="flex items-center gap-1 border border-white/10 p-1 bg-zinc-950/40 rounded-lg shrink-0">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold px-2">SPORT</span>
              {(['all', 'run', 'ride', 'strength', 'other'] as const).map(sport => (
                <button
                  key={sport}
                  onClick={() => setSportFilter(sport)}
                  className={`px-2 py-1 text-[9px] font-mono uppercase font-bold rounded cursor-pointer transition ${sportFilter === sport ? 'bg-[#FC5200] text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  {sport}
                </button>
              ))}
            </div>

            {/* Workout Type pick */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold leading-none">TYPE:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-zinc-300 text-xs p-1.5 px-3 rounded font-mono outline-none focus:border-[#FC5200]"
              >
                <option value="all">ALL TYPES</option>
                {WORKOUT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* WORKOUT CARDS DIRECTORY */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#111113]/30 border border-white/10 rounded-xl space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FC5200]" />
            <span className="text-xs uppercase tracking-widest font-bold text-zinc-500 font-mono">Exploring structural workout database indices...</span>
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-[#111113]/25 border border-dashed border-white/10 rounded-xl space-y-4">
            <Dumbbell className="w-8 h-8 text-zinc-650" />
            <div className="max-w-md">
              <h3 className="text-sm font-bold uppercase text-white tracking-wide">No workouts yet</h3>
              <p className="text-xs text-zinc-400 font-sans mt-2">
                “No workouts yet. Create a workout or sync planned workouts from Intervals.icu.”
              </p>
            </div>
            <button
              onClick={() => router.push('/workout-library/new')}
              className="px-4 py-1.5 bg-[#FC5200]/10 border border-[#FC5200]/30 hover:border-[#FC5200] text-white text-xs uppercase font-extrabold tracking-wider rounded cursor-pointer transition"
            >
              Draft Manual Block
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkouts.map((w) => {
              // Extract standard summary details
              const stepsCount = w.steps?.length || 0;
              return (
                <div 
                  key={w.id} 
                  id={`workout-card-${w.id}`}
                  className="bg-[#111113] border border-white/10 hover:border-white/20 p-6 rounded-xl space-y-4 relative flex flex-col justify-between transition group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 justify-between flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] uppercase font-bold rounded font-mono">
                          {w.sportType || 'run'}
                        </span>
                        <span className="px-2 py-0.5 border border-[#FC5200]/20 bg-[#FC5200]/5 text-[#FC5200] text-[10px] uppercase font-mono font-bold rounded">
                          {w.workoutType || 'tempo'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {w.source === 'intervals' ? (
                          <span className="px-1.5 py-0.5 bg-[#407BFF]/10 text-[#407BFF] text-[9px] uppercase font-bold border border-[#407BFF]/20 rounded font-mono flex items-center gap-0.5">
                            intervals.icu
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-zinc-950 text-zinc-500 text-[9px] uppercase font-bold border border-white/5 rounded font-mono">
                            manual
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveWorkout(w.id);
                          }}
                          className="p-1 hover:bg-zinc-800 hover:text-red-400 text-zinc-650 rounded cursor-pointer transition"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-white uppercase group-hover:text-[#FC5200] transition-colors line-clamp-1">
                        {w.title}
                      </h3>
                      {w.scheduledDate && (
                        <span className="text-[10px] text-zinc-550 font-mono block">
                          Scheduled: {w.scheduledDate}
                        </span>
                      )}
                    </div>

                    {w.description && (
                      <p className="text-xs text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                        {w.description}
                      </p>
                    )}

                    {/* STEPS OVERVIEW PREVIEW */}
                    {w.steps && w.steps.length > 0 ? (
                      <div className="space-y-1 bg-zinc-950/40 border border-white/5 p-3 rounded font-mono text-[10px] uppercase text-zinc-500">
                        <span className="text-[9px] text-zinc-650 font-extrabold tracking-wider block mb-1">Workout Steps Hierarchy</span>
                        {w.steps.slice(0, 3).map((st, i) => (
                          <div key={st.id || i} className="flex justify-between">
                            <span>• {st.name || st.type}</span>
                            <span className="text-zinc-400">
                              {st.type === 'repeat' ? `${st.repeatCount}x REPEAT` : (st.durationSeconds ? formatDuration(st.durationSeconds) : (st.distanceMeters ? `${st.distanceMeters}m` : '—'))}
                            </span>
                          </div>
                        ))}
                        {w.steps.length > 3 && (
                          <span className="text-[9px] text-[#FC5200] block mt-1">+ {w.steps.length - 3} more steps...</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-zinc-650 italic block border border-dashed border-white/5 p-2 rounded text-center">No structural steps defined</span>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] font-mono select-none">
                      <div className="flex items-center gap-1 text-zinc-455">
                        <Clock className="w-3.5 h-3.5 text-[#FC5200]/60" />
                        <span>{formatDuration(w.estimatedDurationSeconds)}</span>
                      </div>
                      {w.estimatedDistanceMeters ? (
                        <div className="flex items-center gap-1 text-zinc-455">
                          <Activity className="w-3.5 h-3.5 text-[#FC5200]/60" />
                          <span>{formatDistanceKm(w.estimatedDistanceMeters)}</span>
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => router.push(`/workout-library/${w.id}`)}
                      className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 group-hover:text-[#FC5200] flex items-center gap-0.5 cursor-pointer select-none"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* METRICS DISCLOSURE FOOTER */}
        <div className="bg-[#111113]/40 border border-white/10 p-5 rounded-lg flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-[#FC5200]/40 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            ⚠️ SYSTEM METRICS: Training template metrics match Jack Daniels VDOT indexes. Real data constraints only. No AI predictions are utilized in structure mapping. Keep zone definitions updated under Athlete profile values to optimize step pacing suggestions.
          </p>
        </div>

      </div>
    </div>
  );
}
