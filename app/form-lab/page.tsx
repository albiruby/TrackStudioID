'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Settings, 
  RefreshCw, 
  Database,
  Activity,
  Award,
  Clock,
  Gauge,
  Heart,
  Thermometer,
  Compass,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { getActivities, getActivityStream } from '../../lib/firebase/firestore';
import { CanonicalActivity, CanonicalActivityStream } from '../../data/types';
import { formatDistanceKm } from '../../lib/data/dataLaw';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';

export default function FormLabPage() {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<CanonicalActivity | null>(null);
  const [stream, setStream] = useState<CanonicalActivityStream | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  
  // Load activities
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const data = await getActivities(user.uid);
        // Filter run activities sorted by date descending
        const runs = data.filter(a => a.sportType.toLowerCase() === 'run' || a.sportType.toLowerCase() === 'trailrun');
        runs.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setActivities(runs);
        if (runs.length > 0) {
          setSelectedActivity(runs[0]);
        }
      } catch (e) {
        console.error('Failed to load form activities:', e);
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

  // Load stream for the selected activity
  useEffect(() => {
    async function loadStream() {
      if (!selectedActivity || !selectedActivity.id) {
        setStream(null);
        return;
      }
      setStreamLoading(true);
      try {
        const data = await getActivityStream(selectedActivity.id);
        setStream(data);
      } catch (err) {
        console.error('Failed to load activity stream:', err);
        setStream(null);
      } finally {
        setStreamLoading(false);
      }
    }
    loadStream();
  }, [selectedActivity]);

  const activeUnits = athleteProfile?.units || 'metric';

  // HELPER CALCULATIONS FOR CURRENTLY SELECTED RUN
  const getSelectedMetrics = () => {
    if (!selectedActivity) return null;
    
    // speed average (MPS)
    const movingTime = selectedActivity.movingTimeSeconds || 0;
    const distance = selectedActivity.distanceMeters || 0;
    const avgSpeed = movingTime > 0 ? (distance / movingTime) : 0;
    
    const paceMinKm = avgSpeed > 0 ? (1000 / avgSpeed) / 60 : 0;
    const hrs = selectedActivity.averageHeartRate || null;
    const cadence = selectedActivity.cadenceAvg || null;
    
    // stride length meters = speedMps / stepsPerSecond (cadence/60)
    let strideLengthMeters: number | null = null;
    if (cadence && cadence > 0 && avgSpeed > 0) {
      const stepsPerSec = cadence / 60;
      strideLengthMeters = avgSpeed / stepsPerSec;
    }

    // Efficiency target (Meters per Heart Beat / Cardiac Stroke Distance)
    let efficiencyFactor: number | null = null;
    if (avgSpeed > 0 && hrs && hrs > 0) {
      efficiencyFactor = (avgSpeed * 60) / hrs;
    }

    // STREAM CALCULATED METRICS
    let cadenceConsistency: number | null = null;
    let cardiacDrift: number | null = null;
    let driftReason = "";
    let avgStreamTemp: number | null = null;

    if (stream) {
      // 1. Cadence Consistency (Coefficient of Variation based score out of 100)
      if (stream.cadence && stream.cadence.length > 0) {
        const validCadences = stream.cadence.filter(c => c !== null && c > 30);
        if (validCadences.length > 10) {
          const sum = validCadences.reduce((acc, c) => acc + c, 0);
          const mean = sum / validCadences.length;
          const variance = validCadences.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / validCadences.length;
          const stdDev = Math.sqrt(variance);
          const cv = (stdDev / mean) * 100;
          cadenceConsistency = Math.max(0, Math.min(100, 100 - cv * 3.5)); // Penalize deviation cleanly
        }
      }

      // 2. Heat stream average
      if (stream.temp && stream.temp.length > 0) {
        const validTemps = stream.temp.filter(t => t !== null && t !== undefined);
        if (validTemps.length > 0) {
          avgStreamTemp = validTemps.reduce((acc, t) => acc + t, 0) / validTemps.length;
        }
      }

      // 3. Cardiac Drift
      const hrStream = stream.heartrate;
      const distStream = stream.distance;
      const timeStream = stream.time;
      const speedStream = stream.velocitySmooth;

      if (movingTime < 1200) {
        driftReason = "Activity duration is too short for static drift profiling (minimum 20 minutes/1200s required).";
      } else if (!hrStream || hrStream.length < 200) {
        driftReason = "Consistent cardiovascular heart rate streams are required to compute drift gradients.";
      } else {
        const n = hrStream.length;
        const derivedSpeeds: number[] = [];

        if (speedStream && speedStream.length === n) {
          derivedSpeeds.push(...speedStream);
        } else if (distStream && distStream.length === n && timeStream && timeStream.length === n) {
          for (let i = 0; i < n; i++) {
            if (i === 0) {
              derivedSpeeds.push(distStream[0] / (timeStream[0] || 1));
            } else {
              const dDiff = distStream[i] - distStream[i - 1];
              const tDiff = timeStream[i] - timeStream[i - 1];
              derivedSpeeds.push(tDiff > 0 ? dDiff / tDiff : 0);
            }
          }
        }

        if (derivedSpeeds.length === n) {
          const halfSize = Math.floor(n / 2);
          const firstHr = hrStream.slice(0, halfSize).filter(h => h && h > 40);
          const secondHr = hrStream.slice(halfSize).filter(h => h && h > 40);
          const firstSpeed = derivedSpeeds.slice(0, halfSize).filter(s => s && s > 0);
          const secondSpeed = derivedSpeeds.slice(halfSize).filter(s => s && s > 0);

          if (firstHr.length > 20 && secondHr.length > 20 && firstSpeed.length > 20 && secondSpeed.length > 20) {
            const h1Avg = firstHr.reduce((acc, h) => acc + h, 0) / firstHr.length;
            const h2Avg = secondHr.reduce((acc, h) => acc + h, 0) / secondHr.length;
            const s1Avg = firstSpeed.reduce((acc, s) => acc + s, 0) / firstSpeed.length;
            const s2Avg = secondSpeed.reduce((acc, s) => acc + s, 0) / secondSpeed.length;

            const ratio1 = s1Avg / h1Avg;
            const ratio2 = s2Avg / h2Avg;

            if (ratio1 > 0) {
              // Cardiac drift represents the shift in cardiovascular strain vs power/speed
              // Decoupling % = ((Ratio1 - Ratio2) / Ratio1) * 100
              cardiacDrift = ((ratio1 - ratio2) / ratio1) * 100;
            }
          } else {
            driftReason = "Telemetry stream sample subsets are insufficient after telemetry pruning.";
          }
        } else {
          driftReason = "Deterministic velocity coordinates must be synchronized to measure drift.";
        }
      }
    } else {
      driftReason = "Stream telemetry requires syncing specific high resolution activity datasets.";
    }

    // 4. Heat-Adjusted Efficiency
    let heatAdjustedEF: number | null = null;
    if (efficiencyFactor && avgStreamTemp !== null) {
      // Metric baseline is 15 degrees Celsius. 0.6% deterioration rate per unit shift.
      const tempDiff = avgStreamTemp - 15;
      if (tempDiff > 0) {
        const heatPenalty = tempDiff * 0.006;
        heatAdjustedEF = efficiencyFactor * (1 + heatPenalty);
      } else {
        heatAdjustedEF = efficiencyFactor; // standard temperate or cool adaptation
      }
    }

    return {
      avgSpeed,
      paceMinKm,
      cadence,
      strideLengthMeters,
      efficiencyFactor,
      cadenceConsistency,
      cardiacDrift,
      driftReason,
      avgStreamTemp,
      heatAdjustedEF
    };
  };

  const selectedMetrics = getSelectedMetrics();

  // 6. DETECT COMPARABLE ECONOMY RUNS
  const getComparableEconomyRuns = () => {
    if (!selectedActivity) return [];
    const baselineDistance = selectedActivity.distanceMeters || 0;
    if (baselineDistance === 0) return [];

    // Filter runs of same sport, with valid HR and cadence, within 25% of the selected activity distance
    return activities
      .filter(act => {
        if (!act.averageHeartRate || !act.cadenceAvg || !act.distanceMeters) return false;
        const diffPercent = Math.abs(act.distanceMeters - baselineDistance) / baselineDistance;
        return diffPercent <= 0.25;
      })
      .map(act => {
        const mTime = act.movingTimeSeconds || 0;
        const dist = act.distanceMeters || 0;
        const speed = mTime > 0 ? (dist / mTime) : 0;
        const ef = (speed * 60) / (act.averageHeartRate || 1);
        return {
          id: act.id,
          name: act.name,
          date: act.startDate.slice(0, 10),
          distanceKm: dist / 1000,
          avgHeartRate: act.averageHeartRate,
          efficiencyFactor: ef
        };
      })
      .reverse(); // ascending date sorting for charts
  };

  const comparableRuns = getComparableEconomyRuns();

  // FORMAT TEMPS
  const formatTemp = (celsius: number | null) => {
    if (celsius === null || celsius === undefined) return '—';
    if (activeUnits === 'imperial') {
      const fahrenheit = (celsius * 9) / 5 + 32;
      return `${Math.round(fahrenheit)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const formatPace = (decimalMin: number) => {
    if (!decimalMin || isNaN(decimalMin)) return '—';
    const mins = Math.floor(decimalMin);
    const secs = Math.round((decimalMin - mins) * 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}/km`;
  };

  // RENDERING COMPONENT LOADS
  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" strokeWidth={1.5} />
        <span className="text-xs uppercase tracking-widest font-bold font-mono">Loading Running Form Dynamics...</span>
      </div>
    );
  }

  // Pre-calculate system-wide telemetry metadata summaries for the sidebar
  const totalRuns = activities.length;
  const runsWithCadence = activities.filter(a => !!a.cadenceAvg).length;
  const runsWithHR = activities.filter(a => !!a.averageHeartRate).length;
  const runsWithStreams = activities.filter(a => !!a.streamsSyncedAt).length;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1450px] w-full mx-auto space-y-6">

        {/* TOP BAR / NAVIGATION */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-5">
            <button
              id="form_lab_back_btn"
              onClick={() => router.push('/')}
              className="p-2.5 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-white font-mono leading-none">Running Form</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1.5 font-bold">
                Analyze cadence, efficiency, and pacing stability from synced activity data.
              </p>
            </div>
          </div>

          {/* SELECTOR FOR ACTIVE RUNS */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase whitespace-nowrap">Selected Activity:</span>
            {activities.length > 0 ? (
              <select
                id="form_lab_activity_selector"
                value={selectedActivity?.id || ''}
                onChange={(e) => {
                  const found = activities.find(a => a.id === e.target.value);
                  if (found) setSelectedActivity(found);
                }}
                className="bg-black text-[11px] font-mono text-white px-3 py-2 border border-white/15 rounded focus:outline-none focus:border-[#FC5200] max-w-[280px]"
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id} className="bg-zinc-950 text-white">
                    {a.startDate.slice(0, 10)} - {a.name.slice(0, 24)} ({formatDistanceKm(a.distanceMeters)})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs text-zinc-500 font-mono font-bold uppercase">No runs synced</div>
            )}
          </div>
        </div>

        {activities.length === 0 ? (
          /* EMPTY STATE WHEN NO ATHLETE ACTIVITIES REGISTERED */
          <div className="bg-[#111113] border border-white/10 rounded-lg p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-8 h-8 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono">Running activities missing</h3>
              <p className="text-xs text-zinc-400 leading-relaxed uppercase font-mono">
                No Running (Run or Trail Run) activities are currently synced. Run a Strava API credentials synchronization to pull workouts.
              </p>
              <button 
                onClick={() => router.push('/settings')} 
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono font-bold text-[#FC5200] border border-white/10 hover:border-white/20 uppercase rounded tracking-wider cursor-pointer transition-all"
              >
                Configure Strava Sync
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* METRICS & DETAILS PANELS (COL-SPAN 3) */}
            <div className="lg:col-span-3 space-y-6">

              {/* DYNAMIC FORM METRICS BOARD */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* 1. Cadence Card */}
                <div id="card_cadence_analysis" className="bg-[#111113] border border-white/10 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Cadence Analysis</span>
                      <Gauge className="w-4 h-4 text-emerald-400" />
                    </div>
                    {selectedMetrics?.cadence ? (
                      <div className="space-y-1">
                        <span className="text-3xl font-extrabold text-white font-mono leading-none">
                          {selectedMetrics.cadence}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono ml-1.5 uppercase font-bold">SPM</span>
                        
                        <div className="pt-2 text-[10px] font-mono text-zinc-400 space-y-1">
                          <div className="flex justify-between pb-1 border-b border-white/5">
                            <span className="uppercase text-zinc-500">Cadence Availability:</span>
                            <span className="text-emerald-400 font-bold uppercase">AVAILABLE</span>
                          </div>
                          <div className="flex justify-between pt-1">
                            <span className="uppercase text-zinc-500">Cadence Consistency:</span>
                            <span className="text-white font-bold">
                              {selectedMetrics.cadenceConsistency !== null ? `${selectedMetrics.cadenceConsistency.toFixed(1)}%` : 'Requires Stream'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-[11px] font-mono font-bold text-amber-500 uppercase leading-relaxed">
                        Cadence data is required for this analysis.
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/30 w-full" />
                </div>

                {/* 2. Stride Length Card */}
                <div id="card_stride_estimate" className="bg-[#111113] border border-white/10 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Stride Length Estimate</span>
                      <span className="text-[9px] font-bold bg-[#FC5200]/10 text-[#FC5200] border border-[#FC5200]/20 px-1.5 py-0.5 rounded uppercase">Estimated</span>
                    </div>
                    {selectedMetrics?.strideLengthMeters ? (
                      <div className="space-y-1">
                        <span className="text-3xl font-extrabold text-white font-mono leading-none">
                          {selectedMetrics.strideLengthMeters.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono ml-1.5 uppercase font-bold">Meters</span>
                        
                        <div className="pt-2 text-[10px] font-mono text-zinc-400 space-y-1">
                          <p className="text-[9px] leading-relaxed text-zinc-500 uppercase">
                            Stride derived deterministically from speed vs cadence step frequency parameters.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-[11px] font-mono font-bold text-amber-500 uppercase leading-relaxed">
                        Cadence and speed data are required to estimate stride length.
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-[#FC5200]/30 w-full" />
                </div>

                {/* 3. Efficiency Card */}
                <div id="card_efficiency_ratio" className="bg-[#111113] border border-white/10 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden group">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Efficiency Factor</span>
                      <Heart className="w-4 h-4 text-rose-500" />
                    </div>
                    {selectedMetrics?.efficiencyFactor ? (
                      <div className="space-y-1">
                        <span className="text-3xl font-extrabold text-white font-mono leading-none">
                          {selectedMetrics.efficiencyFactor.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono ml-1.5 uppercase font-bold">M/Beat</span>
                        
                        <div className="pt-2 text-[10px] font-mono text-zinc-500 space-y-1">
                          <p className="text-[9px] leading-relaxed text-zinc-400 uppercase">
                            Also known as cardiac stroke distance. Measures physical output speed per heart beat cycle.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 text-[11px] font-mono font-bold text-amber-500 uppercase leading-relaxed">
                        Heart rate and speed data are required to calculate efficiency.
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 bg-rose-500/30 w-full" />
                </div>

              </div>

              {/* SECOND ROW METRICS: CARDIAC DRIFT & HEAT-ADJUSTED EFFICIENCY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* 4. Cardiac Drift / Decoupling */}
                <div id="card_cardiac_drift" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Cardiac Drift (Aerobic Decoupling)</span>
                      <h3 className="text-xs font-bold text-white uppercase mt-0.5">Ventilatory Decay Indicator</h3>
                    </div>
                    <span className="text-[9px] font-bold bg-[#FC5200]/10 text-[#FC5200] border border-[#FC5200]/20 px-1.5 py-0.5 rounded uppercase">Estimated from activity streams</span>
                  </div>

                  {streamLoading ? (
                    <div className="flex justify-center items-center py-6 gap-2 text-zinc-450 font-mono text-[11px] uppercase">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FC5200]" />
                      <span>Extracting cardiovascular stream structures...</span>
                    </div>
                  ) : selectedMetrics?.cardiacDrift !== null && selectedMetrics?.cardiacDrift !== undefined ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-extrabold font-mono ${Math.abs(selectedMetrics.cardiacDrift) > 5 ? 'text-amber-500' : 'text-emerald-400'}`}>
                          {selectedMetrics.cardiacDrift.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Aerobic Decoupling</span>
                      </div>
                      <p className="text-[10px] leading-normal uppercase font-mono text-zinc-400">
                        {selectedMetrics.cardiacDrift < 5 
                          ? 'Aerobic system is highly stable. The cardiac efficiency decoupling remained under 5% baseline.'
                          : 'Higher decoupling indicates aerobic strain deterioration as workout duration progresses.'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[11px] font-mono text-zinc-450 uppercase leading-relaxed">
                      <div className="flex items-start gap-1.5 text-zinc-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-500">Cardiac drift gated:</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{selectedMetrics?.driftReason || 'Heart rate and pace or power streams are required.'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Heat-Adjusted Efficiency Card */}
                <div id="card_heat_adjusted" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">Heat-Adjusted Efficiency</span>
                      <h3 className="text-xs font-bold text-white uppercase mt-0.5">Atmospheric Normalization</h3>
                    </div>
                    <span className="text-[9px] font-bold bg-[#FC5200]/10 text-[#FC5200] border border-[#FC5200]/20 px-1.5 py-0.5 rounded uppercase">Estimated</span>
                  </div>

                  {streamLoading ? (
                    <div className="flex justify-center items-center py-6 gap-2 text-zinc-450 font-mono text-[11px] uppercase">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FC5200]" />
                      <span>Parsing atmospheric data...</span>
                    </div>
                  ) : selectedMetrics?.avgStreamTemp !== null && selectedMetrics?.avgStreamTemp !== undefined ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-zinc-900 border border-white/5 p-2 rounded">
                          <span className="text-zinc-500 text-[10px] uppercase font-mono block">Average Stream Temp:</span>
                          <span className="text-sm font-bold text-white font-mono mt-0.5 block flex items-center gap-1">
                            <Thermometer className="w-4 h-4 text-red-400" />
                            {formatTemp(selectedMetrics.avgStreamTemp)}
                          </span>
                        </div>
                        <div className="bg-zinc-900 border border-white/5 p-2 rounded">
                          <span className="text-zinc-500 text-[10px] uppercase font-mono block">Normalized Economy:</span>
                          <span className="text-sm font-bold text-[#FC5200] font-mono mt-0.5 block">
                            {selectedMetrics.heatAdjustedEF ? `${selectedMetrics.heatAdjustedEF.toFixed(2)} M/Beat` : '—'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[9.5px] leading-relaxed uppercase font-mono text-zinc-550">
                        Adjusts real work outputs to temperate (15°C) environments to examine true biometric cardiovascular thresholds.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[11px] font-mono text-zinc-450 uppercase leading-relaxed">
                      <div className="flex items-start gap-1.5 text-zinc-400">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-500">ATMOSPHERIC NORMALIZATION GATED:</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Temperature data not available.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* RECHARTS CADENCE LINE PLOT (IF STREAM IS RECORDED) */}
              <div id="panel_cadence_stream_plot" className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider font-mono">CADENCE PATHWAYS</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">Selected Run Cadence Stream Visualization</h3>
                  </div>
                  {stream && stream.cadence && (
                    <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 rounded">
                      STREAM ACTIVE: {stream.cadence.length} SAMPLES
                    </span>
                  )}
                </div>

                {streamLoading ? (
                  <div className="flex flex-col justify-center items-center py-16 gap-3">
                    <RefreshCw className="w-7 h-7 animate-spin text-[#FC5200]" />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono font-bold">Interrogating high-fidelity telemetry channels...</span>
                  </div>
                ) : stream && stream.cadence && stream.cadence.length > 0 ? (
                  <div className="h-[240px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart 
                        data={stream.cadence.map((c, idx) => ({ 
                          time: stream.time && stream.time[idx] ? Math.round(stream.time[idx] / 60) : idx, 
                          cadenceValue: c || 0 
                        })).filter(d => d.cadenceValue > 40)}
                      >
                        <defs>
                          <linearGradient id="cadenceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="time" 
                          stroke="#4b5563" 
                          fontSize={9} 
                          fontFamily="monospace"
                          tickLine={false}
                          label={{ value: 'DURATION (MINUTES)', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 9, fontFamily: 'monospace' }} 
                        />
                        <YAxis 
                          stroke="#4b5563" 
                          fontSize={9} 
                          fontFamily="monospace"
                          domain={[120, 205]}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                          labelFormatter={(l) => `Time: ${l} min`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="cadenceValue" 
                          stroke="#10B981" 
                          strokeWidth={2} 
                          fillOpacity={1} 
                          fill="url(#cadenceGradient)" 
                          name="Cadence (SPM)" 
                        />
                        {selectedActivity?.cadenceAvg && (
                          <ReferenceLine y={selectedActivity.cadenceAvg} stroke="#fc5200" strokeDasharray="3 3" label={{ value: `AVG: ${selectedActivity.cadenceAvg}`, fill: '#fc5200', fontSize: 10, fontFamily: 'monospace', position: 'insideRight' }} />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="bg-zinc-900/40 p-8 text-center rounded border border-white/5 space-y-2">
                    <Database className="w-8 h-8 text-zinc-500 mx-auto" strokeWidth={1.5} />
                    <p className="text-xs text-zinc-400 leading-normal uppercase font-mono max-w-md mx-auto">
                      Running step cadence pathways stream has not been parsed for this activity. Sync high resolution stream structures on the activity detail page to activate raw visual tracing.
                    </p>
                  </div>
                )}
              </div>

              {/* ECONOMY TREND COMPARISONS */}
              <div id="panel_economy_comparisons" className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider font-mono">Comparable Economy Trend</span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">Running Economy Trend Index (Comparable Activities Only)</h3>
                  </div>
                  {comparableRuns.length >= 3 && (
                    <span className="text-[10px] text-[#FC5200] font-mono font-bold uppercase border border-[#FC5200]/20 bg-[#FC5200]/10 px-2.5 py-0.5 rounded">
                      {comparableRuns.length} COMP SUBSETS DETECTED
                    </span>
                  )}
                </div>

                {comparableRuns.length >= 3 ? (
                  <div className="space-y-6 pt-2">
                    {/* Recharts chart mapping economy index */}
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparableRuns}>
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
                            domain={['auto', 'auto']}
                            tickLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                            formatter={(value: any) => [`${Number(value).toFixed(2)} M/Beat`, 'Efficiency (EF)']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="efficiencyFactor" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-[10px] border border-white/5">
                        <thead>
                          <tr className="bg-zinc-900 text-zinc-500 border-b border-white/10 uppercase">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Workout Name</th>
                            <th className="p-2.5">Distance</th>
                            <th className="p-2.5">Avg HR</th>
                            <th className="p-2.5 text-right">Efficiency Factor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-zinc-300">
                          {comparableRuns.slice().reverse().map((run) => (
                            <tr key={run.id} className="hover:bg-zinc-900/60 transition-colors">
                              <td className="p-2.5 font-bold text-white">{run.date}</td>
                              <td className="p-2.5 uppercase text-zinc-400">{run.name}</td>
                              <td className="p-2.5">{run.distanceKm.toFixed(2)} km</td>
                              <td className="p-2.5">{run.avgHeartRate} bpm</td>
                              <td className="p-2.5 text-right font-bold text-[#FC5200]">{run.efficiencyFactor.toFixed(2)} M/B</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/40 p-8 text-center rounded border border-white/5 space-y-2">
                    <Database className="w-8 h-8 text-zinc-500 mx-auto" strokeWidth={1.5} />
                    <p className="text-xs text-zinc-400 leading-normal uppercase font-mono max-w-sm mx-auto">
                      At least 3 comparable activities with heart rate and pace data are required to map trends.
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-normal uppercase font-mono max-w-md mx-auto">
                      Current activity requires similar Runs within ±25% distance tolerance ({selectedActivity ? `${((selectedActivity.distanceMeters || 0) * 0.75 / 1000).toFixed(1)} km - ${((selectedActivity.distanceMeters || 0) * 1.25 / 1000).toFixed(1)} km` : '—'}). Currently found comparable: {comparableRuns.length} activities.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* INTEGRATED DATA HEALTH SECTION (COL-SPAN 1) */}
            <div className="lg:col-span-1 space-y-6">

              {/* READINESS CHECK PANEL */}
              <div id="panel_form_data_health" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
                <div>
                  <span className="text-xs text-[#FC5200] font-bold uppercase tracking-widest font-mono">DETERMINISTIC PROFILE</span>
                  <h3 className="text-sm font-bold text-white uppercase mt-0.5 font-mono">Form Data Health</h3>
                </div>

                <div className="space-y-3 font-mono text-[11px] uppercase">

                  {/* 1. Activities Syncs */}
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-zinc-400">Total Run Workouts:</span>
                    <span className="text-white font-bold">{totalRuns} Activities</span>
                  </div>

                  {/* 2. Cadence Syncs */}
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-zinc-400">Cadence Tracked:</span>
                    <div className="flex items-center gap-1.5">
                      {runsWithCadence > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-500" />
                      )}
                      <span className={runsWithCadence > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500 font-bold'}>
                        {runsWithCadence} synced
                      </span>
                    </div>
                  </div>

                  {/* 3. Heart Rate Syncs */}
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-zinc-400">Heart Rate Syncs:</span>
                    <div className="flex items-center gap-1.5">
                      {runsWithHR > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-500" />
                      )}
                      <span className={runsWithHR > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500 font-bold'}>
                        {runsWithHR} synced
                      </span>
                    </div>
                  </div>

                  {/* 4. Stream Availability */}
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-zinc-400">Telemetry Streams:</span>
                    <div className="flex items-center gap-1.5">
                      {runsWithStreams > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-500" />
                      )}
                      <span className={runsWithStreams > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500 font-bold'}>
                        {runsWithStreams} synced
                      </span>
                    </div>
                  </div>

                  {/* 5. Eligible For Analysis */}
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Analysis Eligible:</span>
                    <div className="flex items-center gap-1.5">
                      {runsWithCadence > 0 && runsWithHR > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-500" />
                      )}
                      <span className={runsWithCadence > 0 && runsWithHR > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500 font-bold'}>
                        {runsWithCadence > 0 && runsWithHR > 0 ? 'READY' : 'UNCALIBRATED'}
                      </span>
                    </div>
                  </div>

                </div>

                <div className="border border-white/10 bg-zinc-950/40 p-3 rounded space-y-1.5 text-[9.5px] text-zinc-400 leading-normal uppercase font-mono">
                  <span className="text-zinc-100 font-bold block">Telemetry Integrity Rules:</span>
                  <p>• Data points represent authentic sensor streams with zero AI alterations.</p>
                  <p>• Efficiency indexes represent pure mathematical metrics based directly on real activity payloads.</p>
                </div>
              </div>

              {/* DIAGNOSTIC EXPLANATIONS PANEL */}
              <div id="panel_metric_explanations" className="bg-[#111113] border border-white/10 rounded-lg p-5 space-y-4">
                <span className="text-xs text-[#FC5200] font-bold uppercase tracking-widest font-mono block">Data Required</span>
                <div className="space-y-4 text-[11px] uppercase font-mono">
                  
                  <div className="space-y-1">
                    <span className="text-white font-bold block">Cadence</span>
                    <p className="text-zinc-400 leading-normal text-[10px]">
                      Step frequency parsed from connected smartwatch or stride sensor. Target: 170-185 steps per minute.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-white font-bold block">Stride Length Estimate</span>
                    <p className="text-zinc-400 leading-normal text-[10px]">
                      Calculated as running velocity divided by stepping speed parameters. Labeled clearly: <span className="text-amber-500">Estimated</span>.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-white font-bold block">Efficiency</span>
                    <p className="text-zinc-400 leading-normal text-[10px]">
                      Derived metric showing distance covered per heart beat (meters/beat). Demands paired average HR + velocity metrics.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-white font-bold block">Cardiac Drift</span>
                    <p className="text-zinc-400 leading-normal text-[10px]">
                      Measures Aerobic Decoupling % inside activities exceeding 20 minutes duration. Requires synchronized HR and velocity streams.
                    </p>
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
