'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  TrendingUp, 
  Award, 
  Activity, 
  Flame, 
  RefreshCw,
  Database,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Trash2,
  Edit,
  X,
  Check,
  CalendarDays,
  Lock,
  Compass,
  CheckCircle2,
  Dumbbell
} from 'lucide-react';
import { 
  getDailyLoads, 
  getImportedWorkouts,
  getActivities,
  saveActivity,
  saveCustomWorkout,
  deleteCustomWorkout
} from '../../lib/firebase/firestore';
import { DailyTrainingLoad, CanonicalActivity } from '../../data/types';
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
  
  // Tab control
  const [subTab, setSubTab] = useState<'calendar' | 'pmc'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'list'>('month');

  // Core data states
  const [dailyLoads, setDailyLoads] = useState<DailyTrainingLoad[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]); 
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar navigation states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  });

  // Simulator state
  const [planDailyLoad, setPlanDailyLoad] = useState<number>(50);
  const [planDays, setPlanDays] = useState<number>(28);
  const [useCalendarSchedule, setUseCalendarSchedule] = useState<boolean>(true);

  // Modal and Interactive States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTargetDate, setScheduleTargetDate] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'existing' | 'create' | 'log'>('existing');

  // Selection states
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<'workout' | 'activity'>('workout');

  // Forms state: Create Workouts
  const [newWTitle, setNewWTitle] = useState('');
  const [newWSport, setNewWSport] = useState('run');
  const [newWType, setNewWType] = useState('easy');
  const [newWDesc, setNewWDesc] = useState('');
  const [newWDurationMin, setNewWDurationMin] = useState('45');
  const [newWDistanceKm, setNewWDistanceKm] = useState('8');
  const [newWTss, setNewWTss] = useState('50');

  // Forms state: Edit Workouts
  const [editWTitle, setEditWTitle] = useState('');
  const [editWSport, setEditWSport] = useState('run');
  const [editWType, setEditWType] = useState('easy');
  const [editWDesc, setEditWDesc] = useState('');
  const [editWDurationMin, setEditWDurationMin] = useState('');
  const [editWDistanceKm, setEditWDistanceKm] = useState('');
  const [editWTss, setEditWTss] = useState('');

  // Forms state: Log Activity
  const [logTitle, setLogTitle] = useState('Morning Run');
  const [logSport, setLogSport] = useState('run');
  const [logDistanceKm, setLogDistanceKm] = useState('8');
  const [logDurationMin, setLogDurationMin] = useState('45');
  const [logHR, setLogHR] = useState('140');
  const [logRPE, setLogRPE] = useState('5');
  const [logNotes, setLogNotes] = useState('');

  const [saving, setSaving] = useState(false);

  // Load physical documents
  async function loadData() {
    if (!user) return;
    try {
      const [loads, rawWorkouts, acts] = await Promise.all([
        getDailyLoads(user.uid),
        getImportedWorkouts(user.uid),
        getActivities(user.uid)
      ]);

      setDailyLoads(loads.sort((a, b) => b.date.localeCompare(a.date)));
      setWorkouts(rawWorkouts);
      setActivities(acts.sort((a, b) => (b.startDateLocal || b.startDate || '').localeCompare(a.startDateLocal || a.startDate || '')));
    } catch (e) {
      console.error('Failed to resolve training indices:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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

  // --- Date Math Helpers ---
  const formatYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayLabel = (dStr: string) => {
    return new Date(dStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Compute TSS from custom workout or estimate
  const getWorkoutTss = (workout: any) => {
    if (workout.estimatedTss) return Number(workout.estimatedTss);
    if (workout.raw?.plan_load) return Number(workout.raw.plan_load);
    if (workout.raw?.load) return Number(workout.raw.load);
    
    const durationHrs = (workout.durationSeconds || workout.estimatedDurationSeconds || 0) / 3600;
    if (durationHrs > 0) {
      const intensity = workout.intensityTarget || (workout.workoutType === 'threshold' || workout.workoutType === 'interval' ? 85 : 65);
      return Math.round(durationHrs * intensity);
    }
    return 0;
  };

  const sumTssForDate = (dateStr: string) => {
    return workouts
      .filter(w => w.scheduledDate === dateStr)
      .reduce((sum, w) => sum + getWorkoutTss(w), 0);
  };

  // Load dynamic PMC Projection
  const latestLoad = dailyLoads[0]; // descending sort
  const latestFitness = latestLoad?.fitnessCtl ?? 40;
  const latestFatigue = latestLoad?.fatigueAtl ?? 45;

  const getProjectedPmc = () => {
    const lambdaCtl = Math.exp(-1 / 42); 
    const lambdaAtl = Math.exp(-1 / 7);  
    
    let currentCtl = latestFitness;
    let currentAtl = latestFatigue;
    
    const simulatedData: any[] = [];
    const baseDate = latestLoad?.date ? new Date(latestLoad.date) : new Date();

    for (let i = 1; i <= planDays; i++) {
      const simDate = new Date(baseDate.getTime() + i * 24 * 3600 * 1000);
      const dateStr = simDate.toISOString().split('T')[0];
      const shortDate = simDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

      let dayLoad = planDailyLoad;
      if (useCalendarSchedule) {
        // Find custom planned workouts on this day, or default to 0
        const schedLoad = sumTssForDate(dateStr);
        dayLoad = schedLoad > 0 ? schedLoad : 0;
      }

      currentCtl = currentCtl * lambdaCtl + dayLoad * (1 - lambdaCtl);
      currentAtl = currentAtl * lambdaAtl + dayLoad * (1 - lambdaAtl);
      const currentTsb = currentCtl - currentAtl;

      simulatedData.push({
        day: `Day ${i}`,
        shortDate,
        date: dateStr,
        ctl: Math.round(currentCtl * 10) / 10,
        atl: Math.round(currentAtl * 10) / 10,
        tsb: Math.round(currentTsb * 10) / 10,
        load: dayLoad,
      });
    }
    return simulatedData;
  };

  const projectedData = getProjectedPmc();

  // Sort loads for chart
  const sortedLoadsAsc = [...dailyLoads].sort((a, b) => a.date.localeCompare(b.date));
  const hasData = dailyLoads.length > 0;
  const showPMCChart = dailyLoads.length >= 7;

  // Actual summaries
  let sevenDayLoadSum: number | null = null;
  let twentyEightDayLoadSum: number | null = null;
  if (dailyLoads.length > 0) {
    const last7 = dailyLoads.slice(0, 7);
    const valid7 = last7.filter(l => typeof l.trainingLoad === 'number' && l.trainingLoad !== null);
    if (valid7.length > 0) sevenDayLoadSum = Math.round(valid7.reduce((sum, curr) => sum + (curr.trainingLoad || 0), 0));

    const last28 = dailyLoads.slice(0, 28);
    const valid28 = last28.filter(l => typeof l.trainingLoad === 'number' && l.trainingLoad !== null);
    if (valid28.length > 0) twentyEightDayLoadSum = Math.round(valid28.reduce((sum, curr) => sum + (curr.trainingLoad || 0), 0));
  }

  const formatVal = (v: number | null) => (v === null ? '—' : String(Math.round(v)));

  // --- ACTIONS ---
  // 1. Reschedule workout or schedule existing
  const handleAssignDate = async (workoutId: string, dateStr: string | undefined) => {
    if (!user) return;
    const target = workouts.find(w => w.id === workoutId);
    if (!target) return;
    if (target.source === 'intervals') {
      alert("Intervals.icu synced workouts are read-only and cannot be rescheduled here.");
      return;
    }
    setSaving(true);
    try {
      await saveCustomWorkout(user.uid, target.id, {
        ...target,
        scheduledDate: dateStr || null,
        updatedAt: new Date().toISOString()
      });
      await loadData();
      setIsScheduleModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to assign schedule.");
    } finally {
      setSaving(false);
    }
  };

  // 2. Clear date (Unschedule)
  const handleUnschedule = async (workoutId: string) => {
    await handleAssignDate(workoutId, undefined);
  };

  // 3. Create Custom Workout & Schedule on a Date
  const handleCreateCustomWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newWTitle.trim()) return;
    setSaving(true);
    try {
      const workoutId = `w_custom_${Date.now()}`;
      const payload = {
        id: workoutId,
        userId: user.uid,
        title: newWTitle.trim(),
        sportType: newWSport,
        source: 'manual',
        workoutType: newWType,
        description: newWDesc.trim() || undefined,
        scheduledDate: scheduleTargetDate || undefined,
        estimatedDurationSeconds: Number(newWDurationMin) * 60,
        estimatedDistanceMeters: Number(newWDistanceKm) * 1000,
        estimatedTss: Number(newWTss),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveCustomWorkout(user.uid, workoutId, payload);
      await loadData();
      // Reset
      setNewWTitle('');
      setNewWDesc('');
      setIsScheduleModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to build workout.");
    } finally {
      setSaving(false);
    }
  };

  // 4. Edit Existing Custom Workout
  const handleEditCustomWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !workoutToEdit) return;
    setSaving(true);
    try {
      const payload = {
        ...workoutToEdit,
        title: editWTitle.trim(),
        sportType: editWSport,
        workoutType: editWType,
        description: editWDesc.trim() || undefined,
        estimatedDurationSeconds: Number(editWDurationMin) * 60,
        estimatedDistanceMeters: Number(editWDistanceKm) * 1000,
        estimatedTss: Number(editWTss),
        updatedAt: new Date().toISOString()
      };
      await saveCustomWorkout(user.uid, workoutToEdit.id, payload);
      await loadData();
      setIsEditModalOpen(false);
      setWorkoutToEdit(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update workout.");
    } finally {
      setSaving(false);
    }
  };

  // 5. Delete Custom Workout
  const handleDeleteCustomWorkout = async (id: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to permanently delete this manual workout?")) return;
    setSaving(true);
    try {
      await deleteCustomWorkout(user.uid, id);
      await loadData();
      setIsEditModalOpen(false);
      setIsDetailModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to discard workout records.");
    } finally {
      setSaving(false);
    }
  };

  // 6. Log Manual Completion Activity
  const handleLogManualActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !logTitle.trim()) return;
    setSaving(true);
    try {
      const calculatedTSS = (Number(logDurationMin)) * Number(logRPE);
      const payload = {
        id: `act_manual_${Date.now()}`,
        userId: user.uid,
        name: logTitle.trim(),
        sportType: logSport,
        distanceMeters: Number(logDistanceKm) * 1000,
        movingTimeSeconds: Number(logDurationMin) * 60,
        elapsedTimeSeconds: Number(logDurationMin) * 60,
        startDate: scheduleTargetDate + 'T12:00:00Z',
        startDateLocal: scheduleTargetDate + 'T12:00:00Z',
        averageHeartRate: logHR ? Number(logHR) : undefined,
        rpe: Number(logRPE),
        trainingLoad: calculatedTSS,
        notes: logNotes.trim() || undefined,
        source: 'manual_log',
        syncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveActivity(user.uid, payload);
      await loadData();
      // Reset
      setLogTitle('Morning Run');
      setLogNotes('');
      setIsScheduleModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Failed to log activity completion.");
    } finally {
      setSaving(false);
    }
  };

  const triggerScheduleModal = (dateStr: string) => {
    setScheduleTargetDate(dateStr);
    setScheduleMode('existing');
    setSelectedWorkoutId('');
    setIsScheduleModalOpen(true);
  };

  const triggerEditModal = (workout: any) => {
    setWorkoutToEdit(workout);
    setEditWTitle(workout.title || '');
    setEditWSport(workout.sportType || 'run');
    setEditWType(workout.workoutType || 'easy');
    setEditWDesc(workout.description || '');
    setEditWDurationMin(String(Math.round((workout.durationSeconds || workout.estimatedDurationSeconds || 2700) / 60)));
    setEditWDistanceKm(String(((workout.distanceMeters || workout.estimatedDistanceMeters || 8000) / 1000).toFixed(1)));
    setEditWTss(String(getWorkoutTss(workout)));
    setIsEditModalOpen(true);
  };

  const triggerDetailModal = (item: any, type: 'workout' | 'activity') => {
    setDetailItem(item);
    setDetailType(type);
    setIsDetailModalOpen(true);
  };

  // --- Rendering Calculations ---
  // Month Grid Calculation (standards Monday start)
  const getMonthDateGrid = () => {
    const startObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    // Adjust to Monday
    let startDayOfWeek = startObj.getDay();
    const adjustOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const gridStartDate = new Date(startObj.getTime() - adjustOffset * 24 * 3600 * 1000);

    const dates: Date[] = [];
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(gridStartDate.getTime() + i * 24 * 3600 * 1000));
    }
    return dates;
  };

  // Week View dates (Starts Mon)
  const getWeekDates = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(currentWeekStart.getTime() + i * 24 * 3600 * 1000));
    }
    return dates;
  };

  const calendarDates = calendarView === 'month' ? getMonthDateGrid() : getWeekDates();
  const unscheduledWorkouts = workouts.filter(w => !w.scheduledDate && w.source === 'manual');

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex flex-col p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-[1440px] w-full mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111113] p-6 border border-white/10 rounded-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors"
                id="back_button_shell"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-xl font-bold uppercase tracking-wide text-white leading-none font-mono">Training Calendar</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
                Plan schedules, log completions, and model future cardiovascular load trends
              </p>
            </div>
          </div>

          {/* SubTab Toggles */}
          <div className="flex bg-zinc-950 p-1 border border-white/5 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setSubTab('calendar')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${
                subTab === 'calendar' ? 'bg-[#FC5200] text-black font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
                id="tab_calendar_trigger"
            >
              Training Calendar
            </button>
            <button
              onClick={() => setSubTab('pmc')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${
                subTab === 'pmc' ? 'bg-[#FC5200] text-black font-extrabold' : 'text-zinc-400 hover:text-white'
              }`}
                id="tab_pmc_trigger"
            >
              Load Projections (PMC)
            </button>
          </div>
        </div>

        {/* TAB 1: CALENDAR VIEW */}
        {subTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar Workout Library - Scheduling Dock */}
            <div className="lg:col-span-1 bg-[#111113] border border-white/10 rounded-xl p-5 space-y-5 flex flex-col justify-between h-fit">
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                  <h2 className="text-xs text-zinc-400 font-mono font-bold uppercase">Workout Library</h2>
                  <button
                    onClick={() => router.push('/workout-library/new')}
                    className="flex items-center gap-1 py-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-[#FC5200] border border-white/10 rounded text-[10px] font-mono font-bold transition-all uppercase"
                      id="create_new_workout_redirect"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>

                <p className="text-[10px] text-zinc-500 uppercase font-bold leading-normal mb-4">
                  Manual targets ready to assign or schedule on dates
                </p>

                {unscheduledWorkouts.length === 0 ? (
                  <div className="border border-dashed border-white/5 p-6 rounded-lg text-center text-zinc-500 font-mono text-[10px] uppercase leading-relaxed">
                    No unscheduled workouts. Open the Library to build manual athletic prescriptions.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {unscheduledWorkouts.map(w => (
                      <div 
                        key={w.id} 
                        className="bg-zinc-950/40 border border-white/5 p-3 rounded-lg flex flex-col justify-between gap-2 hover:border-[#FC5200]/30 transition-all group"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 rounded-sm text-zinc-400 uppercase font-bold">
                              {w.sportType}
                            </span>
                            <span className="text-[9px] text-[#FC5200] font-mono font-bold uppercase">
                              TSS: {getWorkoutTss(w)}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white uppercase mt-1.5 line-clamp-1 group-hover:text-[#FC5200] transition-colors">{w.title}</h4>
                          {w.description && <p className="text-[10px] text-zinc-500 font-mono uppercase line-clamp-2 mt-1 leading-normal">{w.description}</p>}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-white/5 mt-1">
                          <button
                            onClick={() => {
                              setScheduleTargetDate(formatYYYYMMDD(new Date()));
                              setScheduleMode('existing');
                              setSelectedWorkoutId(w.id);
                              setIsScheduleModalOpen(true);
                            }}
                            className="flex-1 py-1 text-center bg-[#FC5200]/10 hover:bg-[#FC5200] border border-[#FC5200]/20 hover:border-transparent text-[#FC5200] hover:text-black text-[9px] font-mono font-extrabold uppercase rounded transition-all"
                          >
                            Schedule
                          </button>
                          <button
                            onClick={() => triggerEditModal(w)}
                            className="p-1 px-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded border border-white/5 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick instructions / Sync Warning */}
              <div className="p-4 bg-zinc-950/60 border border-white/5 rounded-lg mt-6 text-[10px] text-zinc-400 space-y-2 leading-relaxed font-semibold uppercase">
                <div className="flex items-center gap-1.5 text-zinc-350">
                  <Database className="w-3.5 h-3.5 text-zinc-500" />
                  <span>External Synergies</span>
                </div>
                <p>Planned calendar items are imported securely from Intervals.icu. Completed operations write automatically via synced Strava activity runs.</p>
              </div>
            </div>

            {/* Core Calendar Planner */}
            <div className="lg:col-span-3 bg-[#111113] border border-white/10 rounded-xl p-6 space-y-6">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                
                {/* Mode Selectors */}
                <div className="flex gap-2">
                  {(['month', 'week', 'list'] as const).map(view => (
                    <button
                      key={view}
                      onClick={() => setCalendarView(view)}
                      className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase transition-colors ${
                        calendarView === view ? 'bg-zinc-850 border border-zinc-700 text-[#FC5200]' : 'border border-transparent text-zinc-400 hover:text-white'
                      }`}
                        id={`view_toggle_${view}`}
                    >
                      {view} View
                    </button>
                  ))}
                </div>

                {/* Calendar Navigation */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (calendarView === 'month') {
                        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
                      } else {
                        setCurrentWeekStart(new Date(currentWeekStart.getTime() - 7 * 24 * 3600 * 1000));
                      }
                    }}
                    className="p-1.5 hover:bg-zinc-800 border border-white/5 rounded transition-colors text-zinc-400 hover:text-white"
                      id="calendar_nav_prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="text-sm font-bold uppercase font-mono tracking-wider text-white">
                    {calendarView === 'month' ? (
                      currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                    ) : (
                      `W/C ${currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                    )}
                  </span>

                  <button
                    onClick={() => {
                      if (calendarView === 'month') {
                        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
                      } else {
                        setCurrentWeekStart(new Date(currentWeekStart.getTime() + 7 * 24 * 3600 * 1000));
                      }
                    }}
                    className="p-1.5 hover:bg-zinc-800 border border-white/5 rounded transition-colors text-zinc-400 hover:text-white"
                      id="calendar_nav_next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const today = new Date();
                      setCurrentDate(today);
                      const day = today.getDay();
                      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                      setCurrentWeekStart(new Date(new Date().setDate(diff)));
                    }}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-tight bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-white/5 transition-all uppercase"
                      id="nav_current_today"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Calendar Grid Renderers */}
              {calendarView === 'month' && (
                <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  
                  {/* Grid Headers */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="bg-zinc-950 p-2 text-center text-[10px] font-mono font-extrabold uppercase text-zinc-400 tracking-wider">
                      {day}
                    </div>
                  ))}

                  {/* Grid Cells */}
                  {calendarDates.map((dateObj, idx) => {
                    const dateStr = formatYYYYMMDD(dateObj);
                    const isCurrentMonth = dateObj.getMonth() === currentDate.getMonth();
                    const isToday = formatYYYYMMDD(new Date()) === dateStr;
                    
                    // Filter daily records
                    const dayWorkouts = workouts.filter(w => w.scheduledDate === dateStr);
                    const dayActivities = activities.filter(act => {
                      const actDate = (act.startDateLocal || act.startDate || '').split('T')[0];
                      return actDate === dateStr;
                    });

                    // Load variables
                    const dayLoadRecord = dailyLoads.find(l => l.date === dateStr);
                    const isFuture = dateStr > formatYYYYMMDD(new Date());
                    const simulatedLoad = sumTssForDate(dateStr);

                    return (
                      <div 
                        key={idx} 
                        className={`bg-[#111113] min-h-[120px] p-2 flex flex-col justify-between hover:bg-zinc-800/10 cursor-pointer transition-colors relative ${
                          isCurrentMonth ? 'text-zinc-100' : 'opacity-30'
                        } ${isToday ? 'outline outline-1 outline-[#FC5200]/50 bg-zinc-950/30' : ''}`}
                        onClick={() => triggerScheduleModal(dateStr)}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`text-[10px] font-mono font-bold ${isToday ? 'text-black bg-[#FC5200] px-1 rounded-sm' : 'text-zinc-400'}`}>
                            {dateObj.getDate()}
                          </span>
                          
                          {/* Daily Load Indicator */}
                          {!isFuture && (dayLoadRecord?.trainingLoad !== undefined) ? (
                            <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase block leading-none">
                              Actual Load: {dayLoadRecord.trainingLoad}
                            </span>
                          ) : (isFuture && simulatedLoad > 0) ? (
                            <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase block leading-none">
                              Proj: {simulatedLoad} TSS
                            </span>
                          ) : null}
                        </div>

                        {/* Event Stack */}
                        <div className="space-y-1 my-2 overflow-hidden flex-1 flex flex-col pl-0.5 justify-end">
                          
                          {/* Completed Activities (Real Strava vs Manual Completes) */}
                          {dayActivities.map(act => (
                            <div 
                              key={act.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerDetailModal(act, 'activity');
                              }}
                              className="text-[9px] font-mono py-0.5 px-1 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 rounded flex items-center justify-between text-left truncate uppercase leading-tight font-semibold"
                            >
                              <span className="truncate flex-1">● Synced Completed: {act.name}</span>
                            </div>
                          ))}

                          {/* Planned sessions */}
                          {dayWorkouts.map(w => (
                            <div 
                              key={w.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerDetailModal(w, 'workout');
                              }}
                              className={`text-[9.5px] font-mono py-0.5 px-1 bg-zinc-950/60 border rounded text-left truncate flex items-center justify-between gap-1 leading-tight font-bold ${
                                w.source === 'intervals' ? 'border-[#FC5200]/30 text-[#FC5200]' : 'border-blue-500/30 text-blue-400'
                              }`}
                            >
                              <span className="truncate flex-1">{w.source === 'intervals' ? 'Imported' : 'Planned'}: {w.title}</span>
                            </div>
                          ))}
                        </div>

                        {/* Hover Helper Add indicator */}
                        <div className="text-[8px] text-zinc-600 font-mono text-right uppercase tracking-wider font-semibold opacity-0 hover:opacity-100 transition-opacity">
                          + Assign / Log
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Week view detailed rendering */}
              {calendarView === 'week' && (
                <div className="space-y-4">
                  {calendarDates.map((dateObj, idx) => {
                    const dateStr = formatYYYYMMDD(dateObj);
                    const isToday = formatYYYYMMDD(new Date()) === dateStr;
                    const isFuture = dateStr > formatYYYYMMDD(new Date());

                    const dayWorkouts = workouts.filter(w => w.scheduledDate === dateStr);
                    const dayActivities = activities.filter(act => {
                      const actDate = (act.startDateLocal || act.startDate || '').split('T')[0];
                      return actDate === dateStr;
                    });
                    
                    const dayLoadRecord = dailyLoads.find(l => l.date === dateStr);
                    const dayPlannedTss = sumTssForDate(dateStr);

                    return (
                      <div 
                        key={idx} 
                        className={`bg-zinc-950/40 border border-white/5 p-5 rounded-lg space-y-4 hover:border-zinc-800 transition-all ${
                          isToday ? 'outline outline-1 outline-[#FC5200]/50 bg-zinc-950/60' : ''
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-2">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded ${isToday ? 'bg-[#FC5200] text-black font-extrabold' : 'bg-zinc-800 text-zinc-300'}`}>
                              {getDayLabel(dateStr)}
                            </span>
                            {isToday && <span className="text-[9px] text-[#FC5200] font-mono font-extrabold uppercase">TODAY</span>}
                          </div>

                          <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-400 uppercase font-bold">
                            {dayLoadRecord?.trainingLoad !== undefined && (
                              <span>Actual Load: {dayLoadRecord.trainingLoad} TSS</span>
                            )}
                            {dayPlannedTss > 0 && (
                              <span className="text-cyan-400">Projected: {dayPlannedTss} TSS</span>
                            )}
                            <button
                              onClick={() => triggerScheduleModal(dateStr)}
                              className="py-1 px-2.5 bg-zinc-850 hover:bg-zinc-800 text-[#FC5200] hover:text-white border border-white/5 rounded text-[9px] font-mono font-extrabold uppercase transition-all"
                            >
                              + Plan / Log
                            </button>
                          </div>
                        </div>

                        {/* Contents details row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Target Completed List */}
                          <div className="space-y-2">
                            <h5 className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">Completed Sessions</h5>
                            {dayActivities.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight py-2 italic border border-dashed border-white/5 rounded px-3">
                                No completed activities logs synchronized.
                              </p>
                            ) : (
                              dayActivities.map(act => (
                                <div key={act.id} className="bg-emerald-950/10 border border-emerald-500/20 p-3 rounded-md flex flex-col justify-between gap-1">
                                  <div className="flex justify-between items-start text-[9px] font-mono font-bold">
                                    <span className="px-1.5 py-0.5 bg-emerald-950/40 text-emerald-400 rounded border border-emerald-500/20 uppercase">
                                      {act.source === 'manual_log' ? 'Manual Synced' : 'Strava Completed'}
                                    </span>
                                    {act.trainingLoad !== undefined && (
                                      <span className="text-emerald-400 uppercase">TSS: {Math.round(act.trainingLoad)}</span>
                                    )}
                                  </div>
                                  <h6 className="text-xs font-bold text-white uppercase mt-1 leading-normal">{act.name}</h6>
                                  <div className="flex gap-4 text-[10px] text-zinc-400 font-mono font-semibold uppercase mt-1">
                                    {act.distanceMeters > 0 && <span>Dist: {(act.distanceMeters / 1000).toFixed(1)} km</span>}
                                    {act.movingTimeSeconds > 0 && <span>Time: {Math.round(act.movingTimeSeconds / 60)} min</span>}
                                    {act.averageHeartRate && <span>HR: {act.averageHeartRate} bpm</span>}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Planned Prescriptions List */}
                          <div className="space-y-2">
                            <h5 className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-zinc-500">Planned Prescriptions</h5>
                            {dayWorkouts.length === 0 ? (
                              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tight py-2 italic border border-dashed border-white/5 rounded px-3">
                                No workouts planned for this calendar day.
                              </p>
                            ) : (
                              dayWorkouts.map(w => (
                                <div key={w.id} className={`bg-zinc-950/60 border p-3.5 rounded-md space-y-2 relative flex flex-col justify-between ${
                                  w.source === 'intervals' ? 'border-[#FC5200]/20' : 'border-blue-500/20'
                                }`}>
                                  <div className="flex justify-between items-start text-[9px] font-mono font-bold">
                                    <span className={`px-1.5 py-0.5 rounded border uppercase ${
                                      w.source === 'intervals' ? 'bg-[#FC5200]/10 text-[#FC5200] border-[#FC5200]/20' : 'bg-blue-950/30 text-blue-400 border-blue-550/20'
                                    }`}>
                                      {w.source === 'intervals' ? 'Intervals.icu' : 'Manual Prescription'}
                                    </span>
                                    <span className="text-zinc-400">EST TSS: {getWorkoutTss(w)}</span>
                                  </div>

                                  <div>
                                    <h6 className="text-xs font-bold text-white uppercase leading-normal">{w.title}</h6>
                                    {w.description && <p className="text-[10px] text-zinc-400 font-mono uppercase line-clamp-2 mt-1 leading-relaxed">{w.description}</p>}
                                  </div>

                                  <div className="flex gap-4 pt-1 text-[10px] text-zinc-500 font-mono font-bold uppercase border-t border-white/5">
                                    {w.estimatedDurationSeconds > 0 && <span>Time: {Math.round(w.estimatedDurationSeconds / 60)} min</span>}
                                    {w.estimatedDistanceMeters > 0 && <span>Dist: {(w.estimatedDistanceMeters / 1000).toFixed(1)} km</span>}
                                  </div>

                                  {/* Edit capabilities only for custom manual workouts */}
                                  {w.source === 'manual' && (
                                    <div className="flex gap-2 pt-2 border-t border-white/5 mt-2">
                                      <button
                                        onClick={() => triggerEditModal(w)}
                                        className="flex-1 py-1 text-center bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 text-[9px] font-mono font-bold uppercase rounded border border-white/5 transition-all"
                                      >
                                        Edit Details
                                      </button>
                                      <button
                                        onClick={() => handleUnschedule(w.id)}
                                        className="flex-1 py-1 text-center bg-zinc-900 hover:bg-zinc-850 hover:text-yellow-400 text-zinc-400 text-[9px] font-mono font-bold uppercase rounded border border-white/5 transition-all"
                                      >
                                        Unschedule
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCustomWorkout(w.id)}
                                        className="p-1 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List chronological view */}
              {calendarView === 'list' && (
                <div className="space-y-4">
                  
                  {/* Filter items inside selected range */}
                  {(() => {
                    const rawDaysList = [
                      ...workouts.map(w => w.scheduledDate),
                      ...activities.map(act => (act.startDateLocal || act.startDate || '').split('T')[0])
                    ];
                    const filteredDays = rawDaysList.filter((val): val is string => typeof val === 'string' && val !== '');
                    const sortedDays = filteredDays
                      .filter((val, index, self) => self.indexOf(val) === index)
                      .sort((a, b) => a.localeCompare(b));

                    if (sortedDays.length === 0) {
                      return (
                        <div className="border border-dashed border-white/5 rounded-lg p-12 text-center text-zinc-500 uppercase font-mono text-xs">
                          No planned workouts. Create a workout or sync Intervals.icu planned workouts.
                        </div>
                      );
                    }

                    return sortedDays.map((dayStr, dIdx) => {
                      const dayWorkouts = workouts.filter(w => w.scheduledDate === dayStr);
                      const dayActivities = activities.filter(act => (act.startDateLocal || act.startDate || '').split('T')[0] === dayStr);

                      return (
                        <div key={dIdx} className="bg-zinc-950/20 p-4 border border-white/5 rounded-lg flex flex-col md:flex-row gap-6 md:items-center">
                          <div className="md:w-44 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 pb-2 md:pb-0">
                            <span className="text-xs font-mono font-black text-white uppercase">{getDayLabel(dayStr!)}</span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold mt-1">Total TSS: {sumTssForDate(dayStr!)}</span>
                          </div>

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Planned */}
                            <div className="space-y-2">
                              {dayWorkouts.map(w => (
                                <div 
                                  key={w.id} 
                                  onClick={() => triggerDetailModal(w, 'workout')}
                                  className="p-2 border border-white/5 bg-zinc-900/30 rounded flex justify-between items-center text-xs text-zinc-200 uppercase font-mono font-semibold hover:border-zinc-700 cursor-pointer"
                                >
                                  <span className="truncate">{w.title}</span>
                                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded ${w.source === 'intervals' ? 'bg-[#FC5200]/10 text-[#FC5200]' : 'bg-blue-950/20 text-blue-400'}`}>
                                    {w.source === 'intervals' ? 'Imported' : 'Manual'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Completed */}
                            <div className="space-y-2">
                              {dayActivities.map(act => (
                                <div 
                                  key={act.id} 
                                  onClick={() => triggerDetailModal(act, 'activity')}
                                  className="p-2 border border-emerald-500/10 bg-emerald-950/5 rounded flex justify-between items-center text-xs text-emerald-400 uppercase font-mono font-semibold hover:border-emerald-500/30 cursor-pointer"
                                >
                                  <span className="truncate">✓ {act.name}</span>
                                  <span className="text-[8.5px] text-zinc-500">Completed</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  })()}
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 2: PMC HISTORICAL ANALYSIS AND SIMULATOR (PRESERVED CONTENT) */}
        {subTab === 'pmc' && (
          <div className="space-y-6">
            
            {/* 1. ACUTE CHRONIC PHYSIOLOGICAL HUD */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8 space-y-6">
              <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Physiological Metrics Summary</h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FITNESS CTL</span>
                  <div className="font-mono text-3xl font-bold text-white">
                    {formatVal(latestLoad?.fitnessCtl ?? null)} <span className="text-xs text-zinc-500 font-semibold">ms</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium block">42-day rolling stress</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FATIGUE ATL</span>
                  <div className="font-mono text-3xl font-bold text-white">
                    {formatVal(latestLoad?.fatigueAtl ?? null)} <span className="text-xs text-zinc-500 font-semibold">ms</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium block">7-day acute fatigue</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">FORM TSB</span>
                  <div className={`font-mono text-3xl font-bold ${latestLoad?.formTsb !== undefined && latestLoad?.formTsb !== null && latestLoad.formTsb >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {latestLoad?.formTsb !== undefined && latestLoad?.formTsb !== null ? (latestLoad.formTsb > 0 ? `+${Math.round(latestLoad.formTsb)}` : Math.round(latestLoad.formTsb)) : '—'} <span className="text-xs text-zinc-500 font-semibold">ms</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium block">Stress training balance</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">7-DAY LOAD</span>
                  <div className="font-mono text-3xl font-bold text-zinc-350">
                    {formatVal(sevenDayLoadSum)} <span className="text-xs text-zinc-500 font-semibold">TSS</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium block">Acute weekly strain sum</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase block">28-DAY LOAD</span>
                  <div className="font-mono text-3xl font-bold text-zinc-350">
                    {formatVal(twentyEightDayLoadSum)} <span className="text-xs text-zinc-500 font-semibold">TSS</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium block">Chronic monthly strain sum</span>
                </div>
              </div>
            </div>

            {/* 2. REAL HISTORICAL PMC CHART */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
              <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-6">Historical Performance Management Chart (PMC)</h2>
              
              {!hasData ? (
                <div className="h-72 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center text-center space-y-4 p-8">
                  <Database className="w-8 h-8 text-zinc-600" />
                  <p className="text-sm text-[#FC5200] font-semibold uppercase font-mono">Real training load unpopulated</p>
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
                <div className="h-96 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={sortedLoadsAsc.slice(-30).map(load => ({
                      date: load.date,
                      shortDate: new Date(load.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
                      CTL: load.fitnessCtl ?? null,
                      ATL: load.fatigueAtl ?? null,
                      TSB: load.formTsb ?? null,
                    }))} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="shortDate" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: '12px' }}
                        itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                      />
                      <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                      <Line type="monotone" dataKey="CTL" name="Fitness (CTL)" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="ATL" name="Fatigue (ATL)" stroke="#f59e0b" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="TSB" name="Form (TSB)" stroke="#10b981" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 3. PROJECTION SIMULATOR */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FC5200]" />
                    <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Future PMC Simulator</h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-semibold uppercase">
                    Simulate cardiac stress response curves under customizable target workloads
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#FC5200]/10 border border-[#FC5200]/20 text-[#FC5200] text-[10px] font-bold uppercase rounded tracking-wider font-mono">
                  PROJECTION MODULE
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="space-y-6 bg-zinc-900/50 p-6 rounded-lg border border-white/5 space-y-5">
                  <h3 className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Simulation Mode Variables</h3>
                  
                  {/* Select Simulation Source */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase block">Simulation Load Model</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setUseCalendarSchedule(false)}
                        className={`py-1.5 rounded text-xs font-semibold uppercase border transition-all ${
                          !useCalendarSchedule ? 'bg-zinc-805 border-[#FC5200]/40 text-[#FC5200]' : 'bg-transparent border-white/5 text-zinc-400'
                        }`}
                      >
                        Static Flat Load
                      </button>
                      <button
                        onClick={() => setUseCalendarSchedule(true)}
                        className={`py-1.5 rounded text-xs font-semibold uppercase border transition-all ${
                          useCalendarSchedule ? 'bg-zinc-805 border-cyan-400/40 text-cyan-400' : 'bg-transparent border-white/5 text-zinc-400'
                        }`}
                      >
                        Planned Calendar
                      </button>
                    </div>
                  </div>

                  {!useCalendarSchedule ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-semibold uppercase mb-2">
                          <span className="text-zinc-400 font-mono">Daily Target Workload</span>
                          <span className="text-[#FC5200] font-mono">{planDailyLoad} TSS</span>
                        </div>
                        <input 
                          type="range" min="0" max="200" value={planDailyLoad}
                          onChange={(e) => setPlanDailyLoad(parseInt(e.target.value))}
                          className="w-full accent-[#FC5200] bg-zinc-850"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-cyan-950/20 border border-cyan-400/10 rounded text-[10px] text-zinc-400 leading-normal uppercase font-semibold">
                      This projections mode automatically aggregates the Estimated TSS values of workouts planned on your Training Calendar dates!
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs font-semibold uppercase mb-2">
                      <span className="text-zinc-400 font-mono">Projection Horizon</span>
                      <span className="text-[#FC5200] font-mono">{planDays} Days</span>
                    </div>
                    <input 
                      type="range" min="7" max="90" value={planDays}
                      onChange={(e) => setPlanDays(parseInt(e.target.value))}
                      className="w-full accent-[#FC5200] bg-zinc-850"
                    />
                  </div>

                  <div className="p-4 bg-zinc-950/60 border border-white/5 rounded text-[10px] text-zinc-400 leading-relaxed uppercase font-semibold">
                    💡 Simulation parameters represent ideal mathematical projections only. They do not overwrite historical logged activities.
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xs text-zinc-400 font-bold tracking-wider uppercase">Projected Trend Projections</h3>
                  
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={projectedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="shortDate" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: '12px' }}
                          itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                          labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                        />
                        <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                        <Line type="monotone" dataKey="ctl" name="Projected Fitness (CTL)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                        <Line type="monotone" dataKey="atl" name="Projected Fatigue (ATL)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        <Line type="monotone" dataKey="tsb" name="Projected Form (TSB)" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* --- MODAL 1: SCHEDULE DIALOG (PLAN WORKOUT OR LOG ACTIVITY) --- */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#111113] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden flex flex-col justify-between">
              
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Schedule Operations</h3>
                  <span className="text-[10px] font-mono text-[#FC5200] font-bold uppercase block mt-1">Date Target: {scheduleTargetDate}</span>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="p-4 bg-zinc-950 border-b border-white/5 flex gap-2">
                <button
                  onClick={() => setScheduleMode('existing')}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase rounded border transition-colors ${
                    scheduleMode === 'existing' ? 'bg-[#FC5200] border-transparent text-black font-extrabold' : 'border-white/5 text-zinc-400'
                  }`}
                >
                  Schedule Existing
                </button>
                <button
                  onClick={() => setScheduleMode('create')}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase rounded border transition-colors ${
                    scheduleMode === 'create' ? 'bg-[#FC5200] border-transparent text-black font-extrabold' : 'border-white/5 text-zinc-400'
                  }`}
                >
                  Create Target
                </button>
                <button
                  onClick={() => setScheduleMode('log')}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase rounded border transition-colors ${
                    scheduleMode === 'log' ? 'bg-[#FC5200] border-transparent text-black font-extrabold' : 'border-white/5 text-zinc-400'
                  }`}
                >
                  Log Activity
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[400px]">
                
                {/* MODE A: EXISTING */}
                {scheduleMode === 'existing' && (
                  <div className="space-y-4">
                    <label className="text-[10px] text-zinc-400 font-mono font-bold uppercase block">Select Manual prescription</label>
                    <select
                      value={selectedWorkoutId}
                      onChange={(e) => setSelectedWorkoutId(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2.5 text-sm uppercase text-white font-mono"
                    >
                      <option value="">-- Choose Workout template --</option>
                      {workouts.filter(w => w.source === 'manual').map(w => (
                        <option key={w.id} value={w.id}>{w.title} ({w.sportType})</option>
                      ))}
                    </select>

                    <button
                      disabled={!selectedWorkoutId || saving}
                      onClick={() => handleAssignDate(selectedWorkoutId, scheduleTargetDate)}
                      className="w-full py-2.5 bg-[#FC5200] disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-black text-xs uppercase rounded-lg tracking-wider transition-all"
                    >
                      {saving ? 'Scheduling...' : 'Confirm Schedule'}
                    </button>
                  </div>
                )}

                {/* MODE B: CREATE NEW */}
                {scheduleMode === 'create' && (
                  <form onSubmit={handleCreateCustomWorkout} className="space-y-4 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-400">Workout title</label>
                      <input
                        type="text" required value={newWTitle} onChange={(e) => setNewWTitle(e.target.value)}
                        placeholder="Intervals Sweetspot Block"
                        className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Sport Type</label>
                        <select
                          value={newWSport} onChange={(e) => setNewWSport(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                        >
                          <option value="run">Run</option>
                          <option value="ride">Ride</option>
                          <option value="swim">Swim</option>
                          <option value="strength">Strength</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Workout Type</label>
                        <select
                          value={newWType} onChange={(e) => setNewWType(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                        >
                          <option value="easy">Easy paces</option>
                          <option value="interval">Intervals</option>
                          <option value="threshold">Threshold</option>
                          <option value="long_run">Long workout</option>
                          <option value="tempo">Tempo strain</option>
                          <option value="recovery">Recovery</option>
                          <option value="race">Race simulation</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Duration (min)</label>
                        <input
                          type="number" required value={newWDurationMin} onChange={(e) => setNewWDurationMin(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Distance (km)</label>
                        <input
                          type="number" required value={newWDistanceKm} onChange={(e) => setNewWDistanceKm(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Estimated TSS</label>
                        <input
                          type="number" required value={newWTss} onChange={(e) => setNewWTss(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-400">Description Notes</label>
                      <textarea
                        value={newWDesc} onChange={(e) => setNewWDesc(e.target.value)} rows={3}
                        placeholder="Provide steps or structures description"
                        className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                      />
                    </div>

                    <button
                      type="submit" disabled={saving}
                      className="w-full py-2.5 bg-[#FC5200] text-black font-black text-xs uppercase rounded-lg tracking-wider transition-all mt-2"
                    >
                      {saving ? 'Saving...' : 'Confirm planned targets'}
                    </button>
                  </form>
                )}

                {/* MODE C: LOG COMPLETED ACTIVITY */}
                {scheduleMode === 'log' && (
                  <form onSubmit={handleLogManualActivity} className="space-y-4 text-xs font-mono">
                    <p className="text-[10px] text-zinc-500 uppercase font-black leading-relaxed">
                      This will preserve an explicit manual activity completing training load calculation variables on this date.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-400">Activity Title</label>
                      <input
                        type="text" required value={logTitle} onChange={(e) => setLogTitle(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Sport Type</label>
                        <select
                          value={logSport} onChange={(e) => setLogSport(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                        >
                          <option value="run">Run</option>
                          <option value="ride">Ride</option>
                          <option value="swim">Swim</option>
                          <option value="strength">Strength</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">RPE effort (1-10)</label>
                        <select
                          value={logRPE} onChange={(e) => setLogRPE(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                        >
                          {[1,2,3,4,5,6,7,8,9,10].map(v => (
                            <option key={v} value={v}>RPE {v}: {v === 5 ? 'Moderate' : v === 10 ? 'Maximal' : `Level ${v}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Distance (km)</label>
                        <input
                          type="number" required value={logDistanceKm} onChange={(e) => setLogDistanceKm(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">Duration (min)</label>
                        <input
                          type="number" required value={logDurationMin} onChange={(e) => setLogDurationMin(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-zinc-400">HR bpm (opt)</label>
                        <input
                          type="number" value={logHR} onChange={(e) => setLogHR(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-400">Session Notes</label>
                      <textarea
                        value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3}
                        placeholder="Log post-workout notes"
                        className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                      />
                    </div>

                    <button
                      type="submit" disabled={saving}
                      className="w-full py-2.5 bg-[#FC5200] text-black font-black text-xs uppercase rounded-lg tracking-wider transition-all mt-2"
                    >
                      {saving ? 'Preserving...' : 'Log Completed Session'}
                    </button>
                  </form>
                )}

              </div>
            </div>
          </div>
        )}

        {/* --- MODAL 2: DETAIL ELEMENT DIALOG --- */}
        {isDetailModalOpen && detailItem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#111113] border border-white/10 rounded-xl w-full max-w-md overflow-hidden flex flex-col justify-between">
              
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-950/60">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-black ${
                    detailType === 'activity' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-blue-950 text-blue-400 border border-blue-500/20'
                  }`}>
                    {detailType === 'activity' ? 'Completed Log' : 'Scheduled Prescription'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setDetailItem(null);
                  }}
                  className="p-1 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 font-mono text-xs uppercase leading-relaxed">
                <div>
                  <h4 className="text-sm font-black text-white leading-normal tracking-wide">
                    {detailType === 'activity' ? detailItem.name : detailItem.title}
                  </h4>
                  <p className="text-[10px] text-[#FC5200] font-bold mt-1">
                    Date: {detailType === 'activity' ? (detailItem.startDateLocal || detailItem.startDate || '').split('T')[0] : detailItem.scheduledDate}
                  </p>
                </div>

                {detailItem.description && (
                  <div className="p-3 bg-zinc-950 rounded border border-white/5">
                    <p className="text-[10px] text-zinc-400 leading-normal">{detailItem.description}</p>
                  </div>
                )}
                {detailItem.notes && (
                  <div className="p-3 bg-zinc-950 rounded border border-white/5">
                    <p className="text-[10px] text-zinc-450 leading-normal">Notes: {detailItem.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block">Physical Scope</span>
                    <p className="text-white text-xs font-bold font-sans">
                      {detailType === 'activity' ? (
                        `${(detailItem.distanceMeters / 1000).toFixed(1)} km / ${Math.round(detailItem.movingTimeSeconds / 60)} min`
                      ) : (
                        `${((detailItem.distanceMeters || detailItem.estimatedDistanceMeters || 0) / 1000).toFixed(1)} km / ${Math.round((detailItem.durationSeconds || detailItem.estimatedDurationSeconds || 0) / 60)} min`
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block">Load Metric</span>
                    <p className="text-white text-xs font-bold">
                      {detailType === 'activity' ? (
                        `TSS: ${Math.round(detailItem.trainingLoad || 0)}`
                      ) : (
                        `EST TSS: ${getWorkoutTss(detailItem)}`
                      )}
                    </p>
                  </div>
                </div>

                {/* Operations */}
                {detailType === 'workout' && detailItem.source === 'manual' && (
                  <div className="flex gap-2 pt-4 border-t border-white/5 mt-4">
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        triggerEditModal(detailItem);
                      }}
                      className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-white/5 text-zinc-400 uppercase text-[10px] font-bold rounded transition-all"
                    >
                      Reschedule / Edit
                    </button>
                    <button
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleDeleteCustomWorkout(detailItem.id);
                      }}
                      className="p-1 px-3 bg-red-950/20 text-red-400 border border-red-900/40 rounded hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {detailType === 'workout' && detailItem.source === 'intervals' && (
                  <p className="text-[9.5px] italic text-zinc-500 border-t border-white/5 pt-3 uppercase font-bold text-center leading-normal">
                    🔒 Synced Calendar events from Intervals.icu are read-only and cannot be updated within Track.Studio.
                  </p>
                )}
                {detailType === 'activity' && detailItem.source !== 'manual_log' && (
                  <p className="text-[9.5px] italic text-zinc-550 border-t border-white/5 pt-3 uppercase font-bold text-center leading-normal">
                     Validated Strava completed events are locked read-only.
                  </p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --- MODAL 3: EDIT DIALOG (ONLY FOR MANUAL PRESCRIPTIONS) --- */}
        {isEditModalOpen && workoutToEdit && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#111113] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden">
              
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-zinc-950/45">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Edit manual Prescription</h3>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setWorkoutToEdit(null);
                  }}
                  className="p-1 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditCustomWorkout} className="p-6 space-y-4 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-400">Workout title</label>
                  <input
                    type="text" required value={editWTitle} onChange={(e) => setEditWTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Sport Type</label>
                    <select
                      value={editWSport} onChange={(e) => setEditWSport(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                    >
                      <option value="run">Run</option>
                      <option value="ride">Ride</option>
                      <option value="swim">Swim</option>
                      <option value="strength">Strength</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Workout Type</label>
                    <select
                      value={editWType} onChange={(e) => setEditWType(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                    >
                      <option value="easy">Easy paces</option>
                      <option value="interval">Intervals</option>
                      <option value="threshold">Threshold</option>
                      <option value="long_run">Long workout</option>
                      <option value="tempo">Tempo strain</option>
                      <option value="recovery">Recovery</option>
                      <option value="race">Race simulation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Duration (min)</label>
                    <input
                      type="number" required value={editWDurationMin} onChange={(e) => setEditWDurationMin(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Distance (km)</label>
                    <input
                      type="number" required value={editWDistanceKm} onChange={(e) => setEditWDistanceKm(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-zinc-400">Estimated TSS</label>
                    <input
                      type="number" required value={editWTss} onChange={(e) => setEditWTss(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-bold text-zinc-400">Description Notes</label>
                  <textarea
                    value={editWDesc} onChange={(e) => setEditWDesc(e.target.value)} rows={3}
                    className="w-full bg-zinc-950 border border-white/10 rounded p-2 text-white uppercase"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-[#FC5200] text-black font-black text-xs uppercase rounded-lg tracking-wider transition-all"
                  >
                    {saving ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomWorkout(workoutToEdit.id)}
                    className="p-2 px-4 bg-red-950/20 text-red-400 border border-red-900/40 rounded hover:bg-red-900/20 uppercase text-xs font-black font-mono"
                  >
                    Delete Permanent
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
