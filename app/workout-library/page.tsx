'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { getImportedWorkouts, saveCustomWorkout, deleteCustomWorkout } from '../../lib/firebase/firestore';
import { 
  ArrowLeft, 
  Dumbbell, 
  Check, 
  Plus, 
  RefreshCw, 
  Trash2,
  Sliders,
  Calendar,
  CloudLightning
} from 'lucide-react';

interface WorkoutTemplate {
  id: string;
  name: string;
  type: string;
  source: 'manual' | 'intervals';
  scheduledDate?: string;
  durationSeconds?: number;
  description?: string;
  steps: { action: string; duration: string; target: string }[];
}

export default function WorkoutLibraryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Local volatile additions (unsaved state)
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([]);
  // Database persists
  const [dbWorkouts, setDbWorkouts] = useState<WorkoutTemplate[]>([]);
  
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [filter, setFilter] = useState<'all' | 'manual' | 'intervals'>('all');

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Interval Speed');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // hardcoded defaults
  const defaultItems: WorkoutTemplate[] = [
    {
      id: 'default_1',
      name: 'Threshold Lactate Climbs',
      type: 'Threshold Interval',
      source: 'manual',
      steps: [
        { action: 'WARMUP', duration: '15 min', target: 'Easy Aerobic Zone 1-2' },
        { action: 'INTERVAL CLIMB', duration: '4.5 min', target: 'Lactate Threshold Zone 4' },
        { action: 'RECOVERY FLOAT', duration: '2 min', target: 'Recovery HR Zone 1' },
        { action: 'INTERVAL CLIMB', duration: '4.5 min', target: 'Lactate Threshold Zone 4' },
        { action: 'COOLDOWN', duration: '10 min', target: 'Zone 1 Recovery' },
      ]
    },
    {
      id: 'default_2',
      name: 'VO2Max Aerobic Capacity Loops',
      type: 'Interval Speed',
      source: 'manual',
      steps: [
        { action: 'WARMUP', duration: '10 min', target: 'Zone 1 Aerobic Pace' },
        { action: 'VO2MAX LOOP', duration: '1 km', target: 'Daniels VDOT Interval Pace (I)' },
        { action: 'RECOVERY JOG', duration: '400 m', target: 'Easy recovery' },
        { action: 'VO2MAX LOOP', duration: '1 km', target: 'Daniels VDOT Interval Pace (I)' },
        { action: 'COOLDOWN', duration: '10 min', target: 'Zone 1 Recovery' },
      ]
    }
  ];

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    async function loadDbWorkouts() {
      setIsLoadingDb(true);
      try {
        const list = await getImportedWorkouts(uid);
        const mapped: WorkoutTemplate[] = list.map((item: any) => ({
          id: item.id,
          name: item.title || item.name || 'Untitled Workout',
          type: item.sportType || item.type || 'Custom Block',
          source: item.source || 'manual',
          scheduledDate: item.scheduledDate,
          durationSeconds: item.durationSeconds,
          description: item.description,
          steps: item.steps || []
        }));
        setDbWorkouts(mapped);
      } catch (e) {
        console.error("Failed to load workouts from db:", e);
      } finally {
        setIsLoadingDb(false);
      }
    }
    loadDbWorkouts();
  }, [user]);

  const handleAddWorkout = async () => {
    if (!newName.trim()) return;
    
    const workoutId = `w_usr_${Date.now()}`;
    const steps = [
      { action: 'WARMUP', duration: '10 mins', target: 'Zone 1 Recovery' },
      { action: 'MAIN INTENSITY BLOCK', duration: '20 mins', target: 'Zone 4 Threshold' },
      { action: 'COOLDOWN', duration: '10 mins', target: 'Zone 1 Recovery' }
    ];

    const item: WorkoutTemplate = {
      id: workoutId,
      name: newName,
      type: newType,
      source: 'manual',
      steps
    };

    if (user) {
      try {
        await saveCustomWorkout(user.uid, workoutId, {
          title: newName,
          sportType: newType,
          source: 'manual',
          steps,
          createdAt: new Date().toISOString()
        });
        setDbWorkouts(prev => [item, ...prev]);
      } catch (e) {
        console.error("Failed to save to db, staying state-only:", e);
        setWorkouts(prev => [...prev, item]);
      }
    } else {
      setWorkouts(prev => [...prev, item]);
    }

    setNewName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRemove = async (id: string) => {
    if (id.startsWith('default_')) return;
    
    if (user) {
      try {
        await deleteCustomWorkout(user.uid, id);
        setDbWorkouts(prev => prev.filter(w => w.id !== id));
      } catch (e) {
        console.error("Failed to delete from DB:", e);
      }
    }
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 font-mono font-medium">Opening Intensities Vault...</span>
      </div>
    );
  }

  // Combine defaults, locally built list, and database loaded ones
  const allItems = [
    ...defaultItems,
    ...workouts.filter(w => !w.id.startsWith('default_')),
    ...dbWorkouts
  ];

  // Apply filters
  const filteredWorkouts = allItems.filter(w => {
    if (filter === 'manual') return w.source === 'manual';
    if (filter === 'intervals') return w.source === 'intervals';
    return true;
  });

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
              <Dumbbell className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Intensity Workout Library</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Construct high-intensity training intervals and deterministic workout blocks
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ADD CREATOR PANEL */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 h-fit">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">BUILD BLOCK</span>
              <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Append Workspace</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold block">Workout Name</span>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pyramids VO2 Max"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#111113]/20 border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-200 font-sans rounded"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold block">Interval Mode</span>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-[#111113]/20 border border-white/10 w-full p-3 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
                >
                  <option value="Interval Speed">Interval Speed (VO2Max)</option>
                  <option value="Threshold Interval">Threshold Aerobic (Daniels T)</option>
                  <option value="Active Recovery">Active Recovery (Warmup/Rest)</option>
                  <option value="Hill Repeats">Hill Repeats (Asymmetrical Climb)</option>
                </select>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> INTENSITY TEMP APPENDED
                </div>
              )}

              <button
                onClick={handleAddWorkout}
                className="w-full bg-[#FC5200] hover:bg-[#e44a00] text-black font-bold text-xs py-2.5 rounded uppercase tracking-wider cursor-pointer font-semibold transition-colors"
              >
                CREATE INTERVAL BLOCK
              </button>
            </div>
          </div>

          {/* RENDER LIST OF WORKOUTS */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 md:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase font-mono">CATALOG</span>
                <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Saved Workout Designs</h2>
              </div>

              {/* Filter controls */}
              <div className="flex items-center gap-1 border border-white/10 p-1 bg-zinc-950/40 rounded-lg w-fit">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase font-bold rounded cursor-pointer transition-colors ${filter === 'all' ? 'bg-[#FC5200] text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('manual')}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase font-bold rounded cursor-pointer transition-colors ${filter === 'manual' ? 'bg-[#FC5200] text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setFilter('intervals')}
                  className={`px-3 py-1.5 text-[10px] font-mono uppercase font-bold rounded cursor-pointer transition-colors ${filter === 'intervals' ? 'bg-[#FC5200] text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}
                >
                  Intervals.icu
                </button>
              </div>
            </div>

            {isLoadingDb ? (
              <div className="flex items-center justify-center p-12 text-zinc-500 uppercase font-mono text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#FC5200]" />
                Searching Firestore Vault...
              </div>
            ) : filteredWorkouts.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-xl p-12 text-center text-zinc-500 uppercase font-mono text-xs">
                {filter === 'intervals' ? (
                  <p>No planned workouts found in Intervals.icu.</p>
                ) : (
                  <p>No workout designs found matching current index filters.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWorkouts.map((w) => (
                  <div key={w.id} className="border border-white/10 bg-zinc-900/30 p-6 rounded-xl space-y-3 relative">
                    {!w.id.startsWith('default_') && (
                      <button
                        onClick={() => handleRemove(w.id)}
                        className="absolute top-4 right-4 p-1 hover:bg-zinc-900 hover:text-red-400 text-zinc-600 rounded transition-all cursor-pointer"
                        title="Delete workout design"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 border border-[#FC5200]/30 bg-[#FC5200]/5 text-[#FC5200] text-[10px] uppercase font-bold rounded font-mono">
                        {w.type}
                      </span>
                      {w.source === 'intervals' ? (
                        <span className="px-2 py-0.5 border border-[#FC5200]/40 bg-[#FC5200]/10 text-white text-[10px] uppercase font-mono font-bold rounded flex items-center gap-1">
                          <CloudLightning className="w-3 h-3 text-[#FC5200]" />
                          Intervals.icu
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 border border-white/10 bg-white/5 text-zinc-400 text-[10px] uppercase font-mono font-bold rounded">
                          Manual
                        </span>
                      )}
                      {w.scheduledDate && (
                        <span className="px-2 py-0.5 border border-white/10 bg-[#FC5200]/5 text-zinc-300 text-[10px] uppercase font-mono rounded flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {w.scheduledDate}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white uppercase mt-1 tracking-wide">{w.name}</h3>

                    {w.description && (
                      <div className="text-zinc-400 text-xs font-mono bg-black/20 p-3 border border-white/5 rounded whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                        {w.description}
                      </div>
                    )}

                    {w.steps && w.steps.length > 0 && (
                      <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                        {w.steps.map((st, i) => (
                          <div key={i} className="flex justify-between text-[11px] uppercase font-mono">
                            <span className="text-zinc-500">• {st.action} ({st.duration})</span>
                            <span className="text-zinc-300 font-semibold">{st.target}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
