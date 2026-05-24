'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { 
  getActivities, 
  saveActivity, 
  getWellnessLogs,
  getDailyLoads,
  getGearList
} from '../lib/firebase/firestore';
import { CanonicalActivity, DailyWellnessLog, DailyTrainingLoad, CanonicalGear } from '../data/types';
import { 
  formatDistanceKm, 
  formatDuration, 
  formatPace 
} from '../lib/data/dataLaw';
import { 
  Activity, 
  Calculator, 
  Award, 
  Settings, 
  Compass, 
  TrendingUp, 
  Heart, 
  ShieldAlert, 
  Plus, 
  RefreshCw, 
  Database,
  User,
  BookOpen,
  Calendar,
  Layers,
  HeartPulse,
  Brain,
  Sliders,
  Scale,
  Dumbbell,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Info
} from 'lucide-react';
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

interface ShellProps {
  activeTab?: 'dashboard' | 'activities' | 'wellness';
}

export default function TrackStudioShell({ activeTab: initialActiveTab = 'dashboard' }: ShellProps) {
  const router = useRouter();
  const { user, athleteProfile, signOut, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activities' | 'wellness'>(initialActiveTab);
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [dailyLoads, setDailyLoads] = useState<DailyTrainingLoad[]>([]);
  const [gearList, setGearList] = useState<CanonicalGear[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stravaStatus, setStravaStatus] = useState<any>(null);
  const [intervalsStatus, setIntervalsStatus] = useState<any>(null);

  // New activity form state
  const [newName, setNewName] = useState('');
  const [newSport, setNewSport] = useState('run');
  const [newDistanceKm, setNewDistanceKm] = useState('');
  const [newDurationMin, setNewDurationMin] = useState('');
  const [newElevationGain, setNewElevationGain] = useState('');
  const [newHeartRate, setNewHeartRate] = useState('');
  const [newCadence, setNewCadence] = useState('');
  const [newRPE, setNewRPE] = useState('5');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);
  const [activitySuccess, setActivitySuccess] = useState(false);

  async function loadData() {
    if (!user) return;
    try {
      setLoadingData(true);
      const token = await user.getIdToken();
      const [acts, logs, loads, gears, stravaRes, intervalsRes] = await Promise.all([
        getActivities(user.uid),
        getWellnessLogs(user.uid),
        getDailyLoads(user.uid),
        getGearList(user.uid),
        fetch('/api/strava/status', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        fetch('/api/intervals/status', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
      ]);
      setActivities(acts.sort((a, b) => (b.startDateLocal || b.startDate || '').localeCompare(a.startDateLocal || a.startDate || '')));
      setWellnessLogs(logs.sort((a, b) => b.date.localeCompare(a.date)));
      setDailyLoads(loads.sort((a, b) => b.date.localeCompare(a.date)));
      setGearList(gears || []);

      if (stravaRes && stravaRes.ok) setStravaStatus(await stravaRes.json().catch(() => null));
      if (intervalsRes && intervalsRes.ok) setIntervalsStatus(await intervalsRes.json().catch(() => null));
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else {
        loadData();
      }
    }
  }, [user, authLoading]);

  // ACWR calculation parameters
  const calculateAcwrValue = () => {
    if (activities.length === 0) return 0;
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let acuteSum = 0;
    let chronicSum = 0;

    activities.forEach(act => {
      const actDate = new Date(act.startDate);
      const diffDays = (now.getTime() - actDate.getTime()) / oneDayMs;
      const multiplier = act.rpe || 5;
      const durationMins = act.movingTimeSeconds / 60;
      const trainingLoad = durationMins * multiplier;

      if (diffDays >= 0 && diffDays <= 7) acuteSum += trainingLoad;
      if (diffDays >= 0 && diffDays <= 28) chronicSum += trainingLoad;
    });

    const acuteAvg = acuteSum / 7;
    const chronicAvg = chronicSum / 28;
    return chronicAvg > 0 ? parseFloat((acuteAvg / chronicAvg).toFixed(2)) : 0;
  };

  const acwrValue = calculateAcwrValue();

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim() || !newDistanceKm || !newDurationMin) return;
    setSavingActivity(true);
    setActivitySuccess(false);

    try {
      const distanceMeters = parseFloat(newDistanceKm) * 1000;
      const durationSeconds = parseFloat(newDurationMin) * 60;

      await saveActivity(user.uid, {
        name: newName.trim(),
        sportType: newSport,
        distanceMeters,
        movingTimeSeconds: durationSeconds,
        elapsedTimeSeconds: durationSeconds,
        startDate: newDate + 'T12:00:00Z',
        averageHeartRate: newHeartRate ? parseInt(newHeartRate) : undefined,
        elevationGainMeters: newElevationGain ? parseFloat(newElevationGain) : undefined,
        cadenceAvg: newCadence ? parseInt(newCadence) : undefined,
        rpe: parseInt(newRPE),
        hasGps: true,
        notes: newNotes.trim() || undefined
      });

      setNewName('');
      setNewDistanceKm('');
      setNewDurationMin('');
      setNewElevationGain('');
      setNewHeartRate('');
      setNewCadence('');
      setNewNotes('');
      setActivitySuccess(true);
      setTimeout(() => setActivitySuccess(false), 2000);
      await loadData();
    } catch (err) {
      console.error('Failed to save activity:', err);
    } finally {
      setSavingActivity(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide uppercase text-zinc-400">Syncing data...</span>
      </div>
    );
  }

  const handleTabChange = (tab: "dashboard" | "activities" | "wellness") => {
    setActiveTab(tab);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col md:flex-row font-sans">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111113] border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#FC5200] flex items-center justify-center text-black font-bold text-sm">T</div>
          <span className="font-heading text-lg font-bold text-white tracking-wide">TRACK.STUDIO</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="p-2 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FC5200] rounded"
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="mobile-sidebar"
        >
          {sidebarOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside 
        id="mobile-sidebar"
        className={`\
        fixed inset-y-0 left-0 z-40 w-64 bg-[#111113] border-r border-white/10 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 \
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} \
      `}>
        <div className="p-6 border-b border-white/10 hidden md:flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#FC5200] flex items-center justify-center text-black font-bold text-base">T</div>
          <div>
            <span className="font-heading text-lg font-bold text-white tracking-wide block leading-none">TRACK.STUDIO</span>
            <span className="text-[10px] text-[#FC5200] uppercase font-bold tracking-wider">V3.0 Dashboard</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">CORE</span>
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard' ? 'bg-[#FC5200]/10 text-[#FC5200]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('activities')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'activities' ? 'bg-[#FC5200]/10 text-[#FC5200]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Activities
            </button>
            <button onClick={() => router.push('/training')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              Training
            </button>
            <button onClick={() => router.push('/workout-library')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              Workout Library
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">ANALYTICS</span>
            <button onClick={() => router.push('/compare-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Compare Activities</button>
            <button onClick={() => router.push('/form-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Running Form</button>
            <button onClick={() => router.push('/course-records')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Course Records</button>
            <button onClick={() => router.push('/best-efforts')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Best Efforts</button>
            <button onClick={() => router.push('/gear-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Gear Tracker</button>
            <button onClick={() => router.push('/trail-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Trail Analysis</button>
            <button onClick={() => router.push('/prediction')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Race Predictor</button>
            <button onClick={() => router.push('/vdot-calculator')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">VDOT Calculator</button>
            <button onClick={() => router.push('/hr-calculator')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Heart Rate Calculator</button>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">WELLNESS</span>
             <button
              onClick={() => router.push('/wellness')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'wellness' ? 'bg-[#FC5200]/10 text-[#FC5200]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Wellness
            </button>
            <button onClick={() => router.push('/hrv-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">HRV Lab</button>
            <button onClick={() => router.push('/morning-check')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Morning Check</button>
            <button onClick={() => router.push('/sleep')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Sleep</button>
            <button onClick={() => router.push('/overtraining-guard')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Overtraining Guard</button>
            <button onClick={() => router.push('/injury-radar')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Injury Risk</button>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">TOOLS</span>
            <button onClick={() => router.push('/reports')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Reports</button>
            <button onClick={() => router.push('/route-art')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Route Art</button>
            <button onClick={() => router.push('/athlete-profile')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Athlete Profile</button>
            <button onClick={() => router.push('/how-to-use')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">How to Use</button>
            <button onClick={() => router.push('/settings')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Settings</button>
            <button onClick={() => router.push('/data-health')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Data Health</button>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-red-900/40"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:w-[calc(100%-16rem)] overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12 space-y-8">

          {/* STALE DATA WARNING BANNER */}
          {(() => {
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const now = Date.now();
            let staleMessages = [];
            
            if (stravaStatus?.connected && stravaStatus?.lastSyncAt) {
              const diff = now - new Date(stravaStatus.lastSyncAt).getTime();
              if (diff > ONE_DAY) staleMessages.push("Strava");
            }
            if (intervalsStatus?.connected && intervalsStatus?.lastSyncAt) {
               const diff = now - new Date(intervalsStatus.lastSyncAt).getTime();
               if (diff > ONE_DAY) staleMessages.push("Intervals.icu");
            }
            if (staleMessages.length === 0) return null;
            return (
              <div className="bg-amber-950/40 border border-amber-900/60 rounded-lg p-3 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2 text-amber-500">
                   <ShieldAlert className="w-4 h-4" />
                   <span className="text-xs uppercase font-bold tracking-wider">Warning: Data is stale ({staleMessages.join(" and ")} last synced over 24h ago).</span>
                </div>
                <button
                  onClick={() => router.push('/settings')}
                  className="bg-amber-950/60 hover:bg-amber-900/60 border border-amber-900/80 text-amber-500 hover:text-amber-400 px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors"
                >
                  Refresh Required
                </button>
              </div>
            );
          })()}

          {/* THREE MAIN SECTION HUD TELEMETRIES (DASHBOARD HUD SUMMARY) */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">

            {(() => {
               const latestLoad = dailyLoads[0];
               const latestWellness = wellnessLogs[0];
               const hasLoadVal = latestLoad?.fitnessCtl !== undefined && latestLoad?.fitnessCtl !== null;
               const hasFatigueVal = latestLoad?.fatigueAtl !== undefined && latestLoad?.fatigueAtl !== null;
               const hasFormVal = latestLoad?.formTsb !== undefined && latestLoad?.formTsb !== null;
               const hasHRV = latestWellness?.hrvRmssd !== undefined && latestWellness?.hrvRmssd !== null;
               const hasWellness = latestWellness?.soreness !== undefined && latestWellness?.soreness !== null;

               // Compute deterministic readiness score
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

               let readinessScore: number | null = null;
               let isEstimated = false;

               if (presentItemsCount >= 2) {
                 let weightedSum = 0;
                 let weightTotal = 0;

                 if (hasTsb) {
                   let tsbScoreContribution = 0;
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
                   let hrvScoreContribution = 0;
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
                   let rhrScoreContribution = 0;
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
                   let sleepScoreContribution = 0;
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
                   const fatigueComp = (6 - fatigueVal!) * 20;
                   const sorenessComp = (6 - sorenessVal!) * 20;
                   const stressComp = (6 - stressVal!) * 20;
                   const moodComp = moodVal! * 20;
                   const subjectiveScoreContribution = (fatigueComp + sorenessComp + stressComp + moodComp) / 4;
                   
                   weightedSum += subjectiveScoreContribution * 0.10;
                   weightTotal += 0.10;
                 }

                 readinessScore = Math.round(weightedSum / weightTotal);
                 if (presentItemsCount < 5) {
                   isEstimated = true;
                 }
               }

               const isIntervalsDataPresent = hasLoadVal || hasFatigueVal || hasFormVal || hasHRV || hasWellness;

               const dashboardTotals = require('../lib/analytics/dashboardAggregation').calculateDashboardTotals(activities, 30);
               
               return (
                 <>
                   {/* 30-DAY DISTANCE */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all col-span-2 lg:col-span-2">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">30-DAY DISTANCE</span>
                     <div className="font-mono text-2xl font-bold tracking-tight text-[#FC5200] mt-1.5">
                       {formatDistanceKm(dashboardTotals.totalDistanceMeters)}
                     </div>
                     <span className="text-zinc-500 text-[10px] uppercase font-mono font-bold mt-1.5 leading-tight">Total mileage summary</span>
                   </div>

                   {/* 30-DAY DURATION */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all col-span-2 lg:col-span-2">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">30-DAY DURATION</span>
                     <div className="font-mono text-2xl font-bold tracking-tight text-white mt-1.5">
                       {formatDuration(dashboardTotals.totalMovingTimeSeconds)}
                     </div>
                     <span className="text-zinc-500 text-[10px] uppercase font-mono font-bold mt-1.5 leading-tight">Active moving time</span>
                   </div>

                   {/* 30-DAY ACTIVITIES */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all col-span-2 lg:col-span-2">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">30-DAY ACTIVITIES</span>
                     <div className="font-mono text-2xl font-bold tracking-tight text-white mt-1.5">
                       {dashboardTotals.totalActivities}
                     </div>
                     <span className="text-zinc-500 text-[10px] uppercase font-mono font-bold mt-1.5 leading-tight">Total logged works</span>
                   </div>

                   {!isIntervalsDataPresent ? (
                     <div className="col-span-2 lg:col-span-6 bg-[#111113] border border-white/10 p-6 rounded-xl text-center space-y-4">
                       <HeartPulse className="w-8 h-8 text-zinc-500 mx-auto" />
                       <p className="text-zinc-400 font-medium text-sm">Connect Intervals.icu to import training load and wellness data.</p>
                       <button
                         onClick={() => router.push('/settings')}
                         className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded transition-colors"
                       >
                         Go to Settings
                       </button>
                     </div>
                   ) : (
                     <>
                       {/* FITNESS CTL */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FITNESS CTL</span>
                     {hasLoadVal ? (
                       <div className="font-mono text-2xl font-bold tracking-tight text-white mt-1.5">
                         {Math.round(latestLoad.fitnessCtl!)}
                       </div>
                     ) : (
                       <div className="text-zinc-500 text-[10px] uppercase font-mono font-bold mt-1.5 leading-tight">Sync Intervals.icu load data</div>
                     )}
                   </div>

                   {/* FATIGUE ATL */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FATIGUE ATL</span>
                     {hasFatigueVal ? (
                       <div className="font-mono text-2xl font-bold tracking-tight text-white mt-1.5">
                         {Math.round(latestLoad.fatigueAtl!)}
                       </div>
                     ) : (
                       <div className="text-zinc-500 text-[10px] uppercase font-mono font-bold mt-1.5 leading-tight">Sync Intervals.icu load data</div>
                     )}
                   </div>

                   {/* FORM TSB */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FORM TSB</span>
                     {hasFormVal ? (
                       <div className="font-mono text-2xl font-bold tracking-tight text-emerald-400 mt-1.5">
                         {latestLoad.formTsb! > 0 ? `+${Math.round(latestLoad.formTsb!)}` : Math.round(latestLoad.formTsb!)}
                       </div>
                     ) : (
                       <div className="text-zinc-500 text-[10px] uppercase font-mono font-bold mt-1.5 leading-tight">Sync Intervals.icu load data</div>
                     )}
                   </div>
                   
                   {/* READINESS */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">READINESS</span>
                     {readinessScore !== null ? (
                       <div className="mt-1.5">
                         <div className="font-mono text-2xl font-bold tracking-tight text-[#FC5200]">
                           {readinessScore}%
                         </div>
                         <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block mt-0.5">
                           {isEstimated ? 'Estimated score' : 'Fully determined'}
                         </span>
                       </div>
                     ) : (
                       <div className="text-zinc-500 text-[10px] uppercase font-mono font-semibold mt-1.5 leading-tight">Not enough data to calculate</div>
                     )}
                   </div>

                   {/* WELLNESS SCORE */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">WELLNESS SCORE</span>
                     {hasWellness ? (
                       <div className="font-mono text-2xl font-bold tracking-tight text-white mt-1.5">
                         {Math.round((latestWellness.soreness || 0) + (latestWellness.fatigue || 0) + (latestWellness.stress || 0) + (latestWellness.mood || 0))}
                       </div>
                     ) : (
                       <div className="text-zinc-500 text-[10px] uppercase font-mono font-semibold mt-1.5 leading-tight">No wellness logs synced</div>
                     )}
                   </div>

                   {/* HRV BASELINE */}
                   <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-white/20 hover:shadow-lg transition-all">
                     <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">HRV (RMSSD)</span>
                     {hasHRV ? (
                       <div className="font-mono text-2xl font-bold tracking-tight text-white mt-1.5">
                         {Math.round(latestWellness.hrvRmssd!)} <span className="text-xs text-zinc-500">ms</span>
                       </div>
                     ) : (
                       <div className="text-zinc-500 text-[10px] uppercase font-mono font-semibold mt-1.5 leading-tight font-bold">No HRV data synced</div>
                     )}
                   </div>
                   </>
                   )}
                 </>
               );

            })()}

          </div>

          {/* ================= TAB 1: THE DASHBOARD (18 SPECIALIST LABORATORIES) ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-fade-in">

              {/* PERFORMANCE MANAGEMENT CHART */}
              <div className="bg-[#111113] border border-white/10 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Performance Management Chart</h2>
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase font-semibold">Real-time physiological modeling (CTL, ATL, TSB)</p>
                  </div>
                </div>

                {dailyLoads.length === 0 ? (
                  <div className="h-64 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-center space-y-4 p-8">
                    <Database className="w-8 h-8 text-zinc-600" />
                    <p className="text-sm text-[#FC5200] font-semibold uppercase font-mono">Real training load unpopulated</p>
                    <p className="text-xs text-zinc-500 max-w-sm leading-relaxed uppercase">
                      Connect and sync Intervals.icu training load parameters inside Settings to unlock PMC.
                    </p>
                  </div>
                ) : dailyLoads.length < 7 ? (
                  <div className="h-64 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-center space-y-3 p-8">
                    <Info className="w-8 h-8 text-yellow-500/80" />
                    <p className="text-sm text-zinc-400 font-semibold uppercase font-mono">More load data is required to show this chart</p>
                    <p className="text-xs text-zinc-500 max-w-sm uppercase font-semibold">Requires at least 7 synced historical training days.</p>
                  </div>
                ) : (
                  <div className="h-64 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={[...dailyLoads].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map(load => ({
                        date: load.date,
                        shortDate: new Date(load.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
                        CTL: load.fitnessCtl ?? null,
                        ATL: load.fatigueAtl ?? null,
                        TSB: load.formTsb ?? null,
                      }))} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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

              {/* GEAR ALERT WIDGET */}
              {(() => {
                if (gearList.length === 0) {
                  return (
                    <div className="bg-[#111113] border border-white/10 p-5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900/50 border border-white/5 text-zinc-400 rounded-lg">
                          <Settings className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-300 font-mono">Gear Status Indicator</h4>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Gear data is not available. Add shoes manually or sync activities with gear information.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => router.push('/gear-lab')} 
                        className="text-xs text-[#FC5200] font-bold uppercase tracking-wider border border-[#FC5200]/30 hover:bg-[#FC5200]/10 px-3 py-1.5 rounded transition cursor-pointer"
                      >
                        Shed Registry
                      </button>
                    </div>
                  );
                }

                // Calculate current distance for each active gear item
                const exceededShoes = gearList.filter(g => {
                  if (g.retired) return false;
                  
                  let distanceKm = 0;
                  if (g.source === 'manual') {
                    distanceKm = (g.manualDistanceMeters || 0) / 1000;
                  } else {
                    if (g.distanceMeters && g.distanceMeters > 0) {
                      distanceKm = g.distanceMeters / 1000;
                    } else {
                      const matchingActivities = activities.filter(act => act.gearId === g.externalId || act.id === g.id);
                      const totalMeters = matchingActivities.reduce((acc, act) => acc + (act.distanceMeters || 0), 0);
                      distanceKm = totalMeters / 1000;
                    }
                  }
                  
                  const thresholdKm = g.replacementThresholdKm || 800;
                  return distanceKm >= thresholdKm;
                });

                if (exceededShoes.length > 0) {
                  return (
                    <div className="bg-red-950/20 border border-red-900/50 p-5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-900/30 text-red-500 rounded-lg">
                          <ShieldAlert className="w-5 h-5 animate-bounce" />
                        </div>
                        <div>
                          <h4 className="text-xs uppercase tracking-wider font-bold text-red-400 font-mono">Footwear Replacement Alert Active</h4>
                          <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed font-sans">
                            Attention: <strong className="text-white">{exceededShoes.map(s => `${s.brand || ''} ${s.name || ''}`.trim()).join(', ')}</strong> has logged cardiovascular mileage exceeding its designated fatigue threshold!
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => router.push('/gear-lab')} 
                        className="text-xs text-red-400 font-bold uppercase tracking-wider border border-red-900/40 hover:bg-red-950/40 px-3 py-1.5 rounded transition shrink-0 ml-4 cursor-pointer"
                      >
                        Open Gear Tracker
                      </button>
                    </div>
                  );
                }

                return null; // Do not show alert if all shoes are below threshold (prevent fake news alerts)
              })()}

              {/* LAB CATEGORY 1 */}
              <div className="space-y-5">
                <div className="border-l-2 border-[#FC5200] pl-4 py-1">
                  <span className="text-[11px] text-[#FC5200] font-semibold tracking-widest uppercase block mb-1">ENDURANCE</span>
                  <h2 className="font-heading text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Endurance Tools</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  
                  <div onClick={() => router.push('/vdot-calculator')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Daniels Model</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">VDOT Calculator</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Calculate VDOT and training paces from a verified race result.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/hr-calculator')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Heart className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Heart Rate</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Heart Rate Zone Calculator</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Set heart rate zones using your resting and maximum heart rate.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/prediction')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Award className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Estimation</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Race Time Predictor</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Estimate race times from your current performance data.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/training')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Load</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Training Load Ratio</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Compare recent training load with your longer-term baseline.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/compare-lab')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Activity className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Analysis</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Workout Comparison</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Compare pace, heart rate, and duration across selected activities.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/best-efforts')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Award className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Records</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Best Efforts</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">View your peak achievements across standard distances.</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* LAB CATEGORY 2 */}
              <div className="space-y-5">
                <div className="border-l-2 border-[#FC5200] pl-4 py-1">
                  <span className="text-[11px] text-[#FC5200] font-semibold tracking-widest uppercase block mb-1">GEAR & FORM</span>
                  <h2 className="font-heading text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Gear and Running Form</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">

                  <div onClick={() => router.push('/gear-lab')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Settings className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Equipment</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Shoe Mileage Tracker</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Track shoe usage and replacement thresholds.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/form-lab')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Sliders className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Form</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Running Form Analysis</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Analyze cadence and running form metrics.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/route-art')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Compass className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Map</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Route Art</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Create visual posters from GPS activity routes.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/trail-lab')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Compass className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Elevation</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Trail & Elevation Analysis</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Analyze elevation gain and grade distribution.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/course-records')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Award className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Segments</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Course Records</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Track your fastest times on specific routes or segments.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/workout-library')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Dumbbell className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Workouts</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Workout Library</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Create and store structured interval sessions with pace targets.</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* LAB CATEGORY 3 */}
              <div className="space-y-5">
                <div className="border-l-2 border-[#FC5200] pl-4 py-1">
                  <span className="text-[11px] text-[#FC5200] font-semibold tracking-widest uppercase block mb-1">RECOVERY</span>
                  <h2 className="font-heading text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Wellness & Recovery</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">

                  <div onClick={() => router.push('/hrv-lab')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <HeartPulse className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">HRV</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">HRV Lab</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Monitor heart rate variability trends.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/sleep')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Brain className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Sleep</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Sleep Analysis</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Track sleep duration and quality over time.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/overtraining-guard')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Guard</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Overtraining Guard</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Monitor physiological metrics for signs of overtraining.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/injury-radar')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Mobility</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Injury Risk</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Track muscle soreness and fatigue.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/reports')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Reports</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Reports</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Generate consolidated performance and volume reports.</p>
                    </div>
                  </div>

                  <div onClick={() => router.push('/how-to-use')} className="bg-[#111113] border border-white/10 hover:border-[#FC5200]/30 p-6 rounded-xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-[#FC5200]/10 text-[#FC5200] rounded-lg group-hover:bg-[#FC5200] group-hover:text-black transition-colors">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase font-semibold text-zinc-300">Help</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">How to Use</h3>
                      <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">Learn about the metrics and calculations used in Track.Studio.</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: ACTIVITIES REGISTRY ================= */}
          {activeTab === 'activities' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
              
              {/* ADD COMPONENT COL */}
              <div className="bg-[#111113] border border-white/10 p-6 md:p-8 rounded-xl h-fit space-y-6">
                <div>
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase mb-1 block">NEW LOG</span>
                  <h2 className="text-lg font-semibold text-white tracking-wide">Log Activity</h2>
                </div>

                <form onSubmit={handleCreateActivity} className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-sm text-zinc-400 font-medium block">Workout Name</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aerobic Base Run"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white rounded-lg transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Sport Type</span>
                      <select
                        value={newSport}
                        onChange={(e) => setNewSport(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white rounded-lg transition-colors"
                      >
                        <option value="run">Running</option>
                        <option value="ride">Cycling</option>
                        <option value="swim">Swimming</option>
                        <option value="other">Other Sport</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Date</span>
                      <input
                        type="date"
                        required
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white rounded-lg transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Distance (km)</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="10.0"
                        value={newDistanceKm}
                        onChange={(e) => setNewDistanceKm(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white font-mono rounded-lg transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Duration (min)</span>
                      <input
                        type="number"
                        step="0.1"
                        required
                        placeholder="50"
                        value={newDurationMin}
                        onChange={(e) => setNewDurationMin(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white font-mono rounded-lg transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Avg HR (bpm)</span>
                      <input
                        type="number"
                        placeholder="150"
                        value={newHeartRate}
                        onChange={(e) => setNewHeartRate(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white font-mono rounded-lg transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Elev Gain (m)</span>
                      <input
                        type="number"
                        placeholder="80"
                        value={newElevationGain}
                        onChange={(e) => setNewElevationGain(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white font-mono rounded-lg transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Cadence (spm)</span>
                      <input
                        type="number"
                        placeholder="175"
                        value={newCadence}
                        onChange={(e) => setNewCadence(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white font-mono rounded-lg transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-sm text-zinc-400 font-medium block">Exertion (RPE)</span>
                      <select
                        value={newRPE}
                        onChange={(e) => setNewRPE(e.target.value)}
                        className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white rounded-lg transition-colors"
                      >
                        <option value="1">1 - Very light active</option>
                        <option value="2">2 - Easy restoration</option>
                        <option value="3">3 - Light aerobic tempo</option>
                        <option value="4">4 - Conversational base pace</option>
                        <option value="5">5 - Adequate endurance base</option>
                        <option value="6">6 - Stiff progressive speed</option>
                        <option value="7">7 - Hard tempo intervals</option>
                        <option value="8">8 - Lactic threshold climbs</option>
                        <option value="9">9 - Ultimate VO2Max intensity</option>
                        <option value="10">10 - Maximal anaerobic limit</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-sm text-zinc-400 font-medium block">Comments</span>
                    <input
                      type="text"
                      placeholder="Notes on conditions or feel"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full bg-[#18181B] border border-white/5 p-3 outline-none focus:border-[#FC5200] text-sm text-white rounded-lg transition-colors"
                    />
                  </div>

                  {activitySuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 text-center text-emerald-400 text-sm font-semibold rounded-lg mt-2">
                      Activity successfully logged.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingActivity}
                    className="w-full bg-[#FC5200] hover:bg-[#e44a00] disabled:opacity-50 text-black font-bold text-sm py-3.5 rounded-lg transition-colors mt-4"
                  >
                    {savingActivity ? 'SAVING...' : 'SAVE ACTIVITY'}
                  </button>
                </form>
              </div>

              {/* RENDER LIST OF WORKOUTS */}
              <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8 xl:col-span-2 space-y-6">
                <div>
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase mb-1 block">ACTIVITY LOG</span>
                  <h2 className="text-lg font-semibold text-white tracking-wide">Recent Activities</h2>
                </div>

                {activities.length > 0 ? (
                  <div className="space-y-4">
                    {activities.map((act) => {
                      const avgPaceSec = act.averagePaceSecPerKm ?? (act.distanceMeters && act.distanceMeters > 0 && act.movingTimeSeconds ? act.movingTimeSeconds / (act.distanceMeters / 1000) : undefined);
                      
                      let displayDate = "Tanggal tidak tersedia";
                      const dateStr = act.startDateLocal || act.startDate;
                      if (dateStr) {
                         const d = new Date(dateStr);
                         if (!isNaN(d.getTime())) {
                            displayDate = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) + ' ' + d.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'});
                         }
                      }
                      
                      const hr = act.averageHeartRate ? Math.round(act.averageHeartRate) + ' bpm' : '—';
                      // Need to check if spm or rpm. Strava sends rpm for cycling, spm (rpm * 2) for running.
                      // Let's just output * 2 for running, or just output the cadence if it's already spm. 
                      // Wait, strava average_cadence is usually RPM (steps per minute / 2), so * 2 for running.
                      const isRun = act.sportType?.toLowerCase() === 'run';
                      const cadenceVal = act.cadenceAvg ? (isRun ? Math.round(act.cadenceAvg * 2) : Math.round(act.cadenceAvg)) : null;
                      const cadence = cadenceVal ? cadenceVal + (isRun ? ' spm' : ' rpm') : '—';
                      
                      const power = act.averageWatts ? Math.round(act.averageWatts) + ' W' : '—';
                      const gpsStatus = act.hasGps ? 'GPS' : 'No GPS / Indoor';
                      
                      let healthColors = 'border-green-900/40 bg-green-950/10 text-green-400';
                      let healthLabel = 'HEALTHY';
                      if (act.dataHealth && act.dataHealth.length > 0) {
                        if (act.dataHealth.includes('partialData')) {
                           healthColors = 'border-yellow-900/40 bg-yellow-950/10 text-yellow-400';
                           healthLabel = 'PARTIAL DATA';
                        }
                        if (act.dataHealth.includes('missingDate') || act.dataHealth.includes('missingDistance') || act.dataHealth.includes('missingMovingTime')) {
                           healthColors = 'border-red-900/40 bg-red-950/10 text-red-400';
                           healthLabel = 'MISSING CRITICAL';
                        }
                      }

                      return (
                        <div key={act.id} className="border border-white/5 bg-[#18181B] p-6 rounded-xl hover:border-white/10 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-xs text-zinc-400 font-medium tracking-wider uppercase block mb-1">{displayDate}</span>
                              <h3 className="text-lg font-semibold text-white tracking-wide">{act.name}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                               <span className="px-2.5 py-1 border border-white/10 bg-white/5 text-zinc-300 text-[11px] uppercase font-bold rounded">
                                 {act.sportType}
                               </span>
                               <span className={`px-2 py-0.5 border text-[9px] uppercase font-bold rounded ${healthColors}`}>
                                 {healthLabel}
                               </span>
                            </div>
                          </div>

                          {/* STATS MATRIX */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#111113] p-4 rounded-lg border border-white/5">
                            <div>
                              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">Distance</span>
                              <span className="font-mono text-lg font-bold text-white">{formatDistanceKm(act.distanceMeters)}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">Duration</span>
                              <span className="font-mono text-lg font-bold text-zinc-300">{formatDuration(act.movingTimeSeconds)}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">Pace</span>
                              <span className="font-mono text-lg font-bold text-zinc-300">{formatPace(avgPaceSec)}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">HR Avg</span>
                              <span className="font-mono text-lg font-bold text-zinc-300">{hr}</span>
                            </div>
                            
                            <div>
                              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">Power Avg</span>
                              <span className="font-mono text-lg font-bold text-zinc-300">{power}</span>
                            </div>
                            <div>
                              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider block mb-1">Cadence</span>
                              <span className="font-mono text-lg font-bold text-zinc-300">{cadence}</span>
                            </div>
                            <div className="col-span-2 flex items-center justify-end">
                               <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                                  {gpsStatus}
                               </span>
                            </div>
                          </div>

                          {act.notes && (
                            <p className="text-sm text-zinc-400 italic mt-4">
                              "{act.notes}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
                    <Database className="w-8 h-8 text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-400">No activities synced yet. Connect Strava and sync your activities.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ================= TAB 3: WELLNESS DIARY ================= */}
          {activeTab === 'wellness' && (
            <div className="space-y-8 animate-fade-in">
              
              <div className="bg-[#111113] border border-white/10 p-6 md:p-8 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase block mb-1">DAILY LOGS</span>
                  <h2 className="text-lg font-semibold text-white tracking-wide">Morning Wellness Checks</h2>
                  <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                    Submit daily morning waking check metrics to build comprehensive sports science recovery models.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/morning-check')}
                  className="shrink-0 flex items-center gap-2 bg-[#FC5200] hover:bg-[#e44a00] text-black text-sm font-bold px-5 py-3 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  NEW SUBMISSION
                </button>
              </div>

              {wellnessLogs.length === 0 ? (
                <div className="border border-white/10 bg-[#111113] rounded-xl p-16 text-center flex flex-col items-center justify-center">
                  <Database className="w-8 h-8 text-zinc-600 mb-3" />
                  <p className="text-sm text-zinc-400">No daily readiness or wellness logs submitted yet.</p>
                </div>
              ) : (
                <div className="border border-white/10 bg-[#111113] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-[#18181B] border-b border-white/10">
                          <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date</th>
                          <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Waking HR</th>
                          <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">HRV RMSSD</th>
                          <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Fatigue (1-5)</th>
                          <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Mobility (1-5)</th>
                          <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Sleep Hrs</th>
                          <th className="p-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Sleep Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {wellnessLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 text-sm font-medium text-white">
                              {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'})}
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm text-zinc-300">{log.restingHeartRate ? `${log.restingHeartRate} bpm` : '—'}</span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm text-zinc-300">{log.hrvRmssd ? `${log.hrvRmssd} ms` : '—'}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-mono text-sm text-zinc-300">{log.fatigue ? `${log.fatigue}` : '—'}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-mono text-sm text-zinc-300">{log.soreness ? `${log.soreness}` : '—'}</span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm text-zinc-300">{log.sleepDurationHours ? `${log.sleepDurationHours}h` : '—'}</span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm text-zinc-300">{log.sleepQuality ? `${log.sleepQuality}%` : '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
