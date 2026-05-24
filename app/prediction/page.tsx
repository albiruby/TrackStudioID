'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Award, 
  Activity, 
  RefreshCw,
  Compass,
  Save,
  Check,
  AlertTriangle,
  History,
  Info
} from 'lucide-react';
import { getActivities } from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';
import { db } from '../../lib/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TARGET_DISTANCES = [
  { name: '1500m', meters: 1500 },
  { name: '1 mile', meters: 1609.34 },
  { name: '3K', meters: 3000 },
  { name: '5K', meters: 5000 },
  { name: '10K', meters: 10000 },
  { name: '15K', meters: 15000 },
  { name: '10 mile', meters: 16093.44 },
  { name: 'Half Marathon', meters: 21097.5 },
  { name: 'Marathon', meters: 42195 }
];

const solveTimeForDistance = (distanceMeters: number, vdot: number): number => {
    let low = 1.0;          
    let high = 2000.0;     
    let t = (low + high) / 2;
    for (let i = 0; i < 70; i++) {
        t = (low + high) / 2;
        const v = distanceMeters / t;
        const vo2 = -4.60 + (0.182258 * v) + (0.000104 * Math.pow(v, 2));
        const factor1 = 0.298956 * Math.exp(-0.19326 * t);
        const factor2 = 0.189439 * Math.exp(-0.01278 * t);
        const pctMax = 0.8 + factor1 + factor2;

        const diff = vo2 - vdot * pctMax;
        if (Math.abs(diff) < 1e-7) break;
        if (diff > 0) low = t;
        else high = t;
    }
    return t * 60; 
};

const calculateVdotFromRace = (distMeters: number, totalSeconds: number): number | null => {
    if (distMeters <= 0 || totalSeconds <= 0) return null;
    const totalTimeMin = totalSeconds / 60;
    const velocity = distMeters / totalTimeMin;
    const vo2 = -4.60 + (0.182258 * velocity) + (0.000104 * Math.pow(velocity, 2));
    const factor1 = 0.298956 * Math.exp(-0.19326 * totalTimeMin);
    const factor2 = 0.189439 * Math.exp(-0.01278 * totalTimeMin);
    const pctMax = 0.8 + factor1 + factor2;
    const vdotValue = vo2 / pctMax;
    return isNaN(vdotValue) || vdotValue <= 5 || vdotValue > 110 ? null : vdotValue;
};

const predictRiegel = (t1: number, d1: number, d2: number) => {
    if (!t1 || !d1 || d1 <= 0) return null;
    return t1 * Math.pow(d2 / d1, 1.06);
};

export default function PredictionPage() {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const [source, setSource] = useState<'manual' | 'activity' | 'vdot'>('manual');
  const [targetDistObj, setTargetDistObj] = useState(TARGET_DISTANCES[4]);

  // Manual input state
  const [manualDist, setManualDist] = useState<string>('5000');
  const [manualHr, setManualHr] = useState<string>('0');
  const [manualMin, setManualMin] = useState<string>('25');
  const [manualSec, setManualSec] = useState<string>('0');

  // Activity input state
  const [selectedActId, setSelectedActId] = useState<string>('');
  const [selectedEffortIdx, setSelectedEffortIdx] = useState<string>('-1');

  // Computed state
  const [inputDistance, setInputDistance] = useState<number | null>(null);
  const [inputTime, setInputTime] = useState<number | null>(null);
  const [inputDate, setInputDate] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function init() {
      if (!user) return;
      try {
        const list = await getActivities(user.uid);
        const sorted = (list || []).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setActivities(sorted);
        if (sorted.length > 0) setSelectedActId(sorted[0].id);
      } catch (e) {
        // error
      } finally {
        setLoadingActivities(false);
      }
    }
    if (!authLoading) {
      if (!user) router.push('/login');
      else init();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (source === 'manual') {
      const d = parseFloat(manualDist);
      const h = parseInt(manualHr) || 0;
      const m = parseInt(manualMin) || 0;
      const s = parseInt(manualSec) || 0;
      const t = h * 3600 + m * 60 + s;
      setInputDistance(d > 0 ? d : null);
      setInputTime(t > 0 ? t : null);
      setInputDate(null);
    } else if (source === 'vdot') {
      setInputDistance(null);
      setInputTime(null);
      setInputDate(null);
    } else if (source === 'activity') {
      const act = activities.find(a => a.id === selectedActId);
      if (act) {
        let bestEffort = null;
        if (selectedEffortIdx !== '-1' && act.bestEfforts && act.bestEfforts[parseInt(selectedEffortIdx)]) {
           bestEffort = act.bestEfforts[parseInt(selectedEffortIdx)];
        }

        if (bestEffort && bestEffort.distanceMeters && bestEffort.movingTimeSeconds) {
            setInputDistance(bestEffort.distanceMeters);
            setInputTime(bestEffort.movingTimeSeconds);
            setInputDate(act.startDate);
        } else if (act.distanceMeters && act.movingTimeSeconds) {
            setInputDistance(act.distanceMeters);
            setInputTime(act.movingTimeSeconds);
            setInputDate(act.startDate);
        } else {
            setInputDistance(null);
            setInputTime(null);
            setInputDate(null);
        }
      } else {
         setInputDistance(null);
         setInputTime(null);
         setInputDate(null);
      }
    }
  }, [source, manualDist, manualHr, manualMin, manualSec, selectedActId, selectedEffortIdx, activities]);

  const selectedActivity = activities.find(a => a.id === selectedActId);
  const activeVdot = athleteProfile?.vdotScore;

  // Calculators
  let baseVdot: number | null = null;
  let riegelPred: number | null = null;
  let vdotPred: number | null = null;
  
  if (source === 'vdot' && activeVdot) {
      baseVdot = activeVdot;
      vdotPred = solveTimeForDistance(targetDistObj.meters, activeVdot);
  } else if (inputDistance && inputTime) {
      baseVdot = calculateVdotFromRace(inputDistance, inputTime);
      riegelPred = predictRiegel(inputTime, inputDistance, targetDistObj.meters);
      if (baseVdot) {
          vdotPred = solveTimeForDistance(targetDistObj.meters, baseVdot);
      }
  }

  // Confidence Label
  let confidence = 'Low';
  if (source === 'activity' && inputDate) {
      const diffDays = (new Date().getTime() - new Date(inputDate).getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 90) confidence = 'High';
      else confidence = 'Medium';
  } else if (source === 'vdot') {
      confidence = 'Medium';
  } else if (source === 'manual') {
      confidence = 'Low';
  }

  const formatPace = (secPerKm: number | null) => {
    if (!secPerKm || isNaN(secPerKm)) return '—';
    const min = Math.floor(secPerKm / 60);
    const sec = Math.round(secPerKm % 60);
    return `${min}:${sec.toString().padStart(2, '0')}/km`;
  };

  const formatDuration = (totalSeconds: number | null) => {
    if (!totalSeconds || isNaN(totalSeconds)) return '—';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.round(totalSeconds % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  const handleSaveResult = async () => {
    if (!user || (!riegelPred && !vdotPred)) return;
    setSaving(true);
    try {
        await addDoc(collection(db, 'users', user.uid, 'calculatorResults'), {
            userId: user.uid,
            type: "race_prediction",
            source: source,
            inputDistanceMeters: inputDistance,
            inputTimeSeconds: inputTime,
            targetDistanceMeters: targetDistObj.meters,
            method: riegelPred ? 'Riegel / VDOT' : 'VDOT Equivalent',
            estimatedTimeSeconds: riegelPred || vdotPred,
            estimatedPaceSecPerKm: (riegelPred || vdotPred || 0) / (targetDistObj.meters / 1000),
            confidenceLabel: confidence,
            createdAt: serverTimestamp()
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    } catch(err) {
        console.error(err);
    } finally {
        setSaving(false);
    }
  };


  if (authLoading || loadingActivities) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 font-mono">Calibrating Diagnostic Datasets...</span>
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
              <Award className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-xl font-bold uppercase tracking-tight font-mono text-white leading-none">Race Predictor</h1>
            </div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1.5 font-mono">
              Estimate target race paces using deterministic conversion formulas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COL: CONFIGURATION */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                  <span className="text-[10px] text-zinc-500 font-bold font-mono tracking-widest uppercase block mb-3">1. Select Input Source</span>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full bg-[#1c1c1e] border border-white/15 p-2.5 outline-none focus:border-[#FC5200] text-sm text-zinc-200 font-mono rounded mb-4"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="activity">Strava Activity / Best Effort</option>
                    <option value="vdot">Saved VDOT Index ({activeVdot || 'Not Set'})</option>
                  </select>

                  {source === 'vdot' && (
                      <div className="p-3 bg-white/5 border border-white/10 rounded font-mono text-xs text-zinc-400">
                          {activeVdot ? (
                              <>Active VDOT base is {activeVdot}.</>
                          ) : (
                              <span className="text-red-400 block pb-2">No active VDOT index found on profile.</span>
                          )}
                          <a href="/vdot-calculator" className="text-[#FC5200] mt-2 block underline">Navigate to VDOT Calculator</a>
                      </div>
                  )}

                  {source === 'manual' && (
                      <div className="space-y-4">
                        <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Distance (Meters)</span>
                            <input type="number" className="w-full bg-[#1c1c1e] border border-white/15 p-2 outline-none focus:border-[#FC5200] text-sm text-zinc-200 font-mono rounded" value={manualDist} onChange={e => setManualDist(e.target.value)} />
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Time (HH:MM:SS)</span>
                            <div className="grid grid-cols-3 gap-2">
                                <input type="number" placeholder="HH" className="w-full bg-[#1c1c1e] border border-white/15 p-2 outline-none focus:border-[#FC5200] text-sm text-zinc-200 font-mono rounded text-center" value={manualHr} onChange={e => setManualHr(e.target.value)} />
                                <input type="number" placeholder="MM" className="w-full bg-[#1c1c1e] border border-white/15 p-2 outline-none focus:border-[#FC5200] text-sm text-zinc-200 font-mono rounded text-center" value={manualMin} onChange={e => setManualMin(e.target.value)} />
                                <input type="number" placeholder="SS" className="w-full bg-[#1c1c1e] border border-white/15 p-2 outline-none focus:border-[#FC5200] text-sm text-zinc-200 font-mono rounded text-center" value={manualSec} onChange={e => setManualSec(e.target.value)} />
                            </div>
                        </div>
                      </div>
                  )}

                  {source === 'activity' && (
                      <div className="space-y-4">
                        {activities.length > 0 ? (
                            <>
                                <div>
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Base Activity</span>
                                    <select
                                        value={selectedActId}
                                        onChange={(e) => setSelectedActId(e.target.value)}
                                        className="w-full bg-[#1c1c1e] border border-white/15 p-2 outline-none focus:border-[#FC5200] text-xs text-zinc-200 font-mono rounded truncate"
                                    >
                                        {activities.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.startDate.slice(0,10)} | {a.name}
                                        </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedActivity?.bestEfforts && selectedActivity.bestEfforts.length > 0 && (
                                    <div>
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Extracted Best Effort (Optional)</span>
                                        <select
                                            value={selectedEffortIdx}
                                            onChange={(e) => setSelectedEffortIdx(e.target.value)}
                                            className="w-full bg-[#1c1c1e] border border-white/15 p-2 outline-none focus:border-[#FC5200] text-xs text-zinc-200 font-mono rounded truncate"
                                        >
                                            <option value="-1">Use Whole Activity Data ({formatDuration(selectedActivity.movingTimeSeconds)} over {(selectedActivity.distanceMeters/1000).toFixed(2)}km)</option>
                                            {selectedActivity.bestEfforts.map((b, i) => (
                                                <option key={i} value={i}>{b.name} - {formatDuration(b.movingTimeSeconds)}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-amber-500 text-xs font-mono uppercase font-bold p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                                No synced activities found.
                            </div>
                        )}
                      </div>
                  )}
              </div>

              <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                  <span className="text-[10px] text-zinc-500 font-bold font-mono tracking-widest uppercase block mb-3">2. Target Race</span>
                  <div className="grid grid-cols-2 gap-2">
                       {TARGET_DISTANCES.map((d) => (
                            <button
                              key={d.meters}
                              onClick={() => setTargetDistObj(d)}
                              className={`p-2 border rounded font-mono text-xs uppercase font-bold transition-colors cursor-pointer ${
                                  targetDistObj.meters === d.meters
                                  ? 'bg-[#FC5200] border-[#FC5200] text-black'
                                  : 'bg-zinc-800/30 border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
                              }`}
                            >
                                {d.name}
                            </button>
                       ))}
                  </div>
              </div>

              <div className="bg-[#111113] border border-[#1ca3ff]/30 rounded-lg p-5">
                  <span className="text-[10px] text-[#1ca3ff] font-bold font-mono tracking-widest uppercase block mb-2 flex items-center gap-1.5"><Info className="w-3 h-3" /> Data Requirements</span>
                  <p className="text-[11px] text-zinc-400 font-mono leading-relaxed pb-3">
                      All predictions are labeled "Estimated". Prediction tools evaluate aerobic efficiency mathematically assuming optimal conditions.
                  </p>
                   <ul className="text-[10px] text-zinc-400 font-mono space-y-1.5">
                       <li className="flex justify-between border-b border-white/5 pb-1"><span>Target Selected</span> <span className="text-white font-bold">{targetDistObj.name}</span></li>
                       <li className="flex justify-between border-b border-white/5 pb-1"><span>Target Distance</span> <span className="text-white font-bold">{targetDistObj.meters.toFixed(0)}m</span></li>
                       <li className="flex justify-between border-b border-white/5 pb-1"><span>Calculated Input</span> <span className="text-white font-bold uppercase">{source}</span></li>
                       <li className="flex justify-between border-b border-white/5 pb-1"><span>Input Distance</span> <span className="text-white font-bold">{inputDistance ? `${(inputDistance).toFixed(0)}m` : '—'}</span></li>
                       <li className="flex justify-between pb-1"><span>Input Duration</span> <span className="text-white font-bold">{inputTime ? formatDuration(inputTime) : '—'}</span></li>
                   </ul>
              </div>
          </div>

          {/* RIGHT COL: RESULTS */}
          <div className="lg:col-span-2 space-y-6">

              {/* PRIMARY PREDICTION CARD */}
              <div className="bg-[#111113] border border-white/10 rounded-lg overflow-hidden flex flex-col justify-between" style={{ minHeight: '320px'}}>
                  <div className="p-6 border-b border-white/5 bg-zinc-900/50 flex justify-between items-start">
                       <div>
                           <span className="text-[11px] text-[#FC5200] font-bold tracking-widest font-mono uppercase">ESTIMATED POTENTIAL</span>
                           <h2 className="text-2xl font-bold text-white uppercase tracking-wider mt-1">{targetDistObj.name}</h2>
                       </div>
                       <div className="text-right">
                           <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest font-mono block">Confidence</span>
                           <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded font-mono ${
                               confidence === 'High' ? 'bg-emerald-500/20 text-emerald-400' :
                               confidence === 'Medium' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'
                           }`}>{confidence}</span>
                       </div>
                  </div>

                  <div className="p-6 md:p-10 flex-1 flex flex-col justify-center items-center relative gap-8">
                       {(!inputDistance && source !== 'vdot') || (!activeVdot && source === 'vdot') ? (
                           <div className="text-zinc-500 uppercase font-mono text-sm tracking-widest font-bold flex flex-col items-center gap-3">
                                <Compass className="w-8 h-8 opacity-50" />
                                Select a race result or enter one manually.
                           </div>
                       ) : (
                           <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                               
                               {/* Riegel Block */}
                               {(source === 'manual' || source === 'activity') && riegelPred ? (
                                   <div className="bg-zinc-950 border border-white/10 rounded p-6 text-center space-y-1">
                                       <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Peter Riegel Formula</span>
                                       <div className="text-4xl text-white font-extrabold tracking-tight pt-2">{formatDuration(riegelPred)}</div>
                                       <div className="text-xs text-zinc-400 font-mono pt-1">Estimated Pace: {formatPace(riegelPred / (targetDistObj.meters/1000))}</div>
                                   </div>
                               ) : null}

                               {/* VDOT Block */}
                               {vdotPred ? (
                                   <div className="bg-zinc-950 border border-white/10 rounded p-6 text-center space-y-1">
                                       <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Jack Daniels VDOT Equivalent</span>
                                       <div className="text-4xl text-white font-extrabold tracking-tight pt-2">{formatDuration(vdotPred)}</div>
                                       <div className="text-xs text-zinc-400 font-mono pt-1">Estimated Pace: {formatPace(vdotPred / (targetDistObj.meters/1000))}</div>
                                   </div>
                               ) : null}
                               
                           </div>
                       )}
                  </div>

                  <div className="p-4 bg-zinc-950 border-t border-white/5 flex gap-3">
                      <button 
                        onClick={handleSaveResult}
                        disabled={saving || (!vdotPred && !riegelPred)}
                        className="w-full py-3 bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-900 disabled:text-zinc-600 disabled:cursor-not-allowed font-bold text-black uppercase text-xs tracking-widest font-mono rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? 'Processing...' : 'Preserve Prediction'}
                      </button>
                      {saveSuccess && (
                          <div className="flex-1 max-w-[200px] border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold font-mono rounded flex items-center justify-center">
                              Saved to Hub
                          </div>
                      )}
                  </div>
              </div>

              {/* EQUIVALENT TABLE */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6">
                  <span className="text-[11px] text-zinc-400 font-bold tracking-widest font-mono uppercase mb-4 block">Calculated Equivalent Matrix</span>
                  
                  {baseVdot ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono text-xs whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-white/10 text-zinc-600 text-[10px]">
                                    <th className="p-2 font-bold uppercase">Distance</th>
                                    <th className="p-2 font-bold uppercase">Estimated VDOT Time</th>
                                    <th className="p-2 font-bold uppercase">Estimated VDOT Pace</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TARGET_DISTANCES.map((td) => {
                                    const tp = solveTimeForDistance(td.meters, baseVdot);
                                    return (
                                        <tr key={td.meters} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${td.meters === targetDistObj.meters ? 'bg-white/5' : ''}`}>
                                            <td className={`p-2 font-bold ${td.meters === targetDistObj.meters ? 'text-[#FC5200]' : 'text-zinc-300'}`}>{td.name}</td>
                                            <td className="p-2 text-white">{formatDuration(tp)}</td>
                                            <td className="p-2 text-zinc-500">{formatPace(tp / (td.meters / 1000))}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                  ) : (
                      <div className="p-6 text-center text-zinc-600 font-mono text-xs uppercase">
                          Not enough data to estimate equivalent matrix.
                      </div>
                  )}
              </div>

          </div>

        </div>

      </div>
    </div>
  );
}
