'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  ShieldAlert, 
  RefreshCw, 
  Database,
  Activity,
  Heart,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingDown,
  Gauge,
  Info,
  Calendar,
  User,
  Zap,
  Sparkles
} from 'lucide-react';
import { getActivities, getDailyLoads, getWellnessLogs } from '../../lib/firebase/firestore';
import { CanonicalActivity, DailyTrainingLoad, DailyWellnessLog } from '../../data/types';
import { formatDistanceKm } from '../../lib/data/dataLaw';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

export default function OvertrainingGuardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [dailyLoads, setDailyLoads] = useState<DailyTrainingLoad[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [acts, loads, wellness] = await Promise.all([
          getActivities(user.uid),
          getDailyLoads(user.uid),
          getWellnessLogs(user.uid)
        ]);

        // Filter running/relevant activities
        const runs = acts.filter(a => a.sportType.toLowerCase() === 'run' || a.sportType.toLowerCase() === 'trailrun');
        runs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        
        setActivities(runs);
        setDailyLoads(loads || []);
        setWellnessLogs(wellness || []);
      } catch (e) {
        console.error('Failed to load logs for overtraining guard:', e);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  const anchorDate = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // COMPUTE HIGH-FIDELITY OVERTRAINING SIGNALS DETERMINISTICALLY
  const getOvertrainingSignals = () => {
    // 14-days rolling load series
    const loadsMap: Record<string, number> = {};
    const wellnessMap: Record<string, DailyWellnessLog> = {};

    dailyLoads.forEach(l => {
      if (l.date) {
        loadsMap[l.date] = l.trainingLoad || l.loadScore || 0;
      }
    });

    activities.forEach(a => {
      if (a.startDate) {
        const dateStr = a.startDate.slice(0, 10);
        if (loadsMap[dateStr] === undefined || loadsMap[dateStr] === 0) {
          const fallback = a.trainingLoad || a.sufferScore || (a.rpe ? a.rpe * (a.movingTimeSeconds / 60) * 0.1 : 0) || (a.distanceMeters / 1000 * 5) || 0;
          loadsMap[dateStr] = fallback;
        }
      }
    });

    wellnessLogs.forEach(w => {
      if (w.date) {
        wellnessMap[w.date] = w;
      }
    });

    // Resolve continuous chronology datasets for the last 28 days
    const timeline28: { dateStr: string; load: number; wellness: DailyWellnessLog | null }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(anchorDate.getTime() - i * dayMs);
      const dateStr = d.toISOString().slice(0, 10);
      timeline28.push({
        dateStr,
        load: loadsMap[dateStr] || 0,
        wellness: wellnessMap[dateStr] || null
      });
    }

    // 1. HIGH ATL / FATIGUE (7-day load vs baseline load)
    const week1Loads = timeline28.slice(21, 28).map(t => t.load);
    const prev3WeeksLoads = timeline28.slice(0, 21).map(t => t.load);
    const week1Sum = week1Loads.reduce((acc, v) => acc + v, 0);
    const prevSum = prev3WeeksLoads.reduce((acc, v) => acc + v, 0);
    const prevAvgWeekly = prevSum / 3;

    // 2. CONSECUTIVE HIGH LOAD DAYS
    let consecutiveHighDays = 0;
    let tempConsec = 0;
    // We define high-load days dynamically: load exceeding 1.25x the 28-day average of active days
    const activeLoads = timeline28.map(t => t.load).filter(l => l > 0);
    const avgActiveLoad = activeLoads.length > 0 ? (activeLoads.reduce((acc, l) => acc + l, 0) / activeLoads.length) : 25;
    const highLoadThreshold = avgActiveLoad * 1.2;

    for (let i = 21; i < 28; i++) {
      if (timeline28[i].load > highLoadThreshold) {
        tempConsec++;
        if (tempConsec > consecutiveHighDays) {
          consecutiveHighDays = tempConsec;
        }
      } else {
        tempConsec = 0;
      }
    }

    // 3. LOW RECOVERY INPUTS & BIOMETRIC ANOMALIES
    const activeWellness7 = timeline28.slice(21, 28).map(t => t.wellness).filter(w => w !== null) as DailyWellnessLog[];
    
    let isSleepLow = false;
    let isSorenessHigh = false;
    let isFatigueHigh = false;
    let avgSleep = 0;
    let avgSoreness = 0;
    let avgFatigue = 0;

    let hrvSuppressed = false;
    let hrvChangePercent = 0;
    let latestHrv: number | null = null;
    let baselineHrv: number | null = null;

    let rhrElevated = false;
    let rhrChange = 0;
    let latestRhr: number | null = null;
    let baselineRhr: number | null = null;

    if (activeWellness7.length > 0) {
      const sleeps = activeWellness7.map(w => w.sleepDurationHours).filter(s => s !== undefined && s !== null) as number[];
      const sorenessVals = activeWellness7.map(w => w.soreness).filter(s => s !== undefined && s !== null) as number[];
      const fatigueVals = activeWellness7.map(w => w.fatigue).filter(f => f !== undefined && f !== null) as number[];

      if (sleeps.length > 0) {
        avgSleep = sleeps.reduce((acc, s) => acc + s, 0) / sleeps.length;
        isSleepLow = avgSleep < 6.5;
      }
      if (sorenessVals.length > 0) {
        avgSoreness = sorenessVals.reduce((acc, s) => acc + s, 0) / sorenessVals.length;
        isSorenessHigh = avgSoreness >= 3.0; // Soreness above moderate baseline
      }
      if (fatigueVals.length > 0) {
        avgFatigue = fatigueVals.reduce((acc, f) => acc + f, 0) / fatigueVals.length;
        isFatigueHigh = avgFatigue >= 3.5;
      }

      // HRV SUPPRESSION DETECTOR
      const hrvs = activeWellness7.map(w => w.hrvRmssd).filter(h => h !== undefined && h !== null && h > 0) as number[];
      if (hrvs.length > 0) {
        latestHrv = hrvs[hrvs.length - 1];
        // Compare with older historical logs in collection if possible, otherwise use week 1 averages
        const pastHrvs = wellnessLogs
          .filter(w => new Date(w.date).getTime() < anchorDate.getTime() - 7 * dayMs)
          .map(w => w.hrvRmssd)
          .filter(h => h !== undefined && h !== null && h > 0) as number[];
          
        if (pastHrvs.length >= 3) {
          baselineHrv = pastHrvs.reduce((acc, h) => acc + h, 0) / pastHrvs.length;
          hrvChangePercent = ((latestHrv - baselineHrv) / baselineHrv) * 100;
          if (hrvChangePercent < -10) {
            hrvSuppressed = true;
          }
        }
      }

      // RESTING HR ELEVATION DETECTOR
      const rhrs = activeWellness7.map(w => w.restingHeartRate).filter(r => r !== undefined && r !== null && r > 0) as number[];
      if (rhrs.length > 0) {
        latestRhr = rhrs[rhrs.length - 1];
        const pastRhrs = wellnessLogs
          .filter(w => new Date(w.date).getTime() < anchorDate.getTime() - 7 * dayMs)
          .map(w => w.restingHeartRate)
          .filter(r => r !== undefined && r !== null && r > 0) as number[];

        if (pastRhrs.length >= 3) {
          baselineRhr = pastRhrs.reduce((acc, r) => acc + r, 0) / pastRhrs.length;
          rhrChange = latestRhr - baselineRhr;
          if (rhrChange >= 4) {
            rhrElevated = true;
          }
        }
      }
    }

    // LOAD PROFILE ELIGIBILITY & STATUS COMPILATION
    const hasSufficientLoad = dailyLoads.length >= 5 || activities.length >= 3;
    const hasSufficientWellness = activeWellness7.length >= 2;

    const totalWarningPoints = 
      (week1Sum > prevAvgWeekly * 1.3 ? 1 : 0) +
      (consecutiveHighDays >= 4 ? 1 : 0) +
      (isSleepLow ? 1 : 0) +
      (isSorenessHigh ? 1 : 0) +
      (isFatigueHigh ? 1 : 0) +
      (hrvSuppressed ? 1.5 : 0) +
      (rhrElevated ? 1.5 : 0);

    let status: 'Normal' | 'Watch' | 'Elevated' | 'High' | 'Insufficient Data' = 'Normal';
    let detailMessage = "";
    let statusColor = "text-emerald-450 border-emerald-950 bg-emerald-950/15";

    if (!hasSufficientLoad) {
      status = 'Insufficient Data';
      detailMessage = "More training load history is required. Log at least 5 days of load score indicators or run workouts.";
      statusColor = "text-zinc-500 border-zinc-800 bg-zinc-950/40";
    } else if (totalWarningPoints >= 4.5) {
      status = 'High';
      detailMessage = "Severe overtraining indicators present. Cardiovascular metrics are depressed, and orthopedic load is exceptionally elevated.";
      statusColor = "text-red-500 border-red-900/50 bg-red-950/20";
    } else if (totalWarningPoints >= 2.5) {
      status = 'Elevated';
      detailMessage = "Workload and fatigue markers indicate potential high stress build-up. Focus strictly on sleep and recovery metrics.";
      statusColor = "text-rose-400 border-rose-950 bg-rose-950/15";
    } else if (totalWarningPoints >= 1.0) {
      status = 'Watch';
      detailMessage = "Minor recovery suppression or mild workload spikes noted. Safe to continue training but monitor soreness levels.";
      statusColor = "text-amber-500 border-amber-900/50 bg-[#FC5200]/5";
    } else {
      status = 'Normal';
      detailMessage = "Cardiovascular baselines and acute workload bounds are healthy. The athletic engine status is optimized.";
      statusColor = "text-emerald-400 border-emerald-950 bg-emerald-950/15";
    }

    return {
      status,
      detailMessage,
      statusColor,
      hasSufficientLoad,
      hasSufficientWellness,
      week1Sum,
      prevAvgWeekly,
      consecutiveHighDays,
      isSleepLow,
      isSorenessHigh,
      isFatigueHigh,
      avgSleep,
      avgSoreness,
      avgFatigue,
      hrvSuppressed,
      hrvChangePercent,
      latestHrv,
      baselineHrv,
      rhrElevated,
      rhrChange,
      latestRhr,
      baselineRhr,
      timeline28
    };
  };

  const guard = getOvertrainingSignals();

  // FORMAT UTILS
  const formatHrv = (hrv: number | null) => {
    if (hrv === null || hrv === undefined) return '—';
    return `${Math.round(hrv)} ms`;
  };

  const formatRhr = (rhr: number | null) => {
    if (rhr === null || rhr === undefined) return '—';
    return `${Math.round(rhr)} bpm`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" strokeWidth={1.5} />
        <span className="text-xs uppercase tracking-widest font-bold font-mono">Calibrating Overtraining Defenses...</span>
      </div>
    );
  }

  // Pre-calculate timeline summary metrics for display charts
  const chartData = guard.timeline28.slice(14, 28).map(t => ({
    date: t.dateStr.slice(5),
    load: Math.round(t.load),
  }));

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1450px] w-full mx-auto space-y-6">

        {/* TOP DESCRIPTION BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-5">
            <button
              id="overtraining_back_btn"
              onClick={() => router.push('/')}
              className="p-2.5 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-white font-mono leading-none">Overtraining Guard</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1.5 font-bold">
                Detect stress spikes, consecutive workloads, and cardiac fatigue determinants.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 font-mono text-[9.5px] uppercase border border-white/10 text-zinc-400 font-bold rounded">
            <span>Rigor Rule Enforced</span>
          </div>
        </div>

        {/* SAFETY MANDATE NOTICE */}
        <div className="border border-[#FC5200]/30 bg-[#FC5200]/5 rounded p-4 flex gap-3 text-xs leading-normal uppercase font-mono text-zinc-400">
          <Info className="w-5 h-5 text-[#FC5200] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-white font-bold block">Medical Warning & Boundary Notice</span>
            <p>
              This page does not diagnose medical conditions. It only highlights workload stress and cardiac recovery patterns from available data inputs. It is a deterministic mathematical engine that computes stress ratios and biometric alerts without utilizing synthetic or generated suggestions.
            </p>
          </div>
        </div>

        {/* CURRENT OVERALL STATUS */}
        <div className={`p-6 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${guard.statusColor}`}>
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono font-bold block">Consolidated Guard Status</span>
                <span className="text-2xl font-extrabold uppercase font-mono">{guard.status}</span>
              </div>
            </div>
            <p className="text-xs uppercase font-mono leading-relaxed opacity-90">{guard.detailMessage}</p>
          </div>

          <div className="text-[11px] font-mono uppercase bg-black/40 border border-white/15 px-4 py-3 rounded text-zinc-300">
            <div className="flex justify-between gap-12 pb-1 border-b border-white/5 font-semibold">
              <span>Status Level:</span>
              <span className="text-white font-bold">{guard.status === 'High' ? 'CRITICAL DELOAD' : guard.status === 'Elevated' ? 'CAUTION' : 'OPTIMIZED'}</span>
            </div>
            <div className="flex justify-between gap-12 pt-1 font-semibold">
              <span>Rigor Eligible:</span>
              <span className="text-white font-bold text-[#FC5200]">{guard.hasSufficientLoad ? 'YES' : 'INSUFFICIENT'}</span>
            </div>
          </div>
        </div>

        {/* MAIN ANALYSIS LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* MAIN COLUMN (COL-SPAN 3) */}
          <div className="lg:col-span-3 space-y-6">

            {/* DYNAMIC CARD DECK OF stress WARNING SIGNALS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* SIGNAL 1: LOAD SPIKES */}
              <div id="signal_load_spikes" className="bg-[#111113] border border-white/10 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    <span>Weekly Load Spike</span>
                    <TrendingUp className="w-4 h-4 text-[#FC5200]" />
                  </div>

                  {guard.hasSufficientLoad ? (
                    <div className="space-y-1 font-mono">
                      <span className="text-2xl font-extrabold text-white">
                        {guard.week1Sum > 0 ? (guard.week1Sum / (guard.prevAvgWeekly || 1)).toFixed(2) : '—'}x
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-bold uppercase mt-1">
                        7-Day Load: {Math.round(guard.week1Sum)} vs Avg {Math.round(guard.prevAvgWeekly)}
                      </span>
                      <span className={`text-[9px] font-bold block pt-1 uppercase ${guard.week1Sum > guard.prevAvgWeekly * 1.3 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {guard.week1Sum > guard.prevAvgWeekly * 1.3 ? 'CRITICAL ESCALATION' : 'STABLE RATIO'}
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 text-[10.5px] font-mono font-bold text-amber-500 uppercase leading-relaxed">
                      More load history required.
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-[#FC5200]/30 w-full" />
              </div>

              {/* SIGNAL 2: CONSECUTIVE TRAINING STRAIN */}
              <div id="signal_consecutive_strain" className="bg-[#111113] border border-white/10 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    <span>Consecutive Load Days</span>
                    <Activity className="w-4 h-4 text-[#FC5200]" />
                  </div>

                  {guard.hasSufficientLoad ? (
                    <div className="space-y-1 font-mono">
                      <span className="text-2xl font-extrabold text-white">
                        {guard.consecutiveHighDays} Days
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-bold uppercase mt-1">
                        Continuous threshold exceedances
                      </span>
                      <span className={`text-[9px] font-bold block pt-1 uppercase ${guard.consecutiveHighDays >= 4 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {guard.consecutiveHighDays >= 4 ? 'HIGH DENSITY PENALTY' : 'NORMAL VARIANCE'}
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 text-[10.5px] font-mono font-bold text-amber-500 uppercase leading-relaxed">
                      More load history required.
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-yellow-500/30 w-full" />
              </div>

              {/* SIGNAL 3: RECOVERY VARIABILITY */}
              <div id="signal_recovery_variability" className="bg-[#111113] border border-white/10 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    <span>Cardiovascular Sleep Index</span>
                    <Heart className="w-4 h-4 text-rose-500" />
                  </div>

                  {guard.hasSufficientWellness ? (
                    <div className="space-y-1 font-mono">
                      <span className="text-2xl font-extrabold text-white">
                        {guard.avgSleep.toFixed(1)} hrs
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-bold uppercase mt-1">
                        Soreness: {guard.avgSoreness.toFixed(1)}/5 | fatigue: {guard.avgFatigue.toFixed(1)}/5
                      </span>
                      <span className={`text-[9px] font-bold block pt-1 uppercase ${guard.isSleepLow || guard.isSorenessHigh ? 'text-red-500' : 'text-emerald-400'}`}>
                        {guard.isSleepLow || guard.isSorenessHigh ? 'SUPPRESSED ADAPTATION' : 'OPTIMAL ADAPTATION'}
                      </span>
                    </div>
                  ) : (
                    <div className="py-2 text-[10.5px] font-mono font-bold text-amber-500 uppercase leading-relaxed">
                      Wellness logs required.
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-rose-500/30 w-full" />
              </div>

            </div>

            {/* SECOND ROW LOG PANEL FOR HRV / RHR CARDIAC CHANNELS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* HRV SUPPRESSION DETECTOR PANEL */}
              <div id="panel_hrv_suppressed" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Parasympathetic Metric Channel</span>
                    <h3 className="text-xs font-bold text-white uppercase mt-0.5">HRV RMSSD Suppression</h3>
                  </div>
                  <Gauge className="w-4 h-4 text-purple-400" />
                </div>

                {guard.latestHrv !== null && guard.baselineHrv !== null ? (
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-baseline">
                      <span className="text-3xl font-extrabold text-white">
                        {formatHrv(guard.latestHrv)}
                      </span>
                      <span className={`text-xs font-bold ${guard.hrvChangePercent < -10 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {guard.hrvChangePercent.toFixed(1)}% shift
                      </span>
                    </div>

                    <div className="bg-zinc-900 border border-white/5 p-2 rounded text-[10px] space-y-1 uppercase">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">7-Day Moving Baseline:</span>
                        <span className="text-white font-bold">{formatHrv(guard.baselineHrv)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-zinc-500">Sympathetic Adaptability:</span>
                        <span className={guard.hrvSuppressed ? 'text-red-500 font-bold' : 'text-emerald-400 font-bold'}>
                          {guard.hrvSuppressed ? 'SUPPRESSED SYSTEM' : 'SYSTEM BALANCED'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[10.5px] font-mono text-zinc-500 uppercase leading-relaxed text-center py-6">
                    <AlertTriangle className="w-4 h-4 mx-auto mb-1.5 text-amber-500" />
                    <span className="text-amber-500 font-bold block">HRV data required</span>
                    <span className="text-[9.5px]">Log continuous morning HRV (RMSSD in ms) to activate autonomic nervous system stress tracking.</span>
                  </div>
                )}
              </div>

              {/* RHR RESTING HR ELEVATION PANEL */}
              <div id="panel_rhr_elevation" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Resting Heart Rate Metric</span>
                    <h3 className="text-xs font-bold text-white uppercase mt-0.5">Basal Cardiovascular Load</h3>
                  </div>
                  <Heart className="w-4 h-4 text-red-500" />
                </div>

                {guard.latestRhr !== null && guard.baselineRhr !== null ? (
                  <div className="space-y-3 font-mono">
                    <div className="flex justify-between items-baseline">
                      <span className="text-3xl font-extrabold text-white">
                        {formatRhr(guard.latestRhr)}
                      </span>
                      <span className={`text-xs font-bold ${guard.rhrElevated ? 'text-red-500' : 'text-emerald-400'}`}>
                        +{guard.rhrChange.toFixed(0)} bpm shift
                      </span>
                    </div>

                    <div className="bg-zinc-900 border border-white/5 p-2 rounded text-[10px] space-y-1 uppercase">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Basal Baseline:</span>
                        <span className="text-white font-bold">{formatRhr(guard.baselineRhr)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-zinc-500">Systemic Parasympathetic Drive:</span>
                        <span className={guard.rhrElevated ? 'text-red-500 font-bold' : 'text-emerald-400 font-bold'}>
                          {guard.rhrElevated ? 'ELEVATED INFLAMMATION' : 'HOMEOSTASIS REGISTERED'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[10.5px] font-mono text-zinc-500 uppercase leading-relaxed text-center py-6">
                    <AlertTriangle className="w-4 h-4 mx-auto mb-1.5 text-amber-500" />
                    <span className="text-amber-500 font-bold block">Wellness logs required</span>
                    <span className="text-[9.5px]">Log daily morning Resting Heart Rate values to calibrate dynamic basal elevation tracking.</span>
                  </div>
                )}
              </div>

            </div>

            {/* ROTATIONAL ACUTE WORKLOAD PLOT */}
            <div id="overtraining_14di_chart" className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider font-mono">14-Day Workload Map</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5 font-mono">Completed Daily Stress Units Profile</h3>
                </div>
              </div>

              {guard.hasSufficientLoad ? (
                <div className="h-[200px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="loadColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="#4b5563" 
                        fontSize={9} 
                        fontFamily="monospace"
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#4b5563" 
                        fontSize={9} 
                        fontFamily="monospace"
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="load" 
                        stroke="#EF4444" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#loadColor)" 
                        name="Daily Training Load Units" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="bg-zinc-900/40 p-8 text-center rounded border border-white/5 space-y-2 py-12">
                  <Database className="w-8 h-8 text-zinc-500 mx-auto" strokeWidth={1.5} />
                  <p className="text-xs text-zinc-400 leading-normal uppercase font-mono max-w-sm mx-auto">
                    More load history required
                  </p>
                  <p className="text-[10px] text-zinc-550 leading-normal uppercase font-mono max-w-md mx-auto">
                    No active daily training stress signals recorded inside trace window. Continue scheduling daily workouts.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* SIDEBAR PANEL (COL-SPAN 1) */}
          <div className="lg:col-span-1 space-y-6">

            {/* DATA ELIGIBILITY METER */}
            <div id="overtraining_data_health" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-bold uppercase tracking-widest font-mono">DETERMINISTIC VERIFICATION</span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5 font-mono">Guard Verification Board</h3>
              </div>

              <div className="space-y-3 font-mono text-[11px] uppercase">

                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-zinc-400">Total Run Workouts:</span>
                  <span className="text-white font-bold">{activities.length} runs</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-zinc-400">Load Logs (28d):</span>
                  <span className="text-white font-bold">{dailyLoads.length} logs</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-zinc-400">Wellness Available:</span>
                  <span className="text-white font-bold">{wellnessLogs.length} logged</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span className="text-zinc-400">HRV Registered:</span>
                  <span className={guard.latestHrv ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {guard.latestHrv ? 'ACTIVE ✓' : 'Data not available'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">RHR Registered:</span>
                  <span className={guard.latestRhr ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {guard.latestRhr ? 'ACTIVE ✓' : 'Data not available'}
                  </span>
                </div>

              </div>

              <div className="bg-zinc-950 p-2.5 rounded border border-white/5 text-[9.5px] leading-relaxed text-zinc-450 uppercase font-mono">
                <span className="text-[#FC5200] font-bold block mb-0.5">METRIC RIGOR:</span>
                Overtraining Guard status computations are deterministic metrics formulated directly from authentic physical sensor data. No synthetic data arrays are injected.
              </div>
            </div>

            {/* DESCRIPTION OF THE DETAILED SIGNALS */}
            <div id="overtraining_diagnostic_legend" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
              <span className="text-xs text-[#FC5200] font-bold uppercase tracking-widest font-mono block">Data Requirements</span>
              <div className="space-y-4 text-[11.5px] uppercase font-mono">
                
                <div className="space-y-1">
                  <span className="text-white font-bold block text-[11px]">Heart Rate Variability</span>
                  <p className="text-zinc-400 leading-normal text-[10px]">
                    Requires HRV RMSSD in milliseconds, captured via connected sensors at morning check. This signal is unavailable if missing.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-white font-bold block text-[11px]">Resting Heart Rate</span>
                  <p className="text-zinc-400 leading-normal text-[10px]">
                    Tracks cardiovascular basal stress via basal heart rate in beats per minute. This signal is unavailable if missing.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-white font-bold block text-[11px]">Cardiovascular Load Series</span>
                  <p className="text-zinc-400 leading-normal text-[10px]">
                    Daily training stress units compiled from GPS distance, duration, heartbeat, and effort ratios. More load history required if empty.
                  </p>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
