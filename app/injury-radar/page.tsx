'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { DataRequiredState } from '../../components/common/DataRequiredState';
import { SyncRequiredState } from '../../components/common/SyncRequiredState';
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
  Thermometer,
  Zap,
  Info
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

export default function InjuryRadarPage() {
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

        // Filter running activities
        const runs = acts.filter(a => a.sportType.toLowerCase() === 'run' || a.sportType.toLowerCase() === 'trailrun');
        runs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        
        setActivities(runs);
        setDailyLoads(loads || []);
        setWellnessLogs(wellness || []);
      } catch (e) {
        console.error('Failed to load logs for injury radar:', e);
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

  // DETERMINE THE REFERENCE / ANCHOR DATE
  const getAnchorDate = (): Date => {
    const today = new Date();
    if (activities.length === 0) return today;
    const latestActDate = new Date(activities[0].startDate);
    // If the latest activity in the dataset is in the future, use it as anchor
    return latestActDate > today ? latestActDate : today;
  };

  const anchorDate = getAnchorDate();
  const dayMs = 24 * 60 * 60 * 1000;

  // BUILD THE 35-DAY TIMELINE VECTOR FOR PRECISE CHRONIC HISTORIES
  const getTrainingHistory = () => {
    const dailyLoadsMap: Record<string, number> = {};
    const dailyDistancesMap: Record<string, number> = {};
    const dailyElevationMap: Record<string, number> = {};

    // 1. Map known Daily Training Load parameters from Intervals.icu
    dailyLoads.forEach(l => {
      if (l.date) {
        const loadVal = l.trainingLoad || l.loadScore || 0;
        dailyLoadsMap[l.date] = (dailyLoadsMap[l.date] || 0) + loadVal;
      }
    });

    // 2. Map standard activities, filling fallback estimates for missing intervals load records
    activities.forEach(a => {
      if (a.startDate) {
        const dateStr = a.startDate.slice(0, 10);
        dailyDistancesMap[dateStr] = (dailyDistancesMap[dateStr] || 0) + (a.distanceMeters || 0);
        dailyElevationMap[dateStr] = (dailyElevationMap[dateStr] || 0) + (a.elevationGainMeters || 0);

        if (dailyLoadsMap[dateStr] === undefined || dailyLoadsMap[dateStr] === 0) {
          // Fallback stress calculation formula based on RPE, speed, or distance
          const calculatedLoad = a.trainingLoad || a.sufferScore || (a.rpe ? a.rpe * (a.movingTimeSeconds / 60) * 0.1 : 0) || (a.distanceMeters / 1000 * 5) || 0;
          dailyLoadsMap[dateStr] = (dailyLoadsMap[dateStr] || 0) + calculatedLoad;
        }
      }
    });

    // Generate 35 continuous daily steps: Day 34 is today/anchor, Day 0 is 34 days ago
    const list: { dateStr: string; load: number; distance: number; elevation: number }[] = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date(anchorDate.getTime() - i * dayMs);
      const dateStr = d.toISOString().slice(0, 10);
      list.push({
        dateStr,
        load: dailyLoadsMap[dateStr] || 0,
        distance: dailyDistancesMap[dateStr] || 0,
        elevation: dailyElevationMap[dateStr] || 0
      });
    }
    return list;
  };

  const history = getTrainingHistory();
  const loadsVector = history.map(h => h.load);
  const distVector = history.map(h => h.distance);
  const elevVector = history.map(h => h.elevation);

  // METRIC CALCULATIONS

  // 1. ACWR (Acute Chronic Workload Ratio)
  // Acute: last 7 days (index 28 to 34)
  // Chronic: rolling 28 days (index 7 to 34)
  const getAcwrMetrics = () => {
    const acuteDays = loadsVector.slice(28, 35);
    const chronicDays = loadsVector.slice(7, 35);

    const acuteSum = acuteDays.reduce((acc, v) => acc + v, 0);
    const chronicSum = chronicDays.reduce((acc, v) => acc + v, 0);

    const acuteAvg = acuteSum / 7;
    const chronicAvg = chronicSum / 28;

    const ratio = chronicAvg > 0 ? (acuteAvg / chronicAvg) : 0;
    const hasSufficientData = activities.length >= 3 && chronicSum > 0;

    return {
      acuteAvg,
      chronicAvg,
      ratio,
      hasSufficientData,
      acuteSum,
      chronicSum
    };
  };

  const acwr = getAcwrMetrics();

  // 2. Weekly Volume Spike
  // Compare current week (index 28 to 34) vs past 4 weeks average
  const getVolumeSpikeMetrics = () => {
    const w1 = distVector.slice(28, 35).reduce((acc, v) => acc + v, 0); // Current
    const w2 = distVector.slice(21, 28).reduce((acc, v) => acc + v, 0);
    const w3 = distVector.slice(14, 21).reduce((acc, v) => acc + v, 0);
    const w4 = distVector.slice(7, 14).reduce((acc, v) => acc + v, 0);
    const w5 = distVector.slice(0, 7).reduce((acc, v) => acc + v, 0);

    const prev4Avg = (w2 + w3 + w4 + w5) / 4;
    const spikeRatio = prev4Avg > 0 ? (w1 / prev4Avg) : 1;
    const hasSufficientData = activities.length >= 3 && (w2 + w3 + w4 + w5) > 0;

    return {
      currentWeekDist: w1,
      prevWeeklyAvg: prev4Avg,
      spikeRatio,
      hasSufficientData
    };
  };

  const volSpike = getVolumeSpikeMetrics();

  // 3. Monotony and Strain
  // Monotony = mean daily load of Week 1 / std dev of daily load of Week 1
  const getMonotonyMetrics = () => {
    const last7Loads = loadsVector.slice(28, 35);
    const sum = last7Loads.reduce((acc, v) => acc + v, 0);
    const mean = sum / 7;

    const variance = last7Loads.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / 7;
    const stdDev = Math.sqrt(variance);

    const monotony = stdDev > 0 ? (mean / stdDev) : (mean > 0 ? 2.0 : 0);
    const strain = sum * monotony;
    const hasSufficientData = sum > 0;

    return {
      monotony,
      strain,
      weeklySum: sum,
      hasSufficientData
    };
  };

  const monotonyStrain = getMonotonyMetrics();

  // 4. Cadence Change
  const getCadenceMetrics = () => {
    const eligibleRuns = activities.filter(a => a.cadenceAvg && a.cadenceAvg > 40);
    if (eligibleRuns.length < 3) {
      return { hasSufficientData: false, latestSpm: 0, historicalSpm: 0, change: 0 };
    }
    const latestSpm = eligibleRuns[0].cadenceAvg || 0;
    const historicalSpm = eligibleRuns.slice(1, 6).reduce((acc, r) => acc + (r.cadenceAvg || 0), 0) / Math.min(5, eligibleRuns.length - 1);
    const change = latestSpm - historicalSpm;

    return {
      hasSufficientData: true,
      latestSpm,
      historicalSpm,
      change
    };
  };

  const cadenceDetails = getCadenceMetrics();

  // 5. Elevation Spike
  const getElevationMetrics = () => {
    const currentElev = elevVector.slice(28, 35).reduce((acc, v) => acc + v, 0);
    const historicalElev = elevVector.slice(0, 28).reduce((acc, v) => acc + v, 0) / 4;
    const elevatedRatio = historicalElev > 0 ? (currentElev / historicalElev) : 1;
    const hasElevation = activities.some(a => a.elevationGainMeters && a.elevationGainMeters > 0);

    return {
      hasElevation,
      currentElev,
      historicalElev,
      elevatedRatio
    };
  };

  const elevationDetails = getElevationMetrics();

  // 6. Recovery Wellness Flags
  const getRecoveryFlags = () => {
    const activeWellnessLogs = wellnessLogs.filter(w => {
      // Must be logged in the last 7 days of anchor
      const logTime = new Date(w.date).getTime();
      return Math.abs(anchorDate.getTime() - logTime) <= 7 * dayMs;
    });

    if (activeWellnessLogs.length === 0) {
      return { hasSufficientData: false, flags: [], latestLog: null };
    }

    const latest = activeWellnessLogs[0];
    const flags: { title: string; desc: string; type: 'poor' | 'extreme' }[] = [];

    if (latest.sleepQuality !== undefined && latest.sleepQuality !== null && latest.sleepQuality <= 2) {
      flags.push({ title: "Poor Sleep Quality", desc: `Latest sleep quality scored under minimal standard (${latest.sleepQuality}/5)`, type: 'poor' });
    }
    if (latest.sleepDurationHours !== undefined && latest.sleepDurationHours !== null && latest.sleepDurationHours < 6) {
      flags.push({ title: "Short Sleep Duration", desc: `Rested only ${latest.sleepDurationHours} hours, creating physical fatigue risks`, type: 'poor' });
    }
    if (latest.soreness !== undefined && latest.soreness !== null && latest.soreness >= 4) {
      flags.push({ title: "Severe Soreness Flag", desc: `Muscle soreness scored ${latest.soreness}/5. Rest is strongly indicated`, type: 'extreme' });
    }
    if (latest.fatigue !== undefined && latest.fatigue !== null && latest.fatigue >= 4) {
      flags.push({ title: "High Systemic Fatigue", desc: `Overall fatigue registered at level ${latest.fatigue}/5`, type: 'extreme' });
    }

    return {
      hasSufficientData: true,
      flags,
      latestLog: latest
    };
  };

  const recoveryDetails = getRecoveryFlags();

  // 7. DETERMINISTIC STATUS CLASSIFICATION
  const getOverallInjuryStatus = () => {
    // Insufficient Data fallback
    if (!acwr.hasSufficientData || !volSpike.hasSufficientData) {
      return {
        status: "Insufficient Data" as const,
        color: "text-zinc-500 border-zinc-800 bg-zinc-950/40",
        message: "At least 4 weeks of continuous training load and running workout volume history is required to compile accurate risk algorithms."
      };
    }

    // High Risk parameters
    if (
      acwr.ratio > 1.5 || 
      volSpike.spikeRatio > 1.5 || 
      monotonyStrain.strain > 1200 || 
      (recoveryDetails.latestLog?.soreness && recoveryDetails.latestLog.soreness >= 4)
    ) {
      return {
        status: "High Risk" as const,
        color: "text-red-500 border-red-900/50 bg-red-950/15",
        message: "Significant training spikes or acute biometric soreness detected. Highly recommend a structured deload block to mitigate strain."
      };
    }

    // Moderate Risk parameters
    if (
      acwr.ratio > 1.3 || 
      acwr.ratio < 0.8 || 
      volSpike.spikeRatio > 1.25 || 
      monotonyStrain.strain > 800 ||
      (recoveryDetails.latestLog?.soreness && recoveryDetails.latestLog.soreness >= 3) ||
      (recoveryDetails.latestLog?.fatigue && recoveryDetails.latestLog.fatigue >= 4)
    ) {
      return {
        status: "Moderate Risk" as const,
        color: "text-amber-500 border-amber-900/50 bg-amber-950/15",
        message: "Rolling acute strain registers outside optimal bands. Ensure adequate orthopedic rest and monitor soreness levels."
      };
    }

    // Safely low if supported by baseline training structures
    return {
      status: "Low Risk" as const,
      color: "text-emerald-400 border-emerald-950 bg-emerald-950/15",
      message: "Training metrics are well-balanced and aligned within stable rolling limits. Ideal performance envelope."
    };
  };

  const riskAssessment = getOverallInjuryStatus();

  // CHART DATA COMPILATION FOR THE RETROSPECTIVE GRAPH
  // Generate rolling values for each day of the last 14 days of history (index 21 to 34)
  const getChartData = () => {
    const list = [];
    for (let i = 21; i <= 34; i++) {
      // Acute sum/avg at day i
      let acuteSum = 0;
      for (let j = 0; j < 7; j++) {
        acuteSum += loadsVector[i - j] || 0;
      }
      const acute = acuteSum / 7;

      // Chronic sum/avg at day i
      let chronicSum = 0;
      for (let j = 0; j < 28; j++) {
        chronicSum += loadsVector[i - j] || 0;
      }
      const chronic = chronicSum / 28;
      const ratio = chronic > 0 ? (acute / chronic) : 0;

      list.push({
        date: history[i].dateStr,
        acute: Math.round(acute),
        chronic: Math.round(chronic),
        ratio: Number(ratio.toFixed(2))
      });
    }
    return list;
  };

  const chartData = getChartData();

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" strokeWidth={1.5} />
        <span className="text-xs uppercase tracking-widest font-bold font-mono">Compiling Injury Risk Gradients...</span>
      </div>
    );
  }

  // Pre-calculate count states for visual data health cards
  const totalRuns = activities.length;
  const runsWithCadence = activities.filter(a => !!a.cadenceAvg).length;
  const hasWellness = wellnessLogs.length > 0;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1450px] w-full mx-auto space-y-6">

        {/* TOP DESCRIPTION BAR & NAVIGATION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-5">
            <button
              id="injury_radar_back_btn"
              onClick={() => router.push('/')}
              className="p-2.5 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-white font-mono leading-none">Injury Risk</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1.5 font-bold">
                Highlights training-load pattern anomalies and recovery flags.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 font-mono text-[9.5px] uppercase border border-white/10 text-zinc-400 font-bold rounded">
            <span>Deterministic Analytics Engine</span>
          </div>
        </div>

        {/* MEDICAL safety/Wording disclaimer bar - REQUIRED BY PRODUCT LAW */}
        <div className="border border-[#FC5200]/30 bg-[#FC5200]/5 rounded p-4 flex gap-3 text-xs leading-normal uppercase font-mono text-zinc-400">
          <Info className="w-5 h-5 text-[#FC5200] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-white font-bold block">Medical Safety & Interpretation Notice</span>
            <p>
              This feature is not a medical diagnosis. It does not replace advice from a sports physician or physiotherapist. The calculations represent pure mathematical and statistical projections based solely on your connected training-load histories and submitted soreness checks.
            </p>
          </div>
        </div>

        {/* OVERALL STATUS BANNER */}
        <div className={`p-6 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${riskAssessment.color}`}>
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono font-bold block">Consolidated Profile Risk</span>
                <span className="text-2xl font-extrabold uppercase font-mono">{riskAssessment.status}</span>
              </div>
            </div>
            <p className="text-xs uppercase font-mono leading-relaxed opacity-90">{riskAssessment.message}</p>
          </div>

          <div className="text-[11px] font-mono uppercase bg-black/40 border border-white/15 px-4 py-3 rounded text-zinc-300">
            <div className="flex justify-between gap-12 pb-1 border-b border-white/5 font-semibold">
              <span>Weeks Tracked:</span>
              <span className="text-white font-bold">{Math.max(1, Math.round(totalRuns / 3))} Weeks</span>
            </div>
            <div className="flex justify-between gap-12 pt-1 font-semibold">
              <span>Overall Status:</span>
              <span className="text-white font-bold text-[#FC5200]">{activities.length >= 3 ? 'READY' : 'UNCALIBRATED'}</span>
            </div>
          </div>
        </div>

        {/* CENTRAL GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* RISK CARDS (COL-SPAN 3) */}
          <div className="lg:col-span-3 space-y-6">

            {/* HIGH-FIDELITY DETAILED SIGNAL CARDS Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* 1. ACWR Ratio Card */}
              <div id="radar_card_acwr" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Rolling ACWR Ratio</span>
                    <h3 className="text-xs font-bold text-white uppercase mt-0.5">Acute to Chronic Ratio</h3>
                  </div>
                  <TrendingUp className="w-4.5 h-4.5 text-[#FC5200]" />
                </div>

                {acwr.hasSufficientData ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-extrabold font-mono ${acwr.ratio > 1.4 ? 'text-red-500' : acwr.ratio > 1.3 ? 'text-amber-500' : 'text-emerald-400'}`}>
                        {acwr.ratio.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Ratio Score</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 uppercase pt-1">
                      <div className="bg-zinc-900 border border-white/5 p-1.5 rounded">
                        <span>7-Day Acute:</span>
                        <span className="text-white font-bold block">{Math.round(acwr.acuteAvg)} Load/Day</span>
                      </div>
                      <div className="bg-zinc-900 border border-white/5 p-1.5 rounded">
                        <span>28-Day Chronic:</span>
                        <span className="text-white font-bold block">{Math.round(acwr.chronicAvg)} Load/Day</span>
                      </div>
                    </div>

                    <p className="text-[9.5px] leading-normal uppercase font-mono text-zinc-500">
                      Ideal range remains 0.8 - 1.3 (Sweet Spot). Ratios exceeding 1.5 represent accelerated fatigue-accrual risks.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[11px] font-mono text-amber-500 uppercase leading-relaxed text-center py-6">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                    <span>Insufficient data for rolling ACWR calculations. Log at least 28 days of load or activities history first.</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 h-1 bg-[#FC5200]/30 w-full" />
              </div>

              {/* 2. Volume Spike Card */}
              <div id="radar_card_volume_spike" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Weekly Distance Spike</span>
                    <h3 className="text-xs font-bold text-white uppercase mt-0.5">Chronological Acceleration</h3>
                  </div>
                  <TrendingDown className="w-4.5 h-4.5 text-blue-400" />
                </div>

                {volSpike.hasSufficientData ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-extrabold font-mono ${volSpike.spikeRatio > 1.4 ? 'text-red-500' : volSpike.spikeRatio > 1.25 ? 'text-amber-500' : 'text-emerald-400'}`}>
                        {volSpike.spikeRatio.toFixed(2)}x
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Spike Ratio</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 uppercase pt-1">
                      <div className="bg-zinc-900 border border-white/5 p-1.5 rounded">
                        <span>Current Week:</span>
                        <span className="text-white font-bold block">{formatDistanceKm(volSpike.currentWeekDist)}</span>
                      </div>
                      <div className="bg-zinc-900 border border-white/5 p-1.5 rounded">
                        <span>4-Week Historical:</span>
                        <span className="text-white font-bold block">{formatDistanceKm(volSpike.prevWeeklyAvg)} /Wk</span>
                      </div>
                    </div>

                    <p className="text-[9.5px] leading-normal uppercase font-mono text-zinc-500">
                      A sudden volume escalation exceeding 1.25x the 4-week moving average spikes physical stress.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[11px] font-mono text-amber-500 uppercase leading-relaxed text-center py-6">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                    <span>Weekly volume spike calculations require at least 4 contiguous weeks of historical activity logs.</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 h-1 bg-blue-500/30 w-full" />
              </div>

            </div>

            {/* RISK CARDS Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* 3. Monotony & Strain */}
              <div id="radar_card_monotony_strain" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Training Monotony & Strain</span>
                    <h3 className="text-xs font-bold text-white uppercase mt-0.5">Variance and Combined Stress</h3>
                  </div>
                  <Zap className="w-4.5 h-4.5 text-yellow-500" />
                </div>

                {monotonyStrain.hasSufficientData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10.5px] text-zinc-400 font-mono uppercase font-semibold block">Monotony Score:</span>
                        <span className={`text-2xl font-extrabold font-mono ${monotonyStrain.monotony > 2.0 ? 'text-red-500' : 'text-zinc-200'}`}>
                          {monotonyStrain.monotony.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10.5px] text-zinc-400 font-mono uppercase font-semibold block">Training Strain:</span>
                        <span className={`text-2xl font-extrabold font-mono ${monotonyStrain.strain > 1000 ? 'text-red-500' : 'text-[#FC5200]'}`}>
                          {Math.round(monotonyStrain.strain)}
                        </span>
                      </div>
                    </div>

                    <p className="text-[9.5px] leading-normal uppercase font-mono text-zinc-500">
                      Standard monotony scores above 2.0 coupled with extreme total weekly loads multiply strain, elevating connective tissue risk. 
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[11px] font-mono text-amber-500 uppercase leading-relaxed text-center py-6">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2" />
                    <span>Daily load inputs are required to calculate continuous monotony variance and strain ratings.</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 h-1 bg-yellow-500/30 w-full" />
              </div>

              {/* 4. Cadence & Elevation spikes */}
              <div id="radar_card_biomechanical" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Cadence & Vertical Changes</span>
                    <h3 className="text-xs font-bold text-white uppercase mt-0.5">Biomechanical Shifts</h3>
                  </div>
                  <Gauge className="w-4.5 h-4.5 text-emerald-400" />
                </div>

                <div className="space-y-4">
                  {/* Cadence Check */}
                  {cadenceDetails.hasSufficientData ? (
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <div>
                        <span className="text-zinc-400 uppercase font-bold">Cadence Shift:</span>
                        <span className="text-zinc-500 text-[9.5px] block">vs 5-Run Historical Average</span>
                      </div>
                      <span className={`font-bold ${cadenceDetails.change < -4 ? 'text-red-500' : 'text-emerald-400'}`}>
                        {cadenceDetails.change.toFixed(1)} SPM ({Math.round(cadenceDetails.latestSpm)} vs {Math.round(cadenceDetails.historicalSpm)})
                      </span>
                    </div>
                  ) : (
                    <div className="p-1.5 bg-zinc-950/40 border border-white/5 rounded text-[9.5px] font-mono text-zinc-500 uppercase">
                      Cadence history is not available (minimum 3 cadence workouts).
                    </div>
                  )}

                  {/* Elevation Check */}
                  {elevationDetails.hasElevation ? (
                    <div className="flex items-center justify-between font-mono text-[11px] pt-1">
                      <div>
                        <span className="text-zinc-400 uppercase font-bold">Elevation Slope Gain:</span>
                        <span className="text-zinc-500 text-[9.5px] block">Current week vertical load ratio</span>
                      </div>
                      <span className={`font-bold ${elevationDetails.elevatedRatio > 1.5 ? 'text-amber-500' : 'text-emerald-400'}`}>
                        {elevationDetails.elevatedRatio.toFixed(1)}x ({Math.round(elevationDetails.currentElev)}m vs {Math.round(elevationDetails.historicalElev)}mAvg)
                      </span>
                    </div>
                  ) : (
                    <div className="p-1.5 bg-zinc-950/40 border border-white/5 rounded text-[9.5px] font-mono text-zinc-500 uppercase">
                      No elevation gain data registered within history window.
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/30 w-full" />
              </div>

            </div>

            {/* ROLLING CHART DEMONSTRATION */}
            <div id="radar_load_area_chart" className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider font-mono">ACUTE VS CHRONIC DRIFT LOGS</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">Rolling Acute (7-Day) vs Chronic (28-Day) Metric Curve</h3>
                </div>
                {acwr.hasSufficientData && (
                  <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 rounded">
                    ROLLING HISTORY LOAD ACTIVE
                  </span>
                )}
              </div>

              {acwr.hasSufficientData ? (
                <div className="h-[220px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="acuteColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="chronicColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                        label={{ value: 'ROLLING LOAD INDEX', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 9, fontFamily: 'monospace' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="acute" 
                        stroke="#ef4444" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#acuteColor)" 
                        name="Acute (7-Day Load)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="chronic" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#chronicColor)" 
                        name="Chronic (28-Day Load)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12">
                   <DataRequiredState requirementId="ENOUGH_HISTORY_REQUIRED" customDescription="At least 4 weeks of continuous activity data is required to map Acute vs Chronic load metrics without data gap distortion." />
                </div>
              )}
            </div>

          </div>

          {/* WELLNESS FLAGS & PANEL (COL-SPAN 1) */}
          <div className="lg:col-span-1 space-y-6">

            {/* RECOVERY WELLNESS DATA FLAGS */}
            <div id="radar_recovery_signals" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-bold uppercase tracking-widest font-mono">Wellness Flags</span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5 font-mono">Cardiovascular & Physical Sleep Recovery</h3>
              </div>

              {recoveryDetails.hasSufficientData ? (
                <div className="space-y-3 font-mono text-[11px] uppercase">
                  {recoveryDetails.flags.length > 0 ? (
                    <div className="space-y-2">
                      {recoveryDetails.flags.map((flag, index) => (
                        <div key={index} className={`p-2.5 border rounded leading-relaxed flex items-start gap-2 ${flag.type === 'extreme' ? 'border-red-950 bg-red-950/20 text-red-400' : 'border-amber-950 bg-amber-950/10 text-amber-500'}`}>
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold block">{flag.title}</span>
                            <span className="text-[10px] opacity-95">{flag.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 border border-emerald-950 bg-emerald-950/15 text-emerald-400 rounded flex gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">No recovery flags tripped</span>
                        <span className="text-[10px] leading-relaxed block text-zinc-400 mt-1">
                          All recorded sleep duration, muscle soreness, fatigue variables, and subjective markers register in stable safe baselines.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-zinc-900 border border-white/5 rounded text-[10px] text-zinc-400 space-y-1.5 uppercase font-mono">
                    <span className="text-white block font-bold">Latest Submitted Metrics ({recoveryDetails.latestLog?.date}):</span>
                    <div className="flex justify-between">
                      <span>Resting Soreness:</span>
                      <span className="text-white">{recoveryDetails.latestLog?.soreness || '—'} / 5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sleep Duration:</span>
                      <span className="text-white">{recoveryDetails.latestLog?.sleepDurationHours || '—'} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fatigue Level:</span>
                      <span className="text-white">{recoveryDetails.latestLog?.fatigue || '—'} / 5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>HRV (RMSSD):</span>
                      <span className="text-white">{recoveryDetails.latestLog?.hrvRmssd ? `${recoveryDetails.latestLog.hrvRmssd} ms` : '—'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <SyncRequiredState requirementId="WELLNESS_REQUIRED" customDescription="Log daily muscle soreness and fatigue parameters to activate warning triggers." />
                </div>
              )}
            </div>

            {/* DATA PATHWAYS REQUIREMENT METER */}
            <div id="radar_data_requirements" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4 font-mono text-[11px] uppercase">
              <span className="text-xs text-[#FC5200] font-bold uppercase tracking-widest block">Data Requirements</span>
              <div className="space-y-3 text-zinc-400 leading-normal text-[10px]">
                
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span>Activities Synced (Run):</span>
                  <span className={totalRuns >= 5 ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                    {totalRuns} {totalRuns >= 5 ? '✓' : 'Insufficient (Req 5)'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span>Cadence Available:</span>
                  <span className={runsWithCadence >= 3 ? "text-emerald-400 font-bold" : "text-zinc-500 text-[9.5px]"}>
                    {runsWithCadence} synced {runsWithCadence >= 3 ? '✓' : 'Gated'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <span>Wellness Log Check:</span>
                  <span className={hasWellness ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                    {hasWellness ? 'ACTIVE ✓' : 'NO LOGS'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Chronic History Scanned:</span>
                  <span className={acwr.hasSufficientData ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>
                    {acwr.chronicSum > 0 ? 'Adequate ✓' : 'Zero Loads'}
                  </span>
                </div>

              </div>
              
              <div className="bg-zinc-950 p-2.5 rounded border border-white/5 text-[9.5px] leading-relaxed text-zinc-400">
                <span className="text-[#FC5200] font-bold block mb-0.5">METRIC RIGOR:</span>
                Track.Studio utilizes deterministic mathematical modeling matching elite physical monitoring systems. We never synthesize random values or simulate safety vectors when physical data is missing.
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
