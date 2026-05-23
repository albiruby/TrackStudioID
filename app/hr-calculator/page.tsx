'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Heart, 
  Award, 
  Activity, 
  Sliders, 
  Settings, 
  Check, 
  RefreshCw 
} from 'lucide-react';

export default function HrCalculatorPage() {
  const router = useRouter();
  const { user, athleteProfile, updateAthleteProfile, loading: authLoading } = useAuth();

  // Inputs
  const [restingHr, setRestingHr] = useState<string>('48');
  const [maxHr, setMaxHr] = useState<string>('185');
  const [model, setModel] = useState<'karvonen' | 'max_pct'>('karvonen');
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (athleteProfile) {
      if (athleteProfile.restingHR) {
        setRestingHr(athleteProfile.restingHR.toString());
      }
    }
  }, [athleteProfile]);

  const restingVal = parseInt(restingHr) || 0;
  const maxVal = parseInt(maxHr) || 0;

  // Real Heart Rate Zone mapping
  const getZones = () => {
    if (restingVal <= 0 || maxVal <= 0 || maxVal <= restingVal) return null;

    if (model === 'karvonen') {
      // HR Reserve (HRR) = Max HR - Resting HR
      const hrr = maxVal - restingVal;
      return [
        { name: 'Zone 1 (Active Recovery)', min: Math.round(restingVal + hrr * 0.50), max: Math.round(restingVal + hrr * 0.60), purpose: 'Aerobic metabolism development & active recovery logs' },
        { name: 'Zone 2 (Aerobic Base Training)', min: Math.round(restingVal + hrr * 0.60), max: Math.round(restingVal + hrr * 0.70), purpose: 'Aerobic cell mitochondrial growth, mitochondrial density, fat oxidation' },
        { name: 'Zone 3 (Tempo / Aerobic Endurance)', min: Math.round(restingVal + hrr * 0.70), max: Math.round(restingVal + hrr * 0.80), purpose: 'Glycogen sparing capacity, progressive lactic tolerance development' },
        { name: 'Zone 4 (Lactate Threshold)', min: Math.round(restingVal + hrr * 0.80), max: Math.round(restingVal + hrr * 0.90), purpose: 'Lactate clearance threshold, high velocity cardiac conditioning' },
        { name: 'Zone 5 (VO2Max Power / Anaerobic)', min: Math.round(restingVal + hrr * 0.90), max: maxVal, purpose: 'Anaerobic power, oxygen processing volume maximization' },
      ];
    } else {
      // Standard Max HR Percentage model
      return [
        { name: 'Zone 1 (Active Recovery)', min: Math.round(maxVal * 0.50), max: Math.round(maxVal * 0.60), purpose: 'Warmup, cooldown & cell restoration' },
        { name: 'Zone 2 (Aerobic Base Training)', min: Math.round(maxVal * 0.60), max: Math.round(maxVal * 0.70), purpose: 'Standard long distance development' },
        { name: 'Zone 3 (Tempo / Aerobic Endurance)', min: Math.round(maxVal * 0.70), max: Math.round(maxVal * 0.80), purpose: 'Faster aerobic endurance' },
        { name: 'Zone 4 (Lactate Threshold)', min: Math.round(maxVal * 0.80), max: Math.round(maxVal * 0.90), purpose: 'Threshold limit adaptations' },
        { name: 'Zone 5 (VO2Max Power / Anaerobic)', min: Math.round(maxVal * 0.90), max: maxVal, purpose: 'High anaerobic workouts' },
      ];
    }
  };

  const zones = getZones();

  const handleSaveRestingHr = async () => {
    if (!user || restingVal <= 0) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateAthleteProfile({
        restingHR: restingVal
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to update Resting HR:', e);
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
              <Heart className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Heart Rate Zones</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
              Deterministic heart rate power zoning using standard physiological formulas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* SIDEBAR PARAMETERS */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">CALIBRATION VARIABLES</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1">Heart Rate Thresholds</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Athlete Resting HR (bpm)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={restingHr}
                    onChange={(e) => setRestingHr(e.target.value)}
                    placeholder="45"
                    className="flex-1 bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                  />
                  {user && athleteProfile?.restingHR !== restingVal && (
                    <button
                      onClick={handleSaveRestingHr}
                      disabled={saving}
                      className="px-3 bg-zinc-800/50 hover:bg-[#FC5200] border border-white/10 hover:border-[#FC5200] text-zinc-400 hover:text-black font-bold text-xs rounded uppercase select-none transition-all cursor-pointer leading-none flex items-center justify-center font-mono"
                    >
                      {saving ? 'SAVING...' : 'COMMIT'}
                    </button>
                  )}
                </div>
                <span className="text-xs text-zinc-600 block">Resting metrics stored in custom Athlete attributes.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Max Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={maxHr}
                  onChange={(e) => setMaxHr(e.target.value)}
                  placeholder="190"
                  className="w-full bg-zinc-800/50 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                />
                <span className="text-xs text-zinc-600 block">Calculated via standard (220 - age) limits or real peak workout tests.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400 uppercase font-bold block">Scientific Modeling Formula</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModel('karvonen')}
                    className={`p-2.5 border text-xs font-bold uppercase tracking-wide text-center rounded select-none cursor-pointer tracking-wider ${
                      model === 'karvonen' 
                        ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                        : 'bg-zinc-800/50 border-white/10 text-zinc-500'
                    }`}
                  >
                    Karvonen (HRR)
                  </button>
                  <button
                    onClick={() => setModel('max_pct')}
                    className={`p-2.5 border text-xs font-bold uppercase tracking-wide text-center rounded select-none cursor-pointer tracking-wider ${
                      model === 'max_pct' 
                        ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                        : 'bg-zinc-800/50 border-white/10 text-zinc-500'
                    }`}
                  >
                    % of Max HR
                  </button>
                </div>
              </div>
            </div>

            {saveSuccess && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 text-xs p-2 text-center text-emerald-400 rounded uppercase font-bold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> RESTING HR SAVED
              </div>
            )}
          </div>

          {/* RENDERED ZONES */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">DETERMINISTIC INTENSITIES</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1">HR Performance Zones</h2>
            </div>

            {zones ? (
              <div className="space-y-3 font-mono">
                {zones.map((zone, idx) => (
                  <div key={idx} className="bg-zinc-800/50/40 border border-white/10 p-3 rounded space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-white uppercase">{zone.name}</span>
                      <span className="text-[#FC5200] font-bold">{zone.min} - {zone.max} bpm</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{zone.purpose}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                <Heart className="w-8 h-8 text-zinc-500 mb-2 animate-pulse" />
                <span className="text-xs text-zinc-400 uppercase">Please enter resting and maximum heart rates values. Max HR must be greater than resting.</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
