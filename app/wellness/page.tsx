'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { DataRequiredState } from '../../components/common/DataRequiredState';
import { 
  ArrowLeft, 
  RefreshCw, 
  Database,
  Activity,
  Plus,
  Heart,
  Check,
  AlertCircle,
  Calendar,
  LucideIcon
} from 'lucide-react';
import { getWellnessLogs, getDailyLoads, upsertWellnessLog } from '../../lib/firebase/firestore';
import { DailyWellnessLog, DailyTrainingLoad } from '../../data/types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export default function WellnessPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [dailyLoads, setDailyLoads] = useState<DailyTrainingLoad[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Log Form State
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formSleep, setFormSleep] = useState<number>(8.0);
  const [formSleepQuality, setFormSleepQuality] = useState<number>(80);
  const [formSoreness, setFormSoreness] = useState<number>(2);
  const [formFatigue, setFormFatigue] = useState<number>(2);
  const [formStress, setFormStress] = useState<number>(1);
  const [formMood, setFormMood] = useState<number>(4);
  const [formRhr, setFormRhr] = useState<number>(60);
  const [formHrv, setFormHrv] = useState<number>(55);
  const [formRpe, setFormRpe] = useState<number>(5);
  const [formNotes, setFormNotes] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    if (!user) return;
    try {
      const [logs, loads] = await Promise.all([
        getWellnessLogs(user.uid),
        getDailyLoads(user.uid)
      ]);
      setWellnessLogs(logs.sort((a, b) => b.date.localeCompare(a.date)));
      setDailyLoads(loads.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (e) {
      console.error('Failed to load wellness or daily load data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  // Handle Manual Log Submission
  const handleManualLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await upsertWellnessLog({
        userId: user.uid,
        date: formDate,
        source: 'manual',
        sleepDurationHours: Number(formSleep),
        sleepQuality: Number(formSleepQuality),
        soreness: Number(formSoreness),
        fatigue: Number(formFatigue),
        stress: Number(formStress),
        mood: Number(formMood),
        restingHeartRate: formRhr ? Number(formRhr) : null,
        hrvRmssd: formHrv ? Number(formHrv) : null,
        notes: formNotes || null,
        raw: {
          rpe: Number(formRpe)
        },
        updatedAt: new Date().toISOString()
      });
      setSuccessMsg('Journal entry saved successfully!');
      setFormNotes('');
      // Reload current data
      await loadData();
    } catch (err: any) {
      console.error('Error saving manual wellness log:', err);
      setErrorMsg('Failed to save manual log details.');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Loading Wellness & Recovery...</span>
      </div>
    );
  }

  const latestLoad = dailyLoads[0];
  const latestWellness = wellnessLogs[0];

  // 1. READINESS score inputs and calculation
  const tsbVal = latestLoad?.formTsb ?? null;
  const hrvVal = latestWellness?.hrvRmssd ?? null;
  const rhrVal = latestWellness?.restingHeartRate ?? null;
  const sleepVal = latestWellness?.sleepDurationHours ?? null;
  const fatigueVal = latestWellness?.fatigue ?? null;
  const sorenessVal = latestWellness?.soreness ?? null;
  const stressVal = latestWellness?.stress ?? null;
  const moodVal = latestWellness?.mood ?? null;

  const hasTsb = tsbVal !== null;
  const hasHrv = hrvVal !== null;
  const hasRhr = rhrVal !== null;
  const hasSleep = sleepVal !== null;
  const hasSubjective = fatigueVal !== null && sorenessVal !== null && stressVal !== null && moodVal !== null;

  const presentItemsCount = 
    (hasTsb ? 1 : 0) + 
    (hasHrv ? 1 : 0) + 
    (hasRhr ? 1 : 0) + 
    (hasSleep ? 1 : 0) + 
    (hasSubjective ? 1 : 0);

  // Calculate deterministic score
  let readinessScore: number | null = null;
  let isEstimated = false;

  let tsbScoreContribution: number | null = null;
  let hrvScoreContribution: number | null = null;
  let rhrScoreContribution: number | null = null;
  let sleepScoreContribution: number | null = null;
  let subjectiveScoreContribution: number | null = null;

  if (presentItemsCount >= 2) {
    let weightedSum = 0;
    let weightTotal = 0;

    if (hasTsb) {
      if (tsbVal! >= 5 && tsbVal! <= 15) {
        tsbScoreContribution = 100;
      } else if (tsbVal! > 15) {
        tsbScoreContribution = Math.max(70, Math.min(100, 100 - (tsbVal! - 15) * 1.5));
      } else {
        tsbScoreContribution = Math.max(10, Math.min(100, 80 + tsbVal! * 2.0));
      }
      weightedSum += tsbScoreContribution * 0.35;
      weightTotal += 0.35;
    }

    if (hasHrv) {
      if (hrvVal! >= 70) {
        hrvScoreContribution = 100;
      } else if (hrvVal! <= 25) {
        hrvScoreContribution = 20;
      } else {
        hrvScoreContribution = Math.max(20, Math.min(100, 20 + (hrvVal! - 25) * 1.77));
      }
      weightedSum += hrvScoreContribution * 0.25;
      weightTotal += 0.25;
    }

    if (hasRhr) {
      if (rhrVal! <= 52) {
        rhrScoreContribution = 100;
      } else if (rhrVal! >= 80) {
        rhrScoreContribution = 15;
      } else {
        rhrScoreContribution = Math.max(15, Math.min(100, 100 - (rhrVal! - 52) * 3));
      }
      weightedSum += rhrScoreContribution * 0.15;
      weightTotal += 0.15;
    }

    if (hasSleep) {
      if (sleepVal! >= 8.2) {
        sleepScoreContribution = 100;
      } else if (sleepVal! <= 5) {
        sleepScoreContribution = 20;
      } else {
        sleepScoreContribution = Math.max(20, Math.min(100, 20 + (sleepVal! - 5) * 25));
      }
      weightedSum += sleepScoreContribution * 0.15;
      weightTotal += 0.15;
    }

    if (hasSubjective) {
      const fatigueComp = (6 - fatigueVal!) * 20; // 1 -> 100, 5 -> 20
      const sorenessComp = (6 - sorenessVal!) * 20;
      const stressComp = (6 - stressVal!) * 20;
      const moodComp = moodVal! * 20; // 5 -> 100, 1 -> 20
      subjectiveScoreContribution = (fatigueComp + sorenessComp + stressComp + moodComp) / 4;
      
      weightedSum += subjectiveScoreContribution * 0.10;
      weightTotal += 0.10;
    }

    readinessScore = Math.round(weightedSum / weightTotal);
    if (presentItemsCount < 5) {
      isEstimated = true;
    }
  }

  // 2. Training Load vs Recovery Chart builders
  const allDatesSet = new Set<string>();
  dailyLoads.forEach(l => allDatesSet.add(l.date));
  wellnessLogs.forEach(w => allDatesSet.add(w.date));
  const sortedDates = Array.from(allDatesSet).sort((a, b) => a.localeCompare(b));
  
  // Slice to last 14 days for the chart to compare dynamic load vs HRV recovery line
  const last14Dates = sortedDates.slice(-14);
  const chartData = last14Dates.map(dateStr => {
    const load = dailyLoads.find(l => l.date === dateStr);
    const wellness = wellnessLogs.find(w => w.date === dateStr);
    return {
      date: dateStr,
      shortDate: new Date(dateStr).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      trainingLoad: load?.trainingLoad ?? null,
      hrv: wellness?.hrvRmssd ?? null
    };
  });

  const chartHasData = chartData.some(d => d.trainingLoad !== null || d.hrv !== null);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-[1400px] w-full mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-xl font-bold uppercase tracking-wide text-white leading-none font-mono">Wellness & Recovery</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
                Deterministic readiness, manual journals, and biometric correlation
              </p>
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 uppercase font-mono bg-zinc-800/50 px-3 py-1.5 rounded border border-white/5 font-semibold">
            WELLNESS LOG
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: CURRENT READINESS (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-6">Current Readiness</h2>
                
                {readinessScore !== null ? (
                  <div className="flex flex-col items-center justify-center space-y-6 py-6 border-b border-white/5">
                    <div className="relative">
                      <div className="w-40 h-40 rounded-full border-[8px] border-zinc-800 flex flex-col items-center justify-center">
                        <span className="font-mono text-5xl font-bold text-white tracking-tighter">{readinessScore}</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">/ 100</span>
                      </div>
                      <svg className="absolute top-0 left-0 w-40 h-40 transform -rotate-90 pointer-events-none">
                        <circle 
                          cx="80" 
                          cy="80" 
                          r="76" 
                          fill="none" 
                          stroke={readinessScore > 75 ? '#34d399' : readinessScore > 40 ? '#facc15' : '#ef4444'} 
                          strokeWidth="8" 
                          strokeDasharray="477.5"
                          strokeDashoffset={477.5 - (477.5 * readinessScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-white uppercase tracking-wide leading-none">
                        {readinessScore > 75 ? 'Optimal Readiness' : readinessScore > 40 ? 'Moderate Readiness' : 'Low Readiness'}
                      </h3>
                      {isEstimated ? (
                        <span className="inline-block mt-2.5 px-2.5 py-1 bg-yellow-500/15 border border-yellow-500/35 text-yellow-500 text-[9px] uppercase font-bold tracking-wider rounded">
                          Estimated score (Partial metrics)
                        </span>
                      ) : (
                        <span className="inline-block mt-2.5 px-2.5 py-1 bg-green-500/15 border border-green-500/35 text-green-400 text-[9px] uppercase font-bold tracking-wider rounded">
                          Fullydetermined score
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 border-b border-white/5">
                    <DataRequiredState requirementId="WELLNESS_REQUIRED" customDescription="Not enough data to calculate readiness. Requires at least 2 of the primary biometric or load components below." />
                  </div>
                )}
              </div>

              {/* READINESS REQUIREMENTS CHECKLIST */}
              <div className="mt-6 space-y-4">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Readiness Formula Parameters</span>
                <div className="space-y-3">
                  {/* Parameter 1: TSB */}
                  <div className="flex items-start justify-between text-xs p-2.5 bg-[#0a0a0c] border border-white/5 rounded">
                    <div>
                      <div className="font-bold text-zinc-300">Training Stress Balance (TSB)</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Cardiovascular form balance</div>
                    </div>
                    <div className="text-right">
                      {hasTsb ? (
                        <div>
                          <span className="text-green-400 font-bold">✓ Logged</span>
                          <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">{tsbVal! > 0 ? `+${tsbVal}` : tsbVal} form</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-zinc-500 font-semibold">✗ Missing</span>
                          <span className="text-[8px] text-zinc-600 font-bold uppercase block mt-0.5">Sync load logs</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parameter 2: HRV */}
                  <div className="flex items-start justify-between text-xs p-2.5 bg-[#0a0a0c] border border-white/5 rounded">
                    <div>
                      <div className="font-bold text-zinc-300">Autonomic Health (HRV RMSSD)</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Parasympathetic nervous recovery</div>
                    </div>
                    <div className="text-right">
                      {hasHrv ? (
                        <div>
                          <span className="text-green-400 font-bold">✓ Logged</span>
                          <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">{Math.round(hrvVal!)} ms</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-zinc-500 font-semibold">✗ Missing</span>
                          <span className="text-[8px] text-zinc-600 font-bold uppercase block mt-0.5">Log manually or sync</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parameter 3: Resting HR */}
                  <div className="flex items-start justify-between text-xs p-2.5 bg-[#0a0a0c] border border-white/5 rounded">
                    <div>
                      <div className="font-bold text-zinc-300">Resting Heart Rate (RHR)</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Waking autonomic cardiac pulse</div>
                    </div>
                    <div className="text-right">
                      {hasRhr ? (
                        <div>
                          <span className="text-green-400 font-bold">✓ Logged</span>
                          <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">{Math.round(rhrVal!)} bpm</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-zinc-500 font-semibold">✗ Missing</span>
                          <span className="text-[8px] text-zinc-600 font-bold uppercase block mt-0.5">Log manually or sync</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parameter 4: Sleep duration */}
                  <div className="flex items-start justify-between text-xs p-2.5 bg-[#0a0a0c] border border-white/5 rounded">
                    <div>
                      <div className="font-bold text-zinc-300">Sleep Duration hours</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Physical restoration time</div>
                    </div>
                    <div className="text-right">
                      {hasSleep ? (
                        <div>
                          <span className="text-green-400 font-bold">✓ Logged</span>
                          <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">{sleepVal!} hrs</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-zinc-500 font-semibold">✗ Missing</span>
                          <span className="text-[8px] text-zinc-600 font-bold uppercase block mt-0.5">Log sleep metrics</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parameter 5: Subjective ratings */}
                  <div className="flex items-start justify-between text-xs p-2.5 bg-[#0a0a0c] border border-white/5 rounded">
                    <div>
                      <div className="font-bold text-zinc-300">Subjective Muscle & Stress</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">Soreness, fatigue, mood, stress</div>
                    </div>
                    <div className="text-right">
                      {hasSubjective ? (
                        <div>
                          <span className="text-green-400 font-bold">✓ Logged</span>
                          <span className="font-mono text-[10px] text-zinc-400 block mt-0.5">Average logged</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-zinc-500 font-semibold">✗ Missing</span>
                          <span className="text-[8px] text-zinc-600 font-bold uppercase block mt-0.5">Log journal details</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: CHARTS, METRICS & MANUAL ENTRY (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 2. TRAINING LOAD VS RECOVERY CHART */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
               <div className="flex items-center justify-between gap-4 mb-6">
                 <div>
                   <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Training Load vs Recovery</h2>
                   <p className="text-[10px] text-zinc-400 mt-1 uppercase">Correlating daily training stress (bars) with RMSSD recovery (line)</p>
                 </div>
                 <div className="flex items-center gap-4 text-[10px] font-semibold text-zinc-500 uppercase">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-zinc-700/80 rounded" />
                      <span>Training Load</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-[#FC5200]" />
                      <span>HRV RMSSD</span>
                    </div>
                 </div>
               </div>

               {chartHasData ? (
                 <div className="h-64 sm:h-72 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                       <XAxis 
                         dataKey="shortDate" 
                         stroke="#52525b" 
                         fontSize={10} 
                         tickLine={false}
                         axisLine={false}
                         tickMargin={10}
                       />
                       <YAxis 
                         yAxisId="load" 
                         stroke="#52525b" 
                         fontSize={10} 
                         tickLine={false}
                         axisLine={false}
                       />
                       <YAxis 
                         yAxisId="hrv" 
                         orientation="right" 
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
                       <Bar 
                          dataKey="trainingLoad" 
                          yAxisId="load" 
                          name="Daily Load" 
                          radius={[3, 3, 0, 0]}
                       >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.trainingLoad && entry.trainingLoad > 0 ? '#3f3f46' : 'transparent'} />
                          ))}
                       </Bar>
                       <Line 
                         type="monotone" 
                         dataKey="hrv" 
                         yAxisId="hrv" 
                         name="HRV (RMSSD)"
                         stroke="#FC5200" 
                         strokeWidth={2} 
                         dot={{ r: 4, fill: '#111113', stroke: '#FC5200', strokeWidth: 2 }} 
                         activeDot={{ r: 6, fill: '#FC5200', stroke: '#111113' }}
                         connectNulls
                       />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="h-64 border border-dashed border-white/10 rounded flex flex-col items-center justify-center text-zinc-500 text-xs p-6 text-center space-y-2">
                   <Database className="w-8 h-8 text-zinc-600" />
                   <p className="font-semibold text-zinc-400">Recovery trends are empty</p>
                   <p className="max-w-xs text-[11px]">Connect and sync Intervals.icu load data and wellness logs, or log your wellness manually down below to populate recovery plots.</p>
                 </div>
               )}
            </div>

            {/* 3. LATEST WELLNESS METRICS */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
               <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-6">Latest Wellness Metrics</h2>
               
               <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                 <div className="p-3 bg-[#0a0a0c] border border-white/5 rounded">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Sleep</span>
                   <span className="font-mono text-lg font-bold text-white block mt-1">
                     {latestWellness?.sleepDurationHours ? `${latestWellness.sleepDurationHours}h` : '—'}
                   </span>
                   {latestWellness?.sleepQuality ? (
                     <span className="text-[9px] text-zinc-500 block font-semibold">{latestWellness.sleepQuality}% qual</span>
                   ) : null}
                 </div>
                 
                 <div className="p-3 bg-[#0a0a0c] border border-white/5 rounded">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Resting HR</span>
                   <span className="font-mono text-lg font-bold text-zinc-300 block mt-1">
                     {latestWellness?.restingHeartRate ? `${latestWellness.restingHeartRate} bpm` : '—'}
                   </span>
                 </div>
                 
                 <div className="p-3 bg-[#0a0a0c] border border-white/5 rounded">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">HRV</span>
                   <span className="font-mono text-lg font-bold text-[#FC5200] block mt-1">
                     {latestWellness?.hrvRmssd ? `${Math.round(latestWellness.hrvRmssd)} ms` : '—'}
                   </span>
                 </div>
                 
                 <div className="p-3 bg-[#0a0a0c] border border-white/5 rounded">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Fatigue</span>
                   <span className="font-mono text-lg font-bold text-white block mt-1">
                     {latestWellness?.fatigue !== undefined && latestWellness?.fatigue !== null ? `${latestWellness.fatigue}/5` : '—'}
                   </span>
                 </div>
                 
                 <div className="p-3 bg-[#0a0a0c] border border-white/5 rounded">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Soreness</span>
                   <span className="font-mono text-lg font-bold text-white block mt-1">
                     {latestWellness?.soreness !== undefined && latestWellness?.soreness !== null ? `${latestWellness.soreness}/5` : '—'}
                   </span>
                 </div>
                 
                 <div className="p-3 bg-[#0a0a0c] border border-white/5 rounded">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Stress</span>
                   <span className="font-mono text-lg font-bold text-white block mt-1">
                     {latestWellness?.stress !== undefined && latestWellness?.stress !== null ? `${latestWellness.stress}/5` : '—'}
                   </span>
                 </div>
                 
                 <div className="p-3 bg-[#0a0a0c] border border-white/5 rounded">
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Mood</span>
                   <span className="font-mono text-lg font-bold text-white block mt-1">
                     {latestWellness?.mood !== undefined && latestWellness?.mood !== null ? `${latestWellness.mood}/5` : '—'}
                   </span>
                 </div>
               </div>
               
               {latestWellness && (
                 <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-x-6 gap-y-2 items-center text-[10px] text-zinc-500 uppercase font-semibold">
                    <span>Last Synced Date: <span className="text-zinc-300 font-mono">{latestWellness.date}</span></span>
                    <span>Log Source: <span className="text-zinc-300">{latestWellness.source === 'manual' ? 'Manual wellness entry' : 'Intervals.icu sync'}</span></span>
                    {latestWellness.notes && (
                      <div className="w-full text-[10px] text-zinc-400 font-normal italic mt-2 py-2 border-t border-dashed border-white/5">
                        &ldquo;{latestWellness.notes}&rdquo;
                      </div>
                    )}
                 </div>
               )}
            </div>

            {/* 4. MANUAL WELLNESS JOURNAL LOG */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
              <div>
                <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Manual Wellness Log</h2>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold text-[#FC5200]">
                  Adds custom entries directly to local journal (marked with source: &ldquo;manual&rdquo;)
                </p>
              </div>

              <form onSubmit={handleManualLogSubmit} className="mt-6 space-y-6">
                
                {/* DATE SELECTOR */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block">Log Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>

                  {/* Sleep Hrs */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block">Sleep duration (hrs)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min="1"
                      max="24"
                      value={formSleep}
                      onChange={(e) => setFormSleep(parseFloat(e.target.value) || 8.0)}
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>

                  {/* Sleep Quality */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block">Sleep quality (0-100%)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={formSleepQuality}
                      onChange={(e) => setFormSleepQuality(parseInt(e.target.value) || 80)}
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>
                </div>

                {/* HEART STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block">Resting Heart Rate (bpm)</label>
                    <input
                      type="number"
                      min="30"
                      max="150"
                      value={formRhr === 0 ? '' : formRhr}
                      placeholder="Optional"
                      onChange={(e) => setFormRhr(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block">HRV RMSSD (ms)</label>
                    <input
                      type="number"
                      min="10"
                      max="250"
                      value={formHrv === 0 ? '' : formHrv}
                      placeholder="Optional"
                      onChange={(e) => setFormHrv(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block">Daily Feel RPE (1-10)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      value={formRpe}
                      onChange={(e) => setFormRpe(parseInt(e.target.value) || 5)}
                      className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded font-mono"
                    />
                  </div>
                </div>

                {/* SLIDERS FOR SORENESS, FATIGUE, STRESS, MOOD */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 border-t border-white/5 pt-4">
                  
                  {/* Fatigue Slider (1-5 where 1 is optimal, 5 is dead) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                      <span className="text-zinc-400">Fatigue</span>
                      <span className="text-white font-mono">{formFatigue} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formFatigue}
                      onChange={(e) => setFormFatigue(parseInt(e.target.value))}
                      className="w-full accent-[#FC5200] bg-zinc-800 h-1 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-500 uppercase font-semibold">
                      <span>1: Fresh</span>
                      <span>5: Exh</span>
                    </div>
                  </div>

                  {/* Soreness Slider (1-5 where 1 is optimal, 5 is extreme sore) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                      <span className="text-zinc-400">Soreness</span>
                      <span className="text-white font-mono">{formSoreness} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formSoreness}
                      onChange={(e) => setFormSoreness(parseInt(e.target.value))}
                      className="w-full accent-[#FC5200] bg-zinc-800 h-1 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-500 uppercase font-semibold">
                      <span>1: None</span>
                      <span>5: Sore</span>
                    </div>
                  </div>

                  {/* Stress Slider (1-5 where 1 is optimal, 5 is stress) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                      <span className="text-zinc-400">Stress</span>
                      <span className="text-white font-mono">{formStress} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formStress}
                      onChange={(e) => setFormStress(parseInt(e.target.value))}
                      className="w-full accent-[#FC5200] bg-zinc-800 h-1 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-500 uppercase font-semibold">
                      <span>1: Calm</span>
                      <span>5: Stressed</span>
                    </div>
                  </div>

                  {/* Mood Slider (1-5 where 5 is best) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                      <span className="text-zinc-400">Mood</span>
                      <span className="text-white font-mono">{formMood} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formMood}
                      onChange={(e) => setFormMood(parseInt(e.target.value))}
                      className="w-full accent-[#FC5200] bg-zinc-800 h-1 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-500 uppercase font-semibold">
                      <span>1: Poor</span>
                      <span>5: Elated</span>
                    </div>
                  </div>

                </div>

                {/* NOTES */}
                <div className="space-y-1.5 border-t border-white/5 pt-4">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold block">Journal Notes & Feelings</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Describe how your body feels today..."
                    className="w-full bg-[#0a0a0c] border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded resize-none"
                  />
                </div>

                {/* SAVE ALERTS */}
                {successMsg && (
                  <div className="bg-emerald-950/20 border border-emerald-900/50 p-3 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" /> {successMsg}
                  </div>
                )}
                
                {errorMsg && (
                  <div className="bg-red-950/20 border border-red-900/50 p-3 text-center text-red-500 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800/50 text-black font-bold py-3 rounded text-[11px] select-none cursor-pointer tracking-wider uppercase transition-colors"
                >
                  {submitting ? 'RECONCILING DATABASE JOURNAL...' : 'SAVE MANUAL PHYSICAL LOG (source: "manual")'}
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
