'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { db } from '../../lib/firebase/client';
import { collection, doc, setDoc, getDocs, query, limit, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  Calculator, 
  Award, 
  Check, 
  RefreshCw, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Save, 
  Share2, 
  AlertCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface RaceResult {
  id: string;
  distanceMeters: number;
  timeSeconds: number;
  date: string;
  source: 'manual' | 'strava' | 'intervals';
  notes?: string;
}

interface SavedVdotResult {
  id: string;
  userId: string;
  type: 'vdot';
  source: string;
  inputDistanceMeters: number;
  inputTimeSeconds: number;
  estimatedVdot: number;
  equivalentRaceTimes: Record<string, number>;
  trainingPaces: Record<string, number>;
  createdAt: any;
}

// Canonical race distances
const STANDARD_DISTANCES = [
  { name: '1500m', meters: 1500 },
  { name: '3000m', meters: 3000 },
  { name: '5K', meters: 5000 },
  { name: '10K', meters: 10000 },
  { name: 'Half Marathon', meters: 21097.5 },
  { name: 'Marathon', meters: 42195 }
];

export default function VdotCalculatorPage() {
  const router = useRouter();
  const { user, athleteProfile, updateAthleteProfile, loading: authLoading } = useAuth();

  // Inputs
  const [distance, setDistance] = useState<string>('5000');
  const [customDistance, setCustomDistance] = useState<string>('');
  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('20');
  const [seconds, setSeconds] = useState<string>('0');
  
  const [calcDate, setCalcDate] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('manual');

  // Stored Run Activities from Strava/Intervals
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [stagedRaces, setStagedRaces] = useState<RaceResult[]>([]);
  
  const [calculatedVdot, setCalculatedVdot] = useState<number | null>(null);
  const [equivalentTimes, setEquivalentTimes] = useState<Record<string, number>>({});
  const [paces, setPaces] = useState<Record<string, number>>({});

  // States
  const [savingResult, setSavingResult] = useState(false);
  const [saveResultSuccess, setSaveResultSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [history, setHistory] = useState<SavedVdotResult[]>([]);

  // Fetch running activities and staged races on load
  useEffect(() => {
    if (!user || !db) return;

    const loadData = async () => {
      try {
        // Fetch custom staged races/results from athlete subprofile
        if (athleteProfile?.recentRaceResults) {
          setStagedRaces(athleteProfile.recentRaceResults);
        }

        // Fetch user activities to use as input source
        const q = query(collection(db, 'users', user.uid, 'activities'), limit(150));
        const snap = await getDocs(q);
        const runs: any[] = [];
        
        snap.forEach(d => {
          const data = d.data();
          const isRun = data.sportType?.toLowerCase().includes('run') || data.type?.toLowerCase().includes('run');
          if (isRun) {
            runs.push({ id: d.id, ...data });
          }
        });

        // Simple raw chronological sorting in memory
        runs.sort((a,b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
        setUserActivities(runs);

        // Load calculation history
        const historyQuery = query(collection(db, 'users', user.uid, 'calculatorResults'), limit(10));
        const historySnap = await getDocs(historyQuery);
        const historyList: SavedVdotResult[] = [];
        historySnap.forEach(d => {
          const data = d.data();
          if (data.type === 'vdot') {
            historyList.push({ id: d.id, ...data } as SavedVdotResult);
          }
        });
        historyList.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setHistory(historyList);
      } catch (err) {
        console.error('Failed to load runs metrics:', err);
      }
    };

    loadData();
  }, [user, athleteProfile]);

  // Solver: Given Distance (m) and VDOT Index solve for race duration (sec) using Bisection
  const solveTimeForDistance = (distanceMeters: number, vdot: number): number => {
    let low = 1.0;          // 1 minute
    let high = 2000.0;     // Over 33 hours
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

      if (diff > 0) {
        low = t;
      } else {
        high = t;
      }
    }
    return t * 60; // Minutes to seconds
  };

  // Solver: Given Velocity m/min and Percent of max oxygen intake solve for VDOT
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

  // Solver: Given target % of VO2Max, find deterministic velocity and pace (sec/km)
  const calculatePaceForPercent = (vdot: number, p: number): number => {
    const vo2Target = p * vdot;
    // Solve: 0.000104 * v^2 + 0.182258 * v - (4.60 + vo2Target) = 0
    const a = 0.000104;
    const b = 0.182258;
    const c = -(4.60 + vo2Target);

    const discriminant = Math.pow(b, 2) - 4 * a * c;
    if (discriminant < 0) return 0;
    
    // Positive root is our velocity in m/min
    const v = (-b + Math.sqrt(discriminant)) / (2 * a);
    return v > 0 ? (60000 / v) : 0; // return seconds per km
  };

  const handleCalculate = () => {
    setErrorMsg(null);
    let distMeters = 0;
    if (distance === 'custom') {
      distMeters = parseFloat(customDistance) || 0;
    } else {
      distMeters = parseFloat(distance);
    }

    const totalSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

    if (distMeters <= 100 || distMeters > 200000) {
      setErrorMsg("Please provide a realistic distance between 100m and 200km.");
      setCalculatedVdot(null);
      return;
    }

    if (totalSeconds <= 10 || totalSeconds > 86400) {
      setErrorMsg("Please specify a duration from 10 seconds up to 24 hours.");
      setCalculatedVdot(null);
      return;
    }

    const resolvedVdot = calculateVdotFromRace(distMeters, totalSeconds);
    if (!resolvedVdot) {
      setErrorMsg("Unable to obtain a valid VDOT index from this combination. Check the values.");
      setCalculatedVdot(null);
      return;
    }

    const trimmedVdot = parseFloat(resolvedVdot.toFixed(2));
    setCalculatedVdot(trimmedVdot);

    // 1. Calculate Equivalent Race Times deterministically
    const equivs: Record<string, number> = {};
    STANDARD_DISTANCES.forEach(dist => {
      equivs[dist.name] = solveTimeForDistance(dist.meters, trimmedVdot);
    });
    setEquivalentTimes(equivs);

    // 2. Calculate Daniels Pace Zones from VDOT
    // Easy (65%), Marathon (80%), Threshold (86%), Interval (98%), Repetition (107%)
    setPaces({
      easy: calculatePaceForPercent(trimmedVdot, 0.65),
      marathon: calculatePaceForPercent(trimmedVdot, 0.80),
      threshold: calculatePaceForPercent(trimmedVdot, 0.86),
      interval: calculatePaceForPercent(trimmedVdot, 0.98),
      repetition: calculatePaceForPercent(trimmedVdot, 1.07),
    });
  };

  // Run calculation automatically on inputs change
  useEffect(() => {
    handleCalculate();
  }, [distance, customDistance, hours, minutes, seconds]);

  // Sync chosen activity as inputs
  const handleSelectActivity = (act: any, sourceName: 'strava' | 'intervals') => {
    setSelectedSource(sourceName);
    const m = act.distanceMeters || act.distance || 5000;
    // Set custom distance since it might not be a dropdown match
    setDistance('custom');
    setCustomDistance(Math.round(m).toString());
    
    const sec = act.movingTimeSeconds || act.moving_time || act.elapsedTimeSeconds || 1200;
    setHours(Math.floor(sec / 3600).toString());
    setMinutes(Math.floor((sec % 3600) / 60).toString());
    setSeconds(Math.floor(sec % 60).toString());

    if (act.startDate) {
      setCalcDate(act.startDate.substring(0, 10));
    }
  };

  // Sync staged custom race results as inputs
  const handleSelectStagedRace = (race: RaceResult) => {
    setSelectedSource(race.source);
    setDistance('custom');
    setCustomDistance(race.distanceMeters.toString());
    setHours(Math.floor(race.timeSeconds / 3600).toString());
    setMinutes(Math.floor((race.timeSeconds % 3600) / 60).toString());
    setSeconds(Math.floor(race.timeSeconds % 60).toString());
    setCalcDate(race.date);
  };

  // Save Calculator Result to History Subcollection
  const handleSaveResult = async () => {
    if (!user || !calculatedVdot || !db) return;
    setSavingResult(true);
    setSaveResultSuccess(false);

    let activeDistance = 5000;
    if (distance === 'custom') {
      activeDistance = parseFloat(customDistance) || 0;
    } else {
      activeDistance = parseFloat(distance);
    }
    const inputTimeSeconds = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

    const resultId = `vdot_calc_${Date.now()}`;
    const resultDocRef = doc(db, 'users', user.uid, 'calculatorResults', resultId);

    const calcObj: SavedVdotResult = {
      id: resultId,
      userId: user.uid,
      type: 'vdot',
      source: selectedSource,
      inputDistanceMeters: activeDistance,
      inputTimeSeconds: inputTimeSeconds,
      estimatedVdot: calculatedVdot,
      equivalentRaceTimes: equivalentTimes,
      trainingPaces: paces,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(resultDocRef, calcObj);
      setSaveResultSuccess(true);
      setHistory(prev => [calcObj, ...prev]);
      setTimeout(() => setSaveResultSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving calculator result:', err);
      setErrorMsg("Failed to preserve calculator calculation result to history.");
    } finally {
      setSavingResult(false);
    }
  };

  // Commit Estimated VDOT to primary profile
  const handleCommitToProfile = async () => {
    if (!user || !calculatedVdot) return;
    setSavingProfile(true);
    setSaveProfileSuccess(false);
    try {
      // Direct write to subcollection done through updateAthleteProfile
      await updateAthleteProfile({
        vdotScore: calculatedVdot
      });
      setSaveProfileSuccess(true);
      setTimeout(() => setSaveProfileSuccess(false), 3000);
    } catch (err) {
      console.error('Error committing VDOT score:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  // Format pace presentation based on selected metric units
  const formatPace = (secPerKm: number) => {
    if (!secPerKm || isNaN(secPerKm)) return '—';
    const isMetric = athleteProfile?.preferredUnits !== 'imperial';
    
    let workingSecs = secPerKm;
    if (!isMetric) {
      workingSecs = secPerKm * 1.60934; // seconds per mile
    }

    const min = Math.floor(workingSecs / 60);
    const sec = Math.round(workingSecs % 60);
    return `${min}:${sec.toString().padStart(2, '0')} /${isMetric ? 'km' : 'mi'}`;
  };

  const formatRaceTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.round(totalSeconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
              <Calculator className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">VDOT Performance Labs</h1>
            </div>
            <p className="text-xs text-zinc-400 font-sans tracking-wide mt-1.5">
              Deterministic VO2Max equivalents & training pacings based on classical Jack Daniels formula
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* PARAMETER CONFIGURATIONS (LEFT 2 COLS) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* INPUT OPTIONS */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
              <div>
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">INPUT CONSTRAINTS</span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">Race Performance Driver</h3>
              </div>

              {/* CHOOSE PRESET HISTORIC DATA TO POPULATE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* STAGED RACE RESULTS SELECT */}
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">From Staged Base Results</span>
                  {stagedRaces.length > 0 ? (
                    <select
                      onChange={(e) => {
                        const r = stagedRaces.find(x => x.id === e.target.value);
                        if (r) handleSelectStagedRace(r);
                      }}
                      className="w-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs p-2 rounded focus:border-[#FC5200] outline-none"
                    >
                      <option value="">Choose Staged Race Result</option>
                      {stagedRaces.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.distanceMeters}m @ {formatRaceTime(r.timeSeconds)} ({r.date})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-zinc-650 italic block border border-dashed border-white/5 p-2 rounded text-center">
                      No staged profile races currently
                    </span>
                  )}
                </div>

                {/* REAL STRAVA CONNECTIONS SELECT */}
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">From Importer Run Operations</span>
                  {userActivities.length > 0 ? (
                    <select
                      onChange={(e) => {
                        const act = userActivities.find(x => x.id === e.target.value);
                        if (act) handleSelectActivity(act, 'strava');
                      }}
                      className="w-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs p-2 rounded focus:border-[#FC5200] outline-none"
                    >
                      <option value="">Choose Synchronized Run</option>
                      {userActivities.map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.name} | {(act.distanceMeters / 1000).toFixed(2)}km @ {formatRaceTime(act.movingTimeSeconds)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-zinc-650 italic block border border-dashed border-white/5 p-2 rounded text-center">
                      No synchronized running records loaded
                    </span>
                  )}
                </div>

              </div>

              <div className="border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Distance Parameter</span>
                  <select
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs p-2.5 rounded focus:border-[#FC5200] outline-none"
                  >
                    <option value="1500">1500m</option>
                    <option value="3000">3000m</option>
                    <option value="5000">5000m (5K)</option>
                    <option value="10000">10000m (10K)</option>
                    <option value="21097.5">Half Marathon (21.1 km)</option>
                    <option value="42195">Marathon (42.2 km)</option>
                    <option value="custom">Custom Metres...</option>
                  </select>
                </div>

                {distance === 'custom' && (
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Custom Distance (meters)</span>
                    <input
                      type="number"
                      value={customDistance}
                      onChange={(e) => setCustomDistance(e.target.value)}
                      placeholder="e.g. 1609"
                      className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1 md:col-span-2">
                  <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Duration Constants</span>
                  <div className="grid grid-cols-3 gap-1">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="HH"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded text-center font-mono"
                      />
                      <span className="absolute right-2 top-2.5 text-[9px] text-zinc-650 uppercase font-bold font-mono">H</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="MM"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded text-center font-mono"
                      />
                      <span className="absolute right-2 top-2.5 text-[9px] text-zinc-650 uppercase font-bold font-mono">M</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="SS"
                        value={seconds}
                        onChange={(e) => setSeconds(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded text-center font-mono"
                      />
                      <span className="absolute right-2 top-2.5 text-[9px] text-zinc-650 uppercase font-bold font-mono">S</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Race Date (Optional)</span>
                  <input
                    type="date"
                    value={calcDate}
                    onChange={(e) => setCalcDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2 text-zinc-200 rounded font-mono"
                  />
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Source Attribution</span>
                  <select
                    value={selectedSource || 'manual'}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs p-2.5 rounded focus:border-[#FC5200] outline-none"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="strava">Strava Best Effort</option>
                    <option value="strava_activity">Strava Activity</option>
                    <option value="intervals">Intervals.icu</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-950/30 border border-red-900 text-red-400 p-3 text-xs rounded uppercase font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* RESOLVED MATHS & FORMULA ZONES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TRAINING PACES GRAPHIC */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
                <div>
                  <span className="text-xs text-[#FC5200] font-mono font-bold uppercase font-bold">DETERMINISTIC INTENSITIES</span>
                  <h3 className="text-sm font-bold text-white uppercase mt-0.5">Daniels Training Paces</h3>
                </div>

                {calculatedVdot ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-zinc-950/40 p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <div>
                        <span className="text-xs font-bold text-white block uppercase">Easy Pace (E)</span>
                        <span className="text-[10px] text-zinc-500 block">Aerobic cell mitochondria adaptation</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#FC5200]">{formatPace(paces.easy || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-950/40 p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <div>
                        <span className="text-xs font-bold text-white block uppercase">Marathon Pace (M)</span>
                        <span className="text-[10px] text-zinc-500 block">Race efficiency & high endurance durability</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#FC5200]">{formatPace(paces.marathon || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-950/40 p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <div>
                        <span className="text-xs font-bold text-white block uppercase">Threshold Pace (T)</span>
                        <span className="text-[10px] text-zinc-500 block">Lactate clearance clearance speed</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#FC5200]">{formatPace(paces.threshold || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-950/40 p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <div>
                        <span className="text-xs font-bold text-white block uppercase">Interval Pace (I)</span>
                        <span className="text-[10px] text-zinc-500 block">VO2Max peak cardiac threshold</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#FC5200]">{formatPace(paces.interval || 0)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-950/40 p-3 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <div>
                        <span className="text-xs font-bold text-white block uppercase">Repetition Pace (R)</span>
                        <span className="text-[10px] text-zinc-500 block">Anaerobic tolerance & power biomechanical economy</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#FC5200]">{formatPace(paces.repetition || 0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                    <Calculator className="w-8 h-8 text-zinc-650 mb-2" />
                    <span className="text-xs text-zinc-500 uppercase leading-relaxed">
                      "Not enough data to calculate" paces. Enter distance and duration constants.
                    </span>
                  </div>
                )}
              </div>

              {/* EQUIVALENT COMPETITION TIMES */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5">
                <div>
                  <span className="text-xs text-[#FC5200] font-mono font-bold uppercase font-bold">PREDICTIVE STRENGHT MODELS</span>
                  <h3 className="text-sm font-bold text-white uppercase mt-0.5">Daniels Equivalent Times</h3>
                </div>

                {calculatedVdot ? (
                  <div className="space-y-2.5 select-none font-mono">
                    {STANDARD_DISTANCES.map((d) => (
                      <div key={d.name} className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded border border-white/5 hover:border-white/10 transition">
                        <span className="text-xs font-bold text-zinc-300">{d.name}</span>
                        <span className="text-xs font-bold text-white">{formatRaceTime(equivalentTimes[d.name] || 0)}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-zinc-500 leading-snug mt-1 font-sans">
                      *Estimated from current race performance. Assumes symmetric training specificity.
                    </p>
                  </div>
                ) : (
                  <div className="h-48 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                    <Award className="w-8 h-8 text-zinc-650 mb-2" />
                    <span className="text-xs text-zinc-500 uppercase">
                      Please enter distance and time parameters down in the performance drive form.
                    </span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* SIDEBARS: ACTIVE CONTROLS & COMPUTATION HISTORY */}
          <div className="space-y-6">

            {/* ACTION CENTER */}
            {calculatedVdot && (
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div>
                  <span className="text-xs text-[#FC5200] font-mono font-bold uppercase font-bold">ANALYSIS METRIC</span>
                  <h3 className="text-sm font-bold text-white uppercase mt-0.5">Estimated VDOT Index</h3>
                </div>

                <div className="bg-zinc-950/60 border border-[#FC5200]/30 text-center p-6 rounded relative overflow-hidden">
                  <div className="text-4xl font-extrabold text-white tracking-tight">{calculatedVdot}</div>
                  <span className="text-[10px] text-[#FC5200] font-bold block uppercase mt-1 tracking-wider">
                    VO2MAX ML/KG/MIN EQUIVALENT
                  </span>
                </div>

                {/* DB HISTORIC COMMIT ACTION */}
                <div className="pt-2 space-y-3">
                  <button
                    onClick={handleCommitToProfile}
                    disabled={savingProfile || athleteProfile?.vdotScore === calculatedVdot}
                    className="w-full h-11 bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-900 disabled:text-zinc-640 border border-transparent disabled:border-white/5 cursor-pointer text-black font-extrabold uppercase text-[11px] tracking-wider rounded select-none transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {athleteProfile?.vdotScore === calculatedVdot 
                      ? 'COMMITTED TO PROFILE' 
                      : (savingProfile ? 'COMMITTING VDOT...' : 'COMMIT VDOT TO PROFILE')}
                  </button>

                  <button
                    onClick={handleSaveResult}
                    disabled={savingResult}
                    className="w-full h-11 bg-zinc-950 hover:bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-extrabold uppercase text-[11px] tracking-wider rounded cursor-pointer select-none transition-all flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4 text-[#FC5200]" />
                    {savingResult ? 'PRESERVING WORKOUT LOGS...' : 'SAVE TO HISTORY'}
                  </button>
                </div>

                {saveProfileSuccess && (
                  <div className="bg-emerald-950/20 border border-emerald-900 p-2.5 text-center text-emerald-400 text-[10px] rounded uppercase font-bold flex items-center justify-center gap-1 animate-fade-in select-none">
                    <Check className="w-3.5 h-3.5" /> ATHLETE PROFILE STATE STAGE UPDATED successfully
                  </div>
                )}

                {saveResultSuccess && (
                  <div className="bg-emerald-950/20 border border-emerald-900 p-2.5 text-center text-emerald-400 text-[10px] rounded uppercase font-bold flex items-center justify-center gap-1 animate-fade-in select-none">
                    <Check className="w-3.5 h-3.5" /> CALCULATION SAVED TO HISTORIC RECORD DB
                  </div>
                )}
              </div>
            )}

            {/* CALCULATION HISTORY */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase font-bold">PRESERVED CALCULATIONS</span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">Calculations History</h3>
              </div>

              {history.length > 0 ? (
                <div className="space-y-2.5 font-mono max-h-[300px] overflow-y-auto pr-1">
                  {history.map((h, i) => (
                    <div key={i} className="bg-zinc-950/40 border border-white/5 hover:border-white/10 p-2.5 rounded text-xs transition">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-bold font-sans">VDOT {h.estimatedVdot}</span>
                        <span className="text-[10px] text-zinc-550 italic font-sans">{new Date(h.createdAt || 0).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 justify-between">
                        <span className="text-[10px] text-zinc-300 font-sans">
                          {(h.inputDistanceMeters / 1000).toFixed(2)}km @ {formatRaceTime(h.inputTimeSeconds)}
                        </span>
                        <span className="p-0.5 px-1.5 text-[9px] uppercase font-bold bg-[#1ca3ff]/10 text-zinc-450 border border-[#1ca3ff]/20 rounded font-sans leading-none">
                          {h.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-550 italic text-center p-4 border border-dashed border-white/10 rounded leading-relaxed font-sans">
                  No calculations preserved in historical databases logs yet. Commit a result above.
                </p>
              )}
            </div>

          </div>

        </div>

        {/* MATH INTEGRITY FOOTER */}
        <div className="bg-[#111113]/45 border border-white/10 p-5 rounded-lg flex items-start gap-4">
          <TrendingUp className="w-5 h-5 text-[#FC5200]/50 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            ⚠️ SPORT SCIENCE EQUIVALENTS: Tracking structures compute Jack Daniels parameters directly. They require strictly verified sports biomechanics equations. Predictive outputs do not employ artificial generative intelligence or unstable stochastic layers. Pure sports engineering modeling.
          </p>
        </div>

      </div>
    </div>
  );
}
