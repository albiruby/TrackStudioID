'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { 
  getActivities, 
  saveActivity, 
  getWellnessLogs 
} from '../lib/firebase/firestore';
import { CanonicalActivity, DailyWellnessLog } from '../data/types';
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
  X
} from 'lucide-react';

interface ShellProps {
  activeTab?: 'dashboard' | 'activities' | 'wellness';
}

export default function TrackStudioShell({ activeTab: initialActiveTab = 'dashboard' }: ShellProps) {
  const router = useRouter();
  const { user, athleteProfile, signOut, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activities' | 'wellness'>(initialActiveTab);
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      const [acts, logs] = await Promise.all([
        getActivities(user.uid),
        getWellnessLogs(user.uid)
      ]);
      setActivities(acts.sort((a, b) => (b.startDateLocal || b.startDate || '').localeCompare(a.startDateLocal || a.startDate || '')));
      setWellnessLogs(logs.sort((a, b) => b.date.localeCompare(a.date)));
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
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-zinc-400 hover:text-white">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`\
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
              onClick={() => handleTabChange('wellness')}
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

          {/* THREE MAIN SECTION HUD TELEMETRIES (DASHBOARD HUD SUMMARY) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PANEL 1: CARDIO POWER */}
            <div className="bg-[#111113] border border-white/10 p-6 rounded-xl flex justify-between items-center transition-all hover:border-white/20 hover:shadow-lg">
              <div>
                <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase block">VDOT SCORE</span>
                <div className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-white mt-1.5">{athleteProfile?.vdotScore || '—'}</div>
                <p className="text-xs text-zinc-500 mt-1">Current endurance fitness level</p>
              </div>
              <button 
                onClick={() => router.push('/vdot-calculator')}
                className="p-3 border border-white/10 hover:border-[#FC5200] text-zinc-400 hover:text-[#FC5200] rounded-lg hover:bg-[#FC5200]/10 transition-all"
              >
                <Calculator className="w-5 h-5" />
              </button>
            </div>

            {/* PANEL 2: PHYSIOLOGY BASE */}
            <div className="bg-[#111113] border border-white/10 p-6 rounded-xl flex justify-between items-center transition-all hover:border-white/20 hover:shadow-lg">
              <div>
                <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase block">RESTING HEART RATE</span>
                <div className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-[#FC5200] mt-1.5">
                  {athleteProfile?.restingHR ? `${athleteProfile.restingHR} BPM` : '—'}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Current waking baseline</p>
              </div>
              <button
                onClick={() => router.push('/hr-calculator')}
                className="p-3 border border-white/10 hover:border-[#FC5200] text-zinc-400 hover:text-[#FC5200] rounded-lg hover:bg-[#FC5200]/10 transition-all"
              >
                <Heart className="w-5 h-5" />
              </button>
            </div>

            {/* PANEL 3: ACWR RISK METRIC */}
            <div className="bg-[#111113] border border-white/10 p-6 rounded-xl flex justify-between items-center transition-all hover:border-white/20 hover:shadow-lg">
              <div>
                <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase block">TRAINING LOAD RATIO</span>
                <div className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-white mt-1.5">{acwrValue ? acwrValue : '—'}</div>
                <span className="text-xs text-zinc-500 mt-1 block truncate">
                  {acwrValue === 0 
                    ? 'No activities registered' 
                    : acwrValue <= 1.3 
                    ? 'Optimal conditioning' 
                    : 'High risk strain'
                  }
                </span>
              </div>
              <button
                onClick={() => router.push('/training')}
                className="p-3 border border-white/10 hover:border-[#FC5200] text-zinc-400 hover:text-[#FC5200] rounded-lg hover:bg-[#FC5200]/10 transition-all"
              >
                <TrendingUp className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* ================= TAB 1: THE DASHBOARD (18 SPECIALIST LABORATORIES) ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-fade-in">
              
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
                    <p className="text-sm text-zinc-400">Belum ada aktivitas. Hubungkan Strava dan lakukan sinkronisasi untuk menampilkan data aktivitas.</p>
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
                              <span className="font-mono text-sm text-zinc-300">{log.wakingHR ? `${log.wakingHR} bpm` : '—'}</span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm text-zinc-300">{log.hrvRmssd ? `${log.hrvRmssd} ms` : '—'}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-mono text-sm text-zinc-300">{log.fatigueRating ? `${log.fatigueRating}` : '—'}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-mono text-sm text-zinc-300">{log.muscleSoreness ? `${log.muscleSoreness}` : '—'}</span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm text-zinc-300">{log.sleepHours ? `${log.sleepHours}h` : '—'}</span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm text-zinc-300">{log.sleepScore ? `${log.sleepScore}%` : '—'}</span>
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
