'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  User, 
  Check, 
  Heart, 
  Activity, 
  Plus, 
  Trash2, 
  Zap, 
  Award, 
  AlertCircle, 
  Scale, 
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

interface RaceResult {
  id: string;
  distanceMeters: number;
  timeSeconds: number;
  date: string;
  source: 'manual' | 'strava' | 'intervals';
  notes?: string;
}

export default function AthleteProfilePage() {
  const router = useRouter();
  const { user, athleteProfile, updateAthleteProfile, loading: authLoading } = useAuth();

  // Primary particulars
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [preferredUnits, setPreferredUnits] = useState<'metric' | 'imperial'>('metric');

  // Physiological heart rates
  const [restingHeartRate, setRestingHeartRate] = useState('');
  const [maxHeartRate, setMaxHeartRate] = useState('');
  const [lactateThresholdHeartRate, setLactateThresholdHeartRate] = useState('');

  // Threshold speed & power
  const [thresholdPaceMin, setThresholdPaceMin] = useState('');
  const [thresholdPaceSec, setThresholdPaceSec] = useState('');
  const [thresholdPowerWatts, setThresholdPowerWatts] = useState('');

  // Race results list
  const [recentRaceResults, setRecentRaceResults] = useState<RaceResult[]>([]);

  // Add new race result form state
  const [newRaceDistMeters, setNewRaceDistMeters] = useState('');
  const [newRaceTimeHours, setNewRaceTimeHours] = useState('');
  const [newRaceTimeMinutes, setNewRaceTimeMinutes] = useState('');
  const [newRaceTimeSeconds, setNewRaceTimeSeconds] = useState('');
  const [newRaceDate, setNewRaceDate] = useState('');
  const [newRaceNotes, setNewRaceNotes] = useState('');

  // Status and Validation states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync profile data to form once loaded
  useEffect(() => {
    if (athleteProfile) {
      setDisplayName(athleteProfile.displayName || '');
      setBirthDate(athleteProfile.birthDate || '');
      setSex(athleteProfile.sex || '');
      setPreferredUnits(athleteProfile.preferredUnits || 'metric');

      setHeightCm(athleteProfile.heightCm ? athleteProfile.heightCm.toString() : '');
      setWeightKg(athleteProfile.weightKg ? athleteProfile.weightKg.toString() : '');

      setRestingHeartRate(athleteProfile.restingHeartRate ? athleteProfile.restingHeartRate.toString() : '');
      setMaxHeartRate(athleteProfile.maxHeartRate ? athleteProfile.maxHeartRate.toString() : '');
      setLactateThresholdHeartRate(athleteProfile.lactateThresholdHeartRate ? athleteProfile.lactateThresholdHeartRate.toString() : '');

      // Parse threshold pace (stored in total seconds per km)
      if (athleteProfile.thresholdPaceSecPerKm) {
        const pace = athleteProfile.thresholdPaceSecPerKm;
        setThresholdPaceMin(Math.floor(pace / 60).toString());
        setThresholdPaceSec((pace % 60).toString().padStart(2, '0'));
      } else {
        setThresholdPaceMin('');
        setThresholdPaceSec('');
      }

      setThresholdPowerWatts(athleteProfile.thresholdPowerWatts ? athleteProfile.thresholdPowerWatts.toString() : '');
      setRecentRaceResults(athleteProfile.recentRaceResults || []);
    }
  }, [athleteProfile]);

  // Clean form of new race block
  const resetRaceForm = () => {
    setNewRaceDistMeters('');
    setNewRaceTimeHours('');
    setNewRaceTimeMinutes('');
    setNewRaceTimeSeconds('');
    setNewRaceDate('');
    setNewRaceNotes('');
  };

  // Add race result local validation
  const handleAddRaceResult = () => {
    setValidationError(null);
    const dist = parseFloat(newRaceDistMeters);
    const mins = parseInt(newRaceTimeMinutes) || 0;
    const secs = parseInt(newRaceTimeSeconds) || 0;
    const hours = parseInt(newRaceTimeHours) || 0;
    
    if (isNaN(dist) || dist <= 0) {
      setValidationError("Please enter a valid positive distance for the race result.");
      return;
    }

    const totalSeconds = hours * 3600 + mins * 60 + secs;
    if (totalSeconds <= 0) {
      setValidationError("Please specify a valid finish time.");
      return;
    }

    if (!newRaceDate) {
      setValidationError("Please enter a valid competition date.");
      return;
    }

    const newResult: RaceResult = {
      id: `rc_${Date.now()}`,
      distanceMeters: dist,
      timeSeconds: totalSeconds,
      date: newRaceDate,
      source: 'manual',
      notes: newRaceNotes.trim() || undefined
    };

    setRecentRaceResults(prev => [...prev, newResult]);
    resetRaceForm();
  };

  // Delete race result handler
  const handleDeleteRaceResult = (id: string) => {
    setRecentRaceResults(prev => prev.filter(r => r.id !== id));
  };

  // Strict profile verification & saving
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveSuccess(false);

    // Form inputs parsing and numerical boundaries checks
    const wt = weightKg ? parseFloat(weightKg) : null;
    const ht = heightCm ? parseFloat(heightCm) : null;
    const rhr = restingHeartRate ? parseInt(restingHeartRate) : null;
    const mhr = maxHeartRate ? parseInt(maxHeartRate) : null;
    const lth = lactateThresholdHeartRate ? parseInt(lactateThresholdHeartRate) : null;
    const pMin = thresholdPaceMin ? parseInt(thresholdPaceMin) : null;
    const pSec = thresholdPaceSec ? parseInt(thresholdPaceSec) : 0;
    const tPower = thresholdPowerWatts ? parseInt(thresholdPowerWatts) : null;

    // Numerical checks
    if (wt !== null && (wt <= 0 || wt > 300)) {
      setValidationError("Weight must be between 1 and 300 kg.");
      return;
    }
    if (ht !== null && (ht <= 0 || ht > 280)) {
      setValidationError("Height must be between 1 and 280 cm.");
      return;
    }
    if (rhr !== null && (rhr < 25 || rhr > 150)) {
      setValidationError("Resting Heart Rate must sit in a realistic range (25 - 150 bpm).");
      return;
    }
    if (mhr !== null && (mhr < 80 || mhr > 250)) {
      setValidationError("Max Heart Rate must sit in a realistic range (80 - 250 bpm).");
      return;
    }
    if (lth !== null && (lth < 50 || lth > 230)) {
      setValidationError("Lactate Threshold HR must sit in a realistic range (50 - 230 bpm).");
      return;
    }
    if (rhr !== null && mhr !== null && rhr >= mhr) {
      setValidationError("Resting HR must be strictly less than Max HR.");
      return;
    }
    if (lth !== null && mhr !== null && lth >= mhr) {
      setValidationError("Lactate Threshold HR must be less than Max HR.");
      return;
    }
    if (lth !== null && rhr !== null && lth <= rhr) {
      setValidationError("Lactate Threshold HR must be greater than Resting HR.");
      return;
    }
    if (tPower !== null && (tPower <= 0 || tPower > 1200)) {
      setValidationError("Threshold Power must be between 1 and 1200 Watts.");
      return;
    }

    let composedThresholdPace: number | null = null;
    if (pMin !== null) {
      composedThresholdPace = pMin * 60 + pSec;
      if (composedThresholdPace <= 0) {
        setValidationError("Please specify a valid threshold speed pacing.");
        return;
      }
    }

    setSaving(true);
    try {
      await updateAthleteProfile({
        displayName: displayName.trim() || user?.displayName || user?.email?.split('@')[0] || 'Athlete',
        birthDate: birthDate || null,
        sex: sex || null,
        heightCm: ht,
        weightKg: wt,
        restingHeartRate: rhr,
        maxHeartRate: mhr,
        lactateThresholdHeartRate: lth,
        thresholdPaceSecPerKm: composedThresholdPace,
        thresholdPowerWatts: tPower,
        recentRaceResults: recentRaceResults,
        preferredUnits: preferredUnits,
        // Also replicate legacy values if some pages rely on them
        restingHR: rhr,
        maxHR: mhr,
        thresholdHR: lth,
        units: preferredUnits,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("[Profile Save Error]:", err);
      setValidationError("An unexpected error occurred while saving baseline fields to database.");
    } finally {
      setSaving(false);
    }
  };

  // Metric to imperial calculators format
  const formatRacePace = (m: number, s: number) => {
    const minStr = Math.floor(s / 60);
    const secStr = Math.round(s % 60).toString().padStart(2, '0');
    return `${minStr}:${secStr} /km`;
  };

  const parseRaceDistance = (meters: number) => {
    if (meters === 5000) return '5K';
    if (meters === 10000) return '10K';
    if (meters === 21097.5 || meters === 21100) return 'Half Marathon';
    if (meters === 42195) return 'Marathon';
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  // Readiness Checklist status indicators
  const readinessChecks = [
    { name: "Resting Heart Rate", ok: !!restingHeartRate, value: restingHeartRate ? `${restingHeartRate} bpm` : "Missing" },
    { name: "Max Heart Rate", ok: !!maxHeartRate, value: maxHeartRate ? `${maxHeartRate} bpm` : "Missing" },
    { name: "Lactate Threshold HR", ok: !!lactateThresholdHeartRate, value: lactateThresholdHeartRate ? `${lactateThresholdHeartRate} bpm` : "Missing" },
    { name: "Threshold Pace", ok: !!thresholdPaceMin, value: thresholdPaceMin ? `${thresholdPaceMin}:${(thresholdPaceSec || '00').padStart(2, '0')} /km` : "Missing" },
    { name: "Recent Race Results", ok: recentRaceResults.length > 0, value: recentRaceResults.length > 0 ? `${recentRaceResults.length} Race(s)` : "Missing" },
    { name: "Weight Calibration", ok: !!weightKg, value: weightKg ? `${weightKg} kg` : "Missing" },
  ];

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
              <User className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Athlete Profile</h1>
            </div>
            <p className="text-xs text-zinc-400 font-sans tracking-wide mt-1.5">
              Manage baseline values used for zones, calculators, and training planning, and analysis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* MAIN FORM PANEL */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
              
              {/* SECTION 1: PRIMARY BIOMETRICS */}
              <div>
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">PHYSICAL ATTRIBUTES</span>
                <h3 className="text-md font-bold text-white uppercase mt-0.5">Primary Particulars</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 uppercase font-bold block">Display Identity Name</label>
                    <input
                      type="text"
                      placeholder={user?.displayName || "Elite Athlete"}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 uppercase font-bold block">Units System Preference</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreferredUnits('metric')}
                        className={`p-2 border text-xs font-bold uppercase tracking-wide text-center rounded select-none cursor-pointer transition-all ${
                          preferredUnits === 'metric' 
                            ? 'bg-[#FC5200]/10 border-[#FC5200] text-white font-mono' 
                            : 'bg-zinc-900 border-white/10 text-zinc-500'
                        }`}
                      >
                        Metric (KM/KG)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreferredUnits('imperial')}
                        className={`p-2 border text-xs font-bold uppercase tracking-wide text-center rounded select-none cursor-pointer transition-all ${
                          preferredUnits === 'imperial' 
                            ? 'bg-[#FC5200]/10 border-[#FC5200] text-white font-mono' 
                            : 'bg-zinc-900 border-white/10 text-zinc-500'
                        }`}
                      >
                        Imperial (MI/LB)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 uppercase font-bold block">Sex</label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                      >
                        <option value="">Not set</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 uppercase font-bold block">Birth Date</label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2 text-zinc-200 rounded font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 uppercase font-bold block">Height (cm)</label>
                      <input
                        type="number"
                        placeholder="Not set"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 uppercase font-bold block">Weight ({preferredUnits === 'metric' ? 'kg' : 'lbs'})</label>
                      <input
                        type="number"
                        placeholder="Not set"
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 2: HEART RATE PARAMETERS */}
              <div className="border-t border-white/10 pt-6">
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">PHYSIOLOGICAL THRESHOLDS</span>
                <h3 className="text-md font-bold text-white uppercase mt-0.5">Heart Rate Limits</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 uppercase font-bold block">Resting HR (bpm)</label>
                    <input
                      type="number"
                      placeholder="Not set"
                      value={restingHeartRate}
                      onChange={(e) => setRestingHeartRate(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 uppercase font-bold block">Max Heart Rate (bpm)</label>
                    <input
                      type="number"
                      placeholder="Not set"
                      value={maxHeartRate}
                      onChange={(e) => setMaxHeartRate(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 uppercase font-bold block">Lactate Threshold HR (bpm)</label>
                    <input
                      type="number"
                      placeholder="Not set"
                      value={lactateThresholdHeartRate}
                      onChange={(e) => setLactateThresholdHeartRate(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: RUNNING CAPACITY BASES */}
              <div className="border-t border-white/10 pt-6">
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">PACINGS & MECHANICAL BASES</span>
                <h3 className="text-md font-bold text-white uppercase mt-0.5">Pace & Power Limits</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 uppercase font-bold block block mb-1">
                      Threshold Pacing (MM/SS per km)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="number"
                          placeholder="Min"
                          value={thresholdPaceMin}
                          onChange={(e) => setThresholdPaceMin(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded text-center font-mono"
                        />
                        <span className="text-xs text-zinc-500 font-mono">m</span>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="number"
                          placeholder="Sec"
                          min="0"
                          max="59"
                          value={thresholdPaceSec}
                          onChange={(e) => setThresholdPaceSec(e.target.value)}
                          className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded text-center font-mono"
                        />
                        <span className="text-xs text-zinc-500 font-mono">s</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-400 uppercase font-bold block block mb-1">
                      Threshold Power (Watts)
                    </label>
                    <input
                      type="number"
                      placeholder="Not set"
                      value={thresholdPowerWatts}
                      onChange={(e) => setThresholdPowerWatts(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* RECENT HISTORIC COMPETITIONS */}
              <div className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">RACING RECORDS</span>
                    <h3 className="text-md font-bold text-white uppercase mt-0.5">Recent Race Performances</h3>
                  </div>
                </div>

                {/* ADD NEW RACE ENTRY SUB-FORM */}
                <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-lg space-y-4 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold uppercase tracking-wider">
                    <Plus className="w-4 h-4 text-[#FC5200]" /> ADD HISTORIC RESULT
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Race Distance (meters)</label>
                      <select
                        value={newRaceDistMeters}
                        onChange={(e) => setNewRaceDistMeters(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 text-zinc-300 text-xs p-2 rounded focus:border-[#FC5200] outline-none"
                      >
                        <option value="">Choose Dist</option>
                        <option value="1500">1500m</option>
                        <option value="3000">3000m</option>
                        <option value="5000">5K (5,000m)</option>
                        <option value="10000">10K (10,000m)</option>
                        <option value="21097.5">Half Marathon</option>
                        <option value="42195">Marathon</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Finish Duration (hrs / min / sec)</label>
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="number"
                          placeholder="hh"
                          value={newRaceTimeHours}
                          onChange={(e) => setNewRaceTimeHours(e.target.value)}
                          className="bg-zinc-900 border border-white/10 text-zinc-200 text-xs p-2 rounded text-center font-mono outline-none focus:border-[#FC5200]"
                        />
                        <input
                          type="number"
                          placeholder="mm"
                          value={newRaceTimeMinutes}
                          onChange={(e) => setNewRaceTimeMinutes(e.target.value)}
                          className="bg-zinc-900 border border-white/10 text-zinc-200 text-xs p-2 rounded text-center font-mono outline-none focus:border-[#FC5200]"
                        />
                        <input
                          type="number"
                          placeholder="ss"
                          value={newRaceTimeSeconds}
                          onChange={(e) => setNewRaceTimeSeconds(e.target.value)}
                          className="bg-zinc-900 border border-white/10 text-zinc-200 text-xs p-2 rounded text-center font-mono outline-none focus:border-[#FC5200]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Race Date</label>
                      <input
                        type="date"
                        value={newRaceDate}
                        onChange={(e) => setNewRaceDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 text-zinc-200 text-xs p-2 rounded font-mono outline-none focus:border-[#FC5200]"
                      />
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <button
                        type="button"
                        onClick={handleAddRaceResult}
                        className="w-full max-h-[36px] bg-zinc-800 hover:bg-[#FC5200]/20 border border-white/10 hover:border-[#FC5200]/40 text-zinc-350 hover:text-white font-bold p-2 text-xs rounded select-none uppercase tracking-wide cursor-pointer transition-all inline-flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> STAGE RESULT
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Competition Notes (Location, Weather, Conditions)</label>
                    <input
                      type="text"
                      placeholder="e.g. London Marathon, flat road, cool, slight wind"
                      value={newRaceNotes}
                      onChange={(e) => setNewRaceNotes(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 text-zinc-200 text-xs p-2 rounded outline-none focus:border-[#FC5200]"
                    />
                  </div>
                </div>

                {/* CURRENT STAGED RACES LIST */}
                {recentRaceResults.length > 0 ? (
                  <div className="border border-white/10 rounded overflow-hidden">
                    <table className="w-full text-xs text-left text-zinc-350 bg-zinc-950/20">
                      <thead className="bg-[#18181a] text-zinc-400 font-bold uppercase text-[10px] tracking-wider border-b border-white/15">
                        <tr>
                          <th className="p-3">Event ID</th>
                          <th className="p-3">Distance</th>
                          <th className="p-3">Time</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Source</th>
                          <th className="p-3 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {recentRaceResults.map((result) => (
                          <tr key={result.id} className="hover:bg-white/5">
                            <td className="p-3 text-[10px] text-zinc-500">{result.id}</td>
                            <td className="p-3 text-white font-bold">{parseRaceDistance(result.distanceMeters)}</td>
                            <td className="p-3 text-[#FC5200] font-bold">{formatDuration(result.timeSeconds)}</td>
                            <td className="p-3">{result.date}</td>
                            <td className="p-3">
                              <span className="p-0.5 px-1.5 text-[9px] uppercase font-bold bg-zinc-800 text-zinc-400 rounded">
                                {result.source}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteRaceResult(result.id)}
                                className="p-1 hover:bg-red-950/50 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer border border-transparent hover:border-red-900/30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 font-sans italic p-4 border border-dashed border-white/10 text-center rounded">
                    No historic racing records currently staged. Add a race above to establish calculations parameters.
                  </p>
                )}
              </div>

              {/* SAVE MESSAGES & ACTIONS */}
              {validationError && (
                <div className="bg-red-950/30 border border-red-900 text-red-400 p-3 text-xs rounded uppercase font-bold flex items-center gap-2 select-none">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="bg-emerald-950/20 border border-emerald-900 p-3 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 animate-fade-in select-none">
                  <Check className="w-4 h-4" /> ATHLETE BASELINE PROPERTIES COMMITTED SUCCESSFULLY
                </div>
              )}

              <div className="border-t border-white/10 pt-4 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800/50 scroll-py-12 transition-all font-mono text-black font-bold h-12 uppercase tracking-widest text-xs rounded cursor-pointer select-none inline-flex items-center justify-center gap-2"
                >
                  {saving ? 'COMMITTING ATHLETE BASELINES...' : 'SAVE PROFILE'}
                </button>
              </div>

            </form>
          </div>

          {/* READINESS VISUAL SIDEBAR */}
          <div className="space-y-6">
            
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
              <div>
                <span className="text-xs text-[#FC5200] font-mono font-bold uppercase">QUALIFICATIONS</span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">Profile Readiness</h3>
                <p className="text-xs text-zinc-400 font-sans mt-1">
                  Required baseline variables needed to securely calculate threshold run zone matrices:
                </p>
              </div>

              <div className="space-y-3">
                {readinessChecks.map((check) => (
                  <div key={check.name} className="flex justify-between items-center bg-zinc-950/30 border border-white/5 p-3 rounded">
                    <div>
                      <span className="text-xs text-zinc-300 font-bold uppercase block leading-tight">{check.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-1">{check.value}</span>
                    </div>

                    <div>
                      {check.ok ? (
                        <span className="p-1 px-2.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 font-bold text-[9px] uppercase rounded">
                          SET
                        </span>
                      ) : (
                        <span className="p-1 px-2 bg-red-950/40 border border-red-900/40 text-red-500 font-bold text-[9px] uppercase rounded">
                          MISSING
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-950/20 border border-white/10 p-4 rounded text-xs space-y-2 text-zinc-400 font-sans">
                <div className="flex gap-2 text-[#FC5200]">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-bold uppercase text-[10px]">Deterministic Principle</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Track.Studio executes strictly deterministic sports science models. If resting, max, or threshold values remain unset, the application triggers secure fallback warnings instead of hallucinating values or projecting artificial indicators.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
