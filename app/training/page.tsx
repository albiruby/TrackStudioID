'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  TrendingUp, 
  Award, 
  Activity, 
  HelpCircle, 
  Flame, 
  RefreshCw,
  Database,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { getDailyLoads, getImportedWorkouts } from '../../lib/firebase/firestore';
import { DailyTrainingLoad } from '../../data/types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function TrainingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [dailyLoads, setDailyLoads] = useState<DailyTrainingLoad[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation state
  const [planDailyLoad, setPlanDailyLoad] = useState<number>(50);
  const [planDays, setPlanDays] = useState<number>(28);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [loads, workouts] = await Promise.all([
          getDailyLoads(user.uid),
          getImportedWorkouts(user.uid)
        ]);

        // Sort descending to find latest loads easily
        setDailyLoads(loads.sort((a, b) => b.date.localeCompare(a.date)));

        // Filter: only future/today's intervals intervals.icu planned calendar workouts
        const todayStr = new Date().toISOString().split('T')[0];
        const upcoming = workouts
          .filter((w: any) => w.source === 'intervals' && w.scheduledDate && w.scheduledDate >= todayStr)
          .sort((a: any, b: any) => a.scheduledDate.localeCompare(b.scheduledDate));

        setPlannedWorkouts(upcoming);
      } catch (e) {
        console.error('Failed to load training loads:', e);
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

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Scanning Training Registry...</span>
      </div>
    );
  }

  // Find latest records and sort ascending for PMC chart
  const sortedLoadsAsc = [...dailyLoads].sort((a, b) => a.date.localeCompare(b.date));
  const latestLoad = dailyLoads[0]; // because dailyLoads is sorted descending

  const hasData = dailyLoads.length > 0;
  const showPMCChart = dailyLoads.length >= 7;

  // Extract metrics carefully (Strictly NO fake or fallback 0s. Keep missing as null/undefined)
  const latestFitness = latestLoad?.fitnessCtl !== undefined && latestLoad?.fitnessCtl !== null ? latestLoad.fitnessCtl : null;
  const latestFatigue = latestLoad?.fatigueAtl !== undefined && latestLoad?.fatigueAtl !== null ? latestLoad.fatigueAtl : null;
  const latestForm = latestLoad?.formTsb !== undefined && latestLoad?.formTsb !== null ? latestLoad.formTsb : null;

  // Compute computed/fallback ramp rate or parse from synced record
  let latestRampRate: number | null = null;
  if (latestLoad?.rampRate !== undefined && latestLoad?.rampRate !== null) {
    latestRampRate = latestLoad.rampRate;
  } else if (dailyLoads.length >= 8) {
    const todayCtl = dailyLoads[0].fitnessCtl;
    const weekAgoCtl = dailyLoads[7].fitnessCtl;
    if (typeof todayCtl === 'number' && typeof weekAgoCtl === 'number') {
      latestRampRate = Math.round((todayCtl - weekAgoCtl) * 10) / 10;
    }
  }

  // Calculate 7-day and 28-day training load sum
  let sevenDayLoadSum: number | null = null;
  let twentyEightDayLoadSum: number | null = null;

  if (dailyLoads.length > 0) {
    const last7 = dailyLoads.slice(0, 7);
    const valid7 = last7.filter(l => typeof l.trainingLoad === 'number' && l.trainingLoad !== null);
    if (valid7.length > 0) {
      sevenDayLoadSum = Math.round(valid7.reduce((sum, curr) => sum + (curr.trainingLoad || 0), 0));
    }

    const last28 = dailyLoads.slice(0, 28);
    const valid28 = last28.filter(l => typeof l.trainingLoad === 'number' && l.trainingLoad !== null);
    if (valid28.length > 0) {
      twentyEightDayLoadSum = Math.round(valid28.reduce((sum, curr) => sum + (curr.trainingLoad || 0), 0));
    }
  }

  // Format functions - Strict checks. Render "—" if missing. No fake 0s.
  const formatVal = (v: number | null) => (v === null ? '—' : String(Math.round(v)));
  const formatTsbVal = (v: number | null) => {
    if (v === null) return '—';
    const num = Math.round(v);
    return num > 0 ? `+${num}` : String(num);
  };
  const formatRampRateVal = (v: number | null) => {
    if (v === null) return '—';
    const num = Math.round(v * 10) / 10;
    return num > 0 ? `+${num}` : String(num);
  };

  // Projection simulation logic
  const lambdaCtl = Math.exp(-1 / 42); // 42-day time constant for CTL
  const lambdaAtl = Math.exp(-1 / 7);  // 7-day time constant for ATL

  // Start projection from latest actual metrics, fallback to nominal clean baseline if empty
  const startCtl = latestFitness !== null ? latestFitness : 40;
  const startAtl = latestFatigue !== null ? latestFatigue : 45;

  const simulatedData: any[] = [];
  let currentCtl = startCtl;
  let currentAtl = startAtl;

  const baseDate = latestLoad?.date ? new Date(latestLoad.date) : new Date();

  for (let i = 1; i <= planDays; i++) {
    const simDate = new Date(baseDate.getTime() + i * 24 * 3600 * 1000);
    const dateStr = simDate.toISOString().split('T')[0];
    const shortDate = simDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

    currentCtl = currentCtl * lambdaCtl + planDailyLoad * (1 - lambdaCtl);
    currentAtl = currentAtl * lambdaAtl + planDailyLoad * (1 - lambdaAtl);
    const currentTsb = currentCtl - currentAtl;

    simulatedData.push({
      day: `Day ${i}`,
      shortDate,
      ctl: Math.round(currentCtl * 10) / 10,
      atl: Math.round(currentAtl * 10) / 10,
      tsb: Math.round(currentTsb * 10) / 10,
    });
  }

  // Chart data preparing (Limit to latest 30 days of real entries for clutter-free rendering)
  const chartData = sortedLoadsAsc.slice(-30).map(load => ({
    date: load.date,
    shortDate: new Date(load.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
    CTL: load.fitnessCtl ?? null,
    ATL: load.fatigueAtl ?? null,
    TSB: load.formTsb ?? null,
  }));

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col p-6 sm:p-8 font-sans">
      <div className="max-w-[1400px] w-full mx-auto space-y-8">

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
              <TrendingUp className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-xl font-bold uppercase tracking-wide text-white leading-none font-mono">Training Load</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Analyze structural Aerobic Conditioning, Short-Term Fatigue, and Stress Balances
            </p>
          </div>
        </div>

        {/* 1. TRAINING LOAD OVERVIEW */}
        <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8 space-y-6">
          <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Training Load Overview</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FITNESS CTL</span>
              <div className="font-mono text-3xl font-bold text-white">
                {formatVal(latestFitness)} <span className="text-xs text-zinc-500 font-semibold">ms</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium block">42-day rolling stress</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FATIGUE ATL</span>
              <div className="font-mono text-3xl font-bold text-white">
                {formatVal(latestFatigue)} <span className="text-xs text-zinc-500 font-semibold">ms</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium block">7-day acute fatigue</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FORM TSB</span>
              <div className={`font-mono text-3xl font-bold ${latestForm !== null && latestForm >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatTsbVal(latestForm)} <span className="text-xs text-zinc-500 font-semibold">ms</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium block">Stress training balance</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">7-DAY LOAD</span>
              <div className="font-mono text-3xl font-bold text-zinc-300">
                {formatVal(sevenDayLoadSum)} <span className="text-xs text-zinc-500 font-semibold">TSS</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium block">Acute weekly strain sum</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">28-DAY LOAD</span>
              <div className="font-mono text-3xl font-bold text-zinc-300">
                {formatVal(twentyEightDayLoadSum)} <span className="text-xs text-zinc-500 font-semibold">TSS</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium block">Chronic monthly strain sum</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">RAMP RATE</span>
              <div className={`font-mono text-3xl font-bold ${latestRampRate !== null && latestRampRate >= 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {formatRampRateVal(latestRampRate)} <span className="text-xs text-zinc-500 font-semibold">/wk</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium block">Weekly fitness trend</span>
            </div>
          </div>
        </div>

        {/* 2. PERFORMANCE MANAGEMENT CHART (PMC) */}
        <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
          <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-6">Performance Management Chart</h2>
          
          {!hasData ? (
            <div className="h-72 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-center space-y-4 p-8">
              <Database className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-400 font-semibold uppercase font-mono">Real training load unpopulated</p>
              <p className="text-xs text-zinc-500 max-w-sm leading-relaxed uppercase">
                Connect and sync Intervals.icu training load parameters inside Settings to unlock PMC.
              </p>
            </div>
          ) : !showPMCChart ? (
            <div className="h-72 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-center space-y-3 p-8">
              <Info className="w-8 h-8 text-yellow-500/80" />
              <p className="text-sm text-zinc-400 font-semibold">More load data is required to show this chart</p>
              <p className="text-xs text-zinc-500 max-w-sm">Requires at least 7 synced historical training days.</p>
            </div>
          ) : (
            <div className="h-80 md:h-96 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="shortDate" 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: '12px' }}
                    itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <Line 
                    type="monotone" 
                    dataKey="CTL" 
                    name="Fitness (CTL)"
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ATL" 
                    name="Fatigue (ATL)"
                    stroke="#f59e0b" 
                    strokeWidth={1.5} 
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="TSB" 
                    name="Form (TSB)"
                    stroke="#10b981" 
                    strokeWidth={1.5} 
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 2.5 UPCOMING PLANNED WORKOUTS */}
        <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">Upcoming Planned Workouts</h2>
            <p className="text-xs text-zinc-400 font-semibold uppercase">Calendar sessions synced securely from Intervals.icu</p>
          </div>

          {plannedWorkouts.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-lg p-12 text-center text-zinc-500 uppercase font-mono text-xs max-w-none">
              ⚠️ No planned workouts found in Intervals.icu. Sync calendar events in Settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plannedWorkouts.slice(0, 6).map((workout) => {
                const hrs = Math.floor((workout.durationSeconds || 0) / 3600);
                const mins = Math.round(((workout.durationSeconds || 0) % 3600) / 60);
                const durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
                const distKm = workout.distanceMeters ? `${(workout.distanceMeters / 1000).toFixed(1)} km` : '';

                return (
                  <div key={workout.id} className="border border-white/5 bg-zinc-950/25 p-5 rounded-lg space-y-3 relative flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="px-2 py-0.5 border border-[#FC5200]/30 bg-[#FC5200]/5 text-[#FC5200] font-bold rounded uppercase">
                          {workout.type || 'Workout'}
                        </span>
                        <span className="text-zinc-500 font-semibold uppercase">
                          {workout.scheduledDate}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-normal line-clamp-2">
                        {workout.name}
                      </h3>

                      {workout.description && (
                        <p className="text-xs text-zinc-400 font-medium font-mono line-clamp-3 leading-relaxed uppercase">
                          {workout.description}
                        </p>
                      )}
                    </div>

                    {(workout.durationSeconds || workout.distanceMeters) && (
                      <div className="pt-2 border-t border-white/5 flex gap-4 text-[11px] font-mono font-bold text-zinc-400">
                        {workout.durationSeconds > 0 && (
                          <span>TIME: {durationStr}</span>
                        )}
                        {workout.distanceMeters > 0 && (
                          <span>DIST: {distKm}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. PROJECTION SIMULATOR */}
        <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FC5200]" />
                <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Projection Simulator</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-semibold uppercase">
                Simulate custom stress response scenarios under ideal target workloads
              </p>
            </div>
            <span className="px-3 py-1 bg-[#FC5200]/10 border border-[#FC5200]/20 text-[#FC5200] text-[10px] font-bold uppercase rounded tracking-wider">
              SIMULATION MODULE
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6 bg-zinc-900/50 p-6 rounded-lg border border-white/5">
              <h3 className="text-xs text-zinc-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#FC5200]" /> Simulation Variables
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold uppercase mb-2">
                    <span className="text-zinc-400">Planned Daily Load</span>
                    <span className="text-[#FC5200] font-mono">{planDailyLoad} TSS</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="200" 
                    value={planDailyLoad}
                    onChange={(e) => setPlanDailyLoad(parseInt(e.target.value))}
                    className="w-full accent-[#FC5200] bg-zinc-800"
                  />
                  <span className="text-[10px] text-zinc-500 font-medium block mt-1">Average training stress points completed daily.</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold uppercase mb-2">
                    <span className="text-zinc-400">Days to Simulate</span>
                    <span className="text-[#FC5200] font-mono">{planDays} Days</span>
                  </div>
                  <input 
                    type="range" 
                    min="7" 
                    max="90" 
                    value={planDays}
                    onChange={(e) => setPlanDays(parseInt(e.target.value))}
                    className="w-full accent-[#FC5200] bg-zinc-800"
                  />
                  <span className="text-[10px] text-zinc-500 font-medium block mt-1">Simulation duration (prediction horizon).</span>
                </div>
              </div>

              <div className="p-4 bg-[#FC5200]/5 border border-[#FC5200]/10 rounded text-xs text-zinc-400 leading-relaxed font-semibold uppercase">
                ⚠️ Simulation outputs represent mathematical projections only. They do not represent real historical records or synced biometric data.
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Projected Trend</h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={simulatedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="shortDate" 
                      stroke="#52525b" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#52525b" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: '12px' }}
                      itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                      labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                    <Line 
                      type="monotone" 
                      dataKey="ctl" 
                      name="Projected Fitness (CTL)" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="atl" 
                      name="Projected Fatigue (ATL)" 
                      stroke="#f59e0b" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tsb" 
                      name="Projected Form (TSB)" 
                      stroke="#10b981" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 4. EXPLANATION CARDS */}
        <div className="space-y-4">
          <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">The PMC Metric Guide</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Award className="w-5 h-5" />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider">Fitness (CTL)</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed uppercase font-semibold">
                Chronic Training Load represents long-term aerobic preparedness. Modelled using an exponentially weighted rolling average of your daily load score over a 42-day window, CTL reflects permanent cardiovascular and muscular adaptations.
              </p>
            </div>

            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-yellow-500">
                <Flame className="w-5 h-5" />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider">Fatigue (ATL)</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed uppercase font-semibold">
                Acute Training Load models short-term systemic fatigue. Computed by averaging workload scores over a rapid 7-day period, high ATL levels indicate high physical strain, which temporarily suppresses athletic ability despite high fitness.
              </p>
            </div>

            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Activity className="w-5 h-5" />
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider">Form (TSB)</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed uppercase font-semibold">
                Training Stress Balance calculates current form and readiness (CTL - ATL). Postive values (&gt;0) show freshness and peak state, while overly negative values (&lt;-20) warn of systemic overload and high injury vectors.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
