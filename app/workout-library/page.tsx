'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Dumbbell, 
  Check, 
  Plus, 
  RefreshCw, 
  Trash2,
  Sliders
} from 'lucide-react';

interface WorkoutTemplate {
  id: string;
  name: string;
  type: string;
  steps: { action: string; duration: string; target: string }[];
}

export default function WorkoutLibraryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([
    {
      id: 'default_1',
      name: 'Threshold Lactate Climbs',
      type: 'Threshold Interval',
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
      steps: [
        { action: 'WARMUP', duration: '10 min', target: 'Zone 1 Aerobic Pace' },
        { action: 'VO2MAX LOOP', duration: '1 km', target: 'Daniels VDOT Interval Pace (I)' },
        { action: 'RECOVERY JOG', duration: '400 m', target: 'Easy recovery' },
        { action: 'VO2MAX LOOP', duration: '1 km', target: 'Daniels VDOT Interval Pace (I)' },
        { action: 'COOLDOWN', duration: '10 min', target: 'Zone 1 Recovery' },
      ]
    }
  ]);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Interval Speed');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddWorkout = () => {
    if (!newName.trim()) return;
    const item: WorkoutTemplate = {
      id: `w_usr_${Date.now()}`,
      name: newName,
      type: newType,
      steps: [
        { action: 'WARMUP', duration: '10 mins', target: 'Zone 1' },
        { action: 'MAIN INTENSITY BLOCK', duration: '20 mins', target: 'Zone 4 Threshold' },
        { action: 'COOLDOWN', duration: '10 mins', target: 'Zone 1' }
      ]
    };
    setWorkouts([...workouts, item]);
    setNewName('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRemove = (id: string) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 font-mono">Opening Intensities Vault...</span>
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
                  className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-200 font-sans rounded"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold block">Interval Mode</span>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
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
                className="w-full bg-[#FC5200] hover:bg-[#e44a00] text-black font-bold text-xs py-2.5 rounded uppercase tracking-wider cursor-pointer"
              >
                CREATE INTERVAL BLOCK
              </button>
            </div>
          </div>

          {/* RENDER LIST OF WORKOUTS */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 md:col-span-2 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">CATALOG</span>
              <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Saved workout designs</h2>
            </div>

            <div className="space-y-4">
              {workouts.map((w) => (
                <div key={w.id} className="border border-white/10 bg-zinc-800/50/10 p-6 rounded-xl space-y-3 relative">
                  <button
                    onClick={() => handleRemove(w.id)}
                    className="absolute top-4 right-4 p-1 hover:bg-zinc-90 bg-transparent text-zinc-500 hover:text-red-400 rounded transition-all cursor-pointer"
                    title="Delete custom workout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-1">
                    <span className="px-2 py-0.5 border border-[#FC5200]/30 bg-[#FC5200]/5 text-[#FC5200] text-xs uppercase font-bold rounded">
                      {w.type}
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase mt-1">{w.name}</h3>
                  </div>

                  <div className="space-y-1.5 pt-1.5 border-t border-white/10/60">
                    {w.steps.map((st, i) => (
                      <div key={i} className="flex justify-between text-xs uppercase font-mono">
                        <span className="text-zinc-500">• {st.action} ({st.duration})</span>
                        <span className="text-zinc-400 font-bold">{st.target}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
