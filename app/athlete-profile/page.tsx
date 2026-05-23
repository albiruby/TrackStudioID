'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  User, 
  Settings, 
  Check, 
  ShieldAlert, 
  Heart, 
  Activity, 
  Plus 
} from 'lucide-react';

export default function AthleteProfilePage() {
  const router = useRouter();
  const { user, athleteProfile, updateAthleteProfile, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [restingHR, setRestingHR] = useState('');
  const [vdotScore, setVdotScore] = useState('');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  
  // Custom physiological thresholds
  const [age, setAge] = useState<string>('30');
  const [heightCm, setHeightCm] = useState<string>('175');
  const [aerobicThreshold, setAerobicThreshold] = useState<string>('140');
  const [maxHeartRate, setMaxHeartRate] = useState<string>('185');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (athleteProfile) {
      setDisplayName(athleteProfile.displayName || '');
      setWeightKg(athleteProfile.weightKg?.toString() || '');
      setRestingHR(athleteProfile.restingHR?.toString() || '');
      setVdotScore(athleteProfile.vdotScore?.toString() || '');
      setUnits(athleteProfile.units || 'metric');
      
      // Load custom properties
      if (athleteProfile.additionalData) {
        setAge(athleteProfile.additionalData.age?.toString() || '30');
        setHeightCm(athleteProfile.additionalData.heightCm?.toString() || '175');
        setAerobicThreshold(athleteProfile.additionalData.aerobicThreshold?.toString() || '140');
        setMaxHeartRate(athleteProfile.additionalData.maxHeartRate?.toString() || '185');
      }
    }
  }, [athleteProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateAthleteProfile({
        displayName: displayName || 'Elite Athlete',
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        restingHR: restingHR ? parseInt(restingHR) : undefined,
        vdotScore: vdotScore ? parseFloat(vdotScore) : undefined,
        units: units,
        additionalData: {
          age: age ? parseInt(age) : undefined,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          aerobicThreshold: aerobicThreshold ? parseInt(aerobicThreshold) : undefined,
          maxHeartRate: maxHeartRate ? parseInt(maxHeartRate) : undefined,
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('[Profile Save Error]:', err);
    } finally {
      setSaving(false);
    }
  };

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
              <User className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Athlete Profile</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
              Calibrate key biometrics, physiological thresholds, and custom metric definitions
            </p>
          </div>
        </div>

        {/* PROFILE FORM */}
        <form onSubmit={handleSubmit} className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SUBSECTION A</span>
                <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide mt-1">Primary Particulars</h3>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Display Identity Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Age (Years)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Body Stature (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Weight ({units === 'metric' ? 'kg' : 'lbs'})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Daniels VDOT index</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vdotScore}
                    onChange={(e) => setVdotScore(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SUBSECTION B</span>
                <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wide mt-1">Heart Rate Limits</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Resting HR (bpm)</label>
                  <input
                    type="number"
                    value={restingHR}
                    onChange={(e) => setRestingHR(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold block">Max Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={maxHeartRate}
                    onChange={(e) => setMaxHeartRate(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Aerobic Threshold Limit (bpm)</label>
                <input
                  type="number"
                  value={aerobicThreshold}
                  onChange={(e) => setAerobicThreshold(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                />
                <span className="text-xs text-zinc-500 block">Defines ceiling limit for Zone 2 aerobic mitochondria adaptation training.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Units system preference</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUnits('metric')}
                    className={`p-2 border text-xs font-bold uppercase tracking-wide text-center rounded select-none cursor-pointer ${
                      units === 'metric' 
                        ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                        : 'bg-zinc-800/50 border-white/10 text-zinc-500'
                    }`}
                  >
                    Metric (KM/KG)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnits('imperial')}
                    className={`p-2 border text-xs font-bold uppercase tracking-wide text-center rounded select-none cursor-pointer ${
                      units === 'imperial' 
                        ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                        : 'bg-zinc-800/50 border-white/10 text-zinc-500'
                    }`}
                  >
                    Imperial (MI/LB)
                  </button>
                </div>
              </div>
            </div>

          </div>

          {saveSuccess && (
            <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" /> PROFILE SAVED SUCCESSFULLY
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800/50 text-black font-bold py-3 rounded text-xs select-none cursor-pointer tracking-wider uppercase transition-colors"
          >
            {saving ? 'SAVING PROFILE...' : 'SAVE PROFILE'}
          </button>
        </form>

      </div>
    </div>
  );
}
