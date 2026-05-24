'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  HeartPulse, 
  Award, 
  Activity, 
  Sliders, 
  Settings, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { upsertWellnessLog } from '../../lib/firebase/firestore';

export default function MorningCheckPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Primary states
  const [wakingHR, setWakingHR] = useState<number>(50);
  const [hrvRmssd, setHrvRmssd] = useState<number>(70);
  const [hrvState, setHrvState] = useState<'optimal' | 'moderate' | 'suppressed'>('optimal');
  const [fatigueRating, setFatigueRating] = useState<number>(2);
  const [muscleSoreness, setMuscleSoreness] = useState<number>(2);
  const [stressRating, setStressRating] = useState<number>(1);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [sleepDurationHours, setSleepDurationHours] = useState<number>(8.0);
  const [sleepQuality, setSleepQuality] = useState<number>(85);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await upsertWellnessLog({
        id: date, // set date as the primary document ID
        userId: user.uid,
        date,
        source: 'manual',
        restingHeartRate: wakingHR,
        hrvRmssd,
        fatigue: fatigueRating,
        soreness: muscleSoreness,
        stress: stressRating,
        weightKg,
        sleepDurationHours,
        sleepQuality,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        router.push('/wellness'); // Redirect back to wellness journal section
      }, 1500);
    } catch (err) {
      console.error('[Morning Check Sync Error]:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8 ">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER BLOCK */}
        <div className="flex items-center gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Morning Check</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
              Log daily morning values directly to the secure Firestore database
            </p>
          </div>
        </div>

        {/* WELLNESS DIRECT INPUT */}
        <form onSubmit={handleSubmit} className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">WAKING CARDIAC STATS</span>
                <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide mt-1">Autonomic Heart Rates</h3>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Log Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Waking HR (bpm)</label>
                  <input
                    type="number"
                    required
                    value={wakingHR}
                    onChange={(e) => setWakingHR(parseInt(e.target.value) || 50)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">HRV RMSSD (ms)</label>
                  <input
                    type="number"
                    required
                    value={hrvRmssd}
                    onChange={(e) => setHrvRmssd(parseInt(e.target.value) || 70)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">HRV State Index</label>
                <select
                  value={hrvState}
                  onChange={(e) => setHrvState(e.target.value as any)}
                  className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-300 rounded"
                >
                  <option value="optimal">OPTIMAL Autonomic Balance</option>
                  <option value="moderate">MODERATE Parasynthetic Decay</option>
                  <option value="suppressed">SUPPRESSED Cardiac Strain</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">FATIGUE & MASS</span>
                <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide mt-1">Subjective Muscle Loads</h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Fatigue (1-5)</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={fatigueRating}
                    onChange={(e) => setFatigueRating(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-800/50 text-center border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Mobility (1-5)</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={muscleSoreness}
                    onChange={(e) => setMuscleSoreness(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-800/50 text-center border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Stress (1-5)</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={stressRating}
                    onChange={(e) => setStressRating(parseInt(e.target.value) || 1)}
                    className="w-full bg-zinc-800/50 text-center border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Sleep (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={sleepDurationHours}
                    onChange={(e) => setSleepDurationHours(parseFloat(e.target.value) || 8.0)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Sleep Score (0-100)</label>
                  <input
                    type="number"
                    required
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(parseInt(e.target.value) || 80)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Body Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 70.0)}
                  className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                />
              </div>

            </div>

          </div>

          {saveSuccess && (
            <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" /> JOURNAL LOG COMMITTED. REDIRECTING...
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800/50 text-black font-bold py-3 rounded text-xs select-none cursor-pointer tracking-wider uppercase transition-colors"
          >
            {saving ? 'UPDATING CLOUD JOURNAL...' : 'COMMIT MORNING STATUS DIRECTLY'}
          </button>
        </form>

      </div>
    </div>
  );
}
