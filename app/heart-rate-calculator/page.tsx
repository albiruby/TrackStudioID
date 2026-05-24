'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { db } from '../../lib/firebase/client';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Heart, 
  Check, 
  Sliders, 
  Settings, 
  HelpCircle, 
  AlertCircle, 
  Save, 
  Info, 
  Sparkles 
} from 'lucide-react';

interface HeartRateZones {
  method: 'karvonen' | 'max_pct' | 'lthr';
  z1: [number, number];
  z2: [number, number];
  z3: [number, number];
  z4: [number, number];
  z5: [number, number];
  restingHeartRate: number | null;
  maxHeartRate: number | null;
  lactateThresholdHeartRate: number | null;
}

export default function HeartRateCalculatorPage() {
  const router = useRouter();
  const { user, athleteProfile, updateAthleteProfile, loading: authLoading } = useAuth();

  // Baseline calibration parameters
  const [restingHr, setRestingHr] = useState<string>('');
  const [maxHr, setMaxHr] = useState<string>('');
  const [lthr, setLthr] = useState<string>('');
  const [method, setMethod] = useState<'karvonen' | 'max_pct' | 'lthr'>('karvonen');

  // Age based max HR estimation toggler
  const [useAgeEstimation, setUseAgeEstimation] = useState(false);
  const [athleteAge, setAthleteAge] = useState<string>('30');

  // UI status metrics
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync profile details on load
  useEffect(() => {
    if (athleteProfile) {
      setRestingHr(athleteProfile.restingHeartRate ? athleteProfile.restingHeartRate.toString() : (athleteProfile.restingHR ? athleteProfile.restingHR.toString() : ''));
      setMaxHr(athleteProfile.maxHeartRate ? athleteProfile.maxHeartRate.toString() : (athleteProfile.maxHR ? athleteProfile.maxHR.toString() : ''));
      setLthr(athleteProfile.lactateThresholdHeartRate ? athleteProfile.lactateThresholdHeartRate.toString() : (athleteProfile.thresholdHR ? athleteProfile.thresholdHR.toString() : ''));
      
      if (athleteProfile.birthDate) {
        // Compute approximate age
        const birthYear = new Date(athleteProfile.birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        setAthleteAge((currentYear - birthYear).toString());
      }
    }
  }, [athleteProfile]);

  // Adjust Max HR based on age-based estimation choice
  useEffect(() => {
    if (useAgeEstimation) {
      const ageVal = parseInt(athleteAge) || 30;
      // Haskell/Faskell formula: Max HR = 211 - 0.64 * age or standard 220 - age
      // We will use standard (220 - age) as standard clinical baseline, clearly labeled as Estimated.
      const estimatedMax = 220 - ageVal;
      setMaxHr(estimatedMax.toString());
    }
  }, [useAgeEstimation, athleteAge]);

  const restingVal = restingHr ? parseInt(restingHr) : null;
  const maxVal = maxHr ? parseInt(maxHr) : null;
  const lthrVal = lthr ? parseInt(lthr) : null;

  // Real Heart Rate Zones modeling based on formulas
  const calculateZones = (): { name: string; min: number; max: number; purpose: string }[] | null => {
    if (method === 'max_pct') {
      if (!maxVal || maxVal <= 0) return null;
      return [
        { name: 'Zone 1 (Active Recovery)', min: Math.round(maxVal * 0.50), max: Math.round(maxVal * 0.60), purpose: 'Warmup, cooldown & active cellular restoration' },
        { name: 'Zone 2 (Aerobic Base Training)', min: Math.round(maxVal * 0.60), max: Math.round(maxVal * 0.70), purpose: 'Optimizes lipid oxidation & basic endurance base' },
        { name: 'Zone 3 (Tempo / Aerobic Endurance)', min: Math.round(maxVal * 0.70), max: Math.round(maxVal * 0.80), purpose: 'Sparing stored glycogen, fast aerobic density adaptation' },
        { name: 'Zone 4 (Lactate Threshold)', min: Math.round(maxVal * 0.80), max: Math.round(maxVal * 0.90), purpose: 'Acclimates system to clear elevated lactate clearance' },
        { name: 'Zone 5 (VO2Max Power / Anaerobic)', min: Math.round(maxVal * 0.90), max: maxVal, purpose: 'Enhances peak oxygen uptake capacity and power volumes' },
      ];
    } else if (method === 'karvonen') {
      if (!maxVal || !restingVal || maxVal <= restingVal) return null;
      const hrr = maxVal - restingVal;
      return [
        { name: 'Zone 1 (Active Recovery)', min: Math.round(restingVal + hrr * 0.50), max: Math.round(restingVal + hrr * 0.60), purpose: 'Excellent for active recovery logs & easy runs' },
        { name: 'Zone 2 (Aerobic Base Training)', min: Math.round(restingVal + hrr * 0.60), max: Math.round(restingVal + hrr * 0.70), purpose: 'Develops metabolic base, mitochondrial size and capillary density' },
        { name: 'Zone 3 (Tempo / Aerobic Endurance)', min: Math.round(restingVal + hrr * 0.70), max: Math.round(restingVal + hrr * 0.80), purpose: 'Strengthens progressive lactate buffering capabilities' },
        { name: 'Zone 4 (Lactate Threshold)', min: Math.round(restingVal + hrr * 0.80), max: Math.round(restingVal + hrr * 0.90), purpose: 'Improves pace holding thresholds near anaerobic limit' },
        { name: 'Zone 5 (VO2Max Power / Anaerobic)', min: Math.round(restingVal + hrr * 0.90), max: maxVal, purpose: 'Demands peak heart volume stroke output efficiency' },
      ];
    } else if (method === 'lthr') {
      if (!lthrVal || lthrVal <= 0) return null;
      // Joe Friel's model:
      // Z1: < 85% of LTHR
      // Z2: 85% to 89% of LTHR
      // Z3: 90% to 94% of LTHR
      // Z4: 95% to 99% of LTHR
      // Z5: >= 100% of LTHR (Cap at Max HR if specified, else +15% default)
      const maxCap = maxVal || Math.round(lthrVal * 1.15);
      return [
        { name: 'Zone 1 (Active Recovery)', min: 1, max: Math.round(lthrVal * 0.84), purpose: 'Promotes blood circulation & rapid metabolic wastes clearing' },
        { name: 'Zone 2 (Aerobic Base Training)', min: Math.round(lthrVal * 0.85), max: Math.round(lthrVal * 0.89), purpose: 'Primary engine building zone, maximizes muscle lipid conversion' },
        { name: 'Zone 3 (Tempo / Aerobic Endurance)', min: Math.round(lthrVal * 0.90), max: Math.round(lthrVal * 0.94), purpose: 'Intermediate sweet spot muscular endurance work' },
        { name: 'Zone 4 (Lactate Threshold)', min: Math.round(lthrVal * 0.95), max: Math.round(lthrVal * 0.99), purpose: 'Critical anaerobic buffer accumulation adaptation target' },
        { name: 'Zone 5 (VO2Max Power / Anaerobic)', min: Math.round(lthrVal), max: maxCap, purpose: 'Anaerobic max velocity capacity, highest muscle recruitment' },
      ];
    }
    return null;
  };

  const zonesList = calculateZones();

  // Save Heart Rate Zones Settings To Firestore Subcollection
  const handleSaveZones = async () => {
    if (!user || !zonesList || !db) return;
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const parentDocRef = doc(db, 'users', user.uid, 'settings', 'heartRateZones');

      const dataPayload = {
        method,
        updatedAt: new Date().toISOString(),
        z1: [zonesList[0].min, zonesList[0].max],
        z2: [zonesList[1].min, zonesList[1].max],
        z3: [zonesList[2].min, zonesList[2].max],
        z4: [zonesList[3].min, zonesList[3].max],
        z5: [zonesList[4].min, zonesList[4].max],
        restingHeartRate: restingVal,
        maxHeartRate: maxVal,
        lactateThresholdHeartRate: lthrVal
      };

      await setDoc(parentDocRef, dataPayload);

      // Re-save/commit to also update primary user values for system compatibility
      await updateAthleteProfile({
        restingHeartRate: restingVal,
        maxHeartRate: maxVal,
        lactateThresholdHeartRate: lthrVal,
        restingHR: restingVal,
        maxHR: maxVal,
        thresholdHR: lthrVal,
        hrZones: {
          z1: [zonesList[0].min, zonesList[0].max],
          z2: [zonesList[1].min, zonesList[1].max],
          z3: [zonesList[2].min, zonesList[2].max],
          z4: [zonesList[3].min, zonesList[3].max],
          z5: [zonesList[4].min, zonesList[4].max]
        }
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to preserve zones:', err);
      setErrorMsg("Failed to preserve structural heart rate zones in database settings.");
    } finally {
      setSaving(false);
    }
  };

  // Model validation/readiness status indicator strings
  const isHrrCompatible = restingVal !== null && maxVal !== null && maxVal > restingVal;
  const isMaxPctCompatible = maxVal !== null && maxVal > 0;
  const isLthrCompatible = lthrVal !== null && lthrVal > 0;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
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
            <p className="text-xs text-zinc-400 font-sans tracking-wide mt-1.5">
              Deterministic heart rate zoning based on Karvonen (HRR), Joe Friel LTHR, and Max HR Percentages
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* PARAMETERS CONFIGURATOR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
              <div>
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">CALIBRATION CONSTANTS</span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">Threshold Parameters</h3>
              </div>

              <div className="space-y-4">
                
                {/* RESTING HEART RATE */}
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">
                    Resting Heart Rate (bpm)
                  </span>
                  <input
                    type="number"
                    value={restingHr}
                    onChange={(e) => {
                      setRestingHr(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={restingVal ? restingVal.toString() : "Not set"}
                    className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-250 rounded font-mono"
                  />
                  {!restingVal && (
                    <span className="text-[10px] text-red-500 font-bold uppercase block mt-1 tracking-wider leading-none">
                      ⚠️ REQUIRED FOR KARVONEN
                    </span>
                  )}
                </div>

                {/* MAX HEART RATE */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">
                      Max Heart Rate (bpm)
                    </span>
                    
                    <button
                      onClick={() => setUseAgeEstimation(!useAgeEstimation)}
                      className={`text-[10px] uppercase font-mono font-bold select-none cursor-pointer tracking-wider px-2 py-0.5 border rounded ${
                        useAgeEstimation 
                          ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                          : 'bg-zinc-800/10 border-white/10 text-zinc-500'
                      }`}
                    >
                      Age Estimation
                    </button>
                  </div>

                  {useAgeEstimation && (
                    <div className="bg-zinc-950/40 p-3 rounded border border-white/5 space-y-2 mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#FC5200] font-bold uppercase">
                        <Info className="w-3.5 h-3.5" /> Age-Based HR Estimation Active
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs text-zinc-500 uppercase">Age:</span>
                        <input
                          type="number"
                          value={athleteAge}
                          onChange={(e) => setAthleteAge(e.target.value)}
                          className="w-16 bg-zinc-900 border border-white/10 text-center text-xs p-1 text-zinc-200 rounded font-mono outline-none"
                        />
                        <span className="text-[10px] text-zinc-400 font-mono">
                          220 - {athleteAge || '0'} = <strong className="text-white">{220 - (parseInt(athleteAge) || 30)} bpm</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  <input
                    type="number"
                    value={maxHr}
                    disabled={useAgeEstimation}
                    onChange={(e) => {
                      setMaxHr(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={maxVal ? maxVal.toString() : "Not set"}
                    className="w-full bg-zinc-900 disabled:bg-zinc-950 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-250 rounded font-mono"
                  />
                  {useAgeEstimation && (
                    <span className="text-[10px] text-[#FC5200] font-bold uppercase font-mono block mt-1">
                      Estimated Limit
                    </span>
                  )}
                  {!maxVal && (
                    <span className="text-[10px] text-red-500 font-bold uppercase block mt-1 tracking-wider leading-none">
                      ⚠️ Required
                    </span>
                  )}
                </div>

                {/* LACTATE THRESHOLD HEART RATE */}
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">
                    Lactate Threshold HR (optional / bpm)
                  </span>
                  <input
                    type="number"
                    value={lthr}
                    onChange={(e) => {
                      setLthr(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={lthrVal ? lthrVal.toString() : "Not set"}
                    className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-250 rounded font-mono"
                  />
                  {!lthrVal && (
                    <span className="text-[10px] text-zinc-650 font-bold uppercase block mt-1 font-mono">
                      Not set (Required if using LTHR method)
                    </span>
                  )}
                </div>

                {/* FORMULA METHOD SELECT */}
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">
                    Methodology Formula
                  </span>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod('karvonen')}
                      className={`p-2.5 border text-xs font-bold uppercase tracking-wide text-left rounded select-none cursor-pointer flex justify-between items-center ${
                        method === 'karvonen' 
                          ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                          : 'bg-zinc-900 border-white/10 text-zinc-450'
                      }`}
                    >
                      <span>Karvonen (HRR)</span>
                      {isHrrCompatible ? (
                        <span className="text-[9px] bg-emerald-950/50 border border-emerald-900 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded leading-none">READY</span>
                      ) : (
                        <span className="text-[9px] bg-red-950/40 border border-red-900/50 text-red-500 font-extrabold px-1.5 py-0.5 rounded leading-none">DISABLED</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod('max_pct')}
                      className={`p-2.5 border text-xs font-bold uppercase tracking-wide text-left rounded select-none cursor-pointer flex justify-between items-center ${
                        method === 'max_pct' 
                          ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                          : 'bg-zinc-900 border-white/10 text-zinc-450'
                      }`}
                    >
                      <span>% of Max Heart Rate</span>
                      {isMaxPctCompatible ? (
                        <span className="text-[9px] bg-emerald-950/50 border border-emerald-900 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded leading-none">READY</span>
                      ) : (
                        <span className="text-[9px] bg-red-950/40 border border-red-900/50 text-red-500 font-extrabold px-1.5 py-0.5 rounded leading-none">DISABLED</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMethod('lthr')}
                      className={`p-2.5 border text-xs font-bold uppercase tracking-wide text-left rounded select-none cursor-pointer flex justify-between items-center ${
                        method === 'lthr' 
                          ? 'bg-[#FC5200]/10 border-[#FC5200] text-white' 
                          : 'bg-zinc-900 border-white/10 text-zinc-450'
                      }`}
                    >
                      <span>Joe Friel Lacate Threshold (LTHR)</span>
                      {isLthrCompatible ? (
                        <span className="text-[9px] bg-emerald-950/50 border border-emerald-900 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded leading-none">READY</span>
                      ) : (
                        <span className="text-[9px] bg-red-950/40 border border-red-900/50 text-red-500 font-extrabold px-1.5 py-0.5 rounded leading-none">DISABLED</span>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* RENDERED HEART RATE ZONES */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">OUTPUT MATRICES</span>
                  <h3 className="text-sm font-bold text-white uppercase mt-0.5">Calculated Heart Intensity Zones</h3>
                  <p className="text-xs text-zinc-550 mt-1">
                    Deterministic heart rate limits derived from configured baseline metrics.
                  </p>
                </div>

                {zonesList && (
                  <button
                    onClick={handleSaveZones}
                    disabled={saving}
                    className="bg-[#FC5200] hover:bg-[#e44a00] p-2 px-4 shadow text-black font-extrabold text-xs uppercase tracking-wider rounded select-none cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'SAVING ZONES...' : 'SAVE ZONES'}
                  </button>
                )}
              </div>

              {zonesList ? (
                <div className="space-y-3 font-mono">
                  {zonesList.map((z, idx) => (
                    <div key={idx} className="bg-zinc-950/40 border border-white/5 hover:border-white/10 p-4 rounded-lg flex flex-col md:flex-row justify-between gap-2.5 items-start md:items-center transition">
                      <div>
                        <span className="text-xs font-extrabold text-white block uppercase tracking-wide">{z.name}</span>
                        <span className="text-[11px] text-zinc-500 block leading-tight mt-1 font-sans">{z.purpose}</span>
                      </div>

                      <div className="bg-[#FC5200]/10 border border-[#FC5200]/25 rounded text-center p-2 px-5 min-w-[120px] max-w-[180px]">
                        <span className="text-xs font-bold text-[#FC5200] block">{z.min} - {z.max}</span>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest block mt-0.5">BPM</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-64 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                  <Heart className="w-10 h-10 text-zinc-650 mb-3 animate-pulse" />
                  <span className="text-xs text-zinc-500 uppercase leading-relaxed max-w-sm">
                    {method === 'karvonen' && "Required resting heart rate & maximum heart rate are missing from athlete attributes configurations to map Karvonen areas."}
                    {method === 'max_pct' && "Maximum heart rate baseline value required to map max heart percentage areas."}
                    {method === 'lthr' && "Lactate threshold baseline heart value required to construct Joe Friel LTHR physiological intervals."}
                  </span>
                </div>
              )}

              {saveSuccess && (
                <div className="bg-emerald-950/20 border border-emerald-900 p-3 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 animate-face-in select-none">
                  <Check className="w-4 h-4" /> HEART RATE ZONES AND INDICES COMMITTED SUCCESSFULLY TO ATHLETE PROFILE
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-950/30 border border-red-900 text-red-500 p-3 text-xs rounded uppercase font-bold flex items-center gap-2 select-none">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* MATH INTEGRITY FOOTER */}
        <div className="bg-[#111113]/45 border border-white/10 p-5 rounded-lg flex items-start gap-4">
          <Sliders className="w-5 h-5 text-[#FC5200]/50 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            ⚠️ HEART INTENSITY INTEGRITY: Heart calculations map strictly to linear physiological indices. They preserve the raw output of clinical math models. Tracking profiles do not include simulated statistics or stochastic projections. Pure athletic science.
          </p>
        </div>

      </div>
    </div>
  );
}
