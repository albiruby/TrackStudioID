'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Activity, 
  RefreshCw, 
  Check, 
  HelpCircle,
  TrendingUp,
  Database,
  Save,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Clock,
  Heart,
  Zap,
  Gauge,
  Info,
  AlertTriangle
} from 'lucide-react';
import { 
  getActivities, 
  getImportedWorkouts, 
  getWorkoutComparisons, 
  saveWorkoutComparison, 
  deleteWorkoutComparison,
  getAthleteProfile,
  getLaps 
} from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';
import { formatDistanceKm, formatDuration, formatPace, isRealNumber } from '../../lib/data/dataLaw';

// Format utility deltas
function formatDurationDelta(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  const absSecs = Math.abs(seconds);
  const h = Math.floor(absSecs / 3600);
  const m = Math.floor((absSecs % 3600) / 60);
  const s = Math.floor(absSecs % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  
  if (h > 0) {
    return `${sign}${h}:${pad(m)}:${pad(s)}`;
  }
  return `${sign}${pad(m)}:${pad(s)}`;
}

function formatDistanceKmDelta(meters: number): string {
  const sign = meters >= 0 ? '+' : '-';
  return `${sign}${(Math.abs(meters) / 1000).toFixed(2)} km`;
}

function formatPaceDelta(secsDelta: number): string {
  const sign = secsDelta >= 0 ? '+' : '-';
  const absSecs = Math.round(Math.abs(secsDelta));
  const m = Math.floor(absSecs / 60);
  const s = absSecs % 60;
  return `${sign}${m}:${String(s).padStart(2, '0')} /km`;
}

function parsePaceStringToSeconds(paceStr: string | undefined): number | null {
  if (!paceStr) return null;
  const parts = paceStr.split(':');
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10);
    const sec = parseInt(parts[1], 10);
    if (!isNaN(min) && !isNaN(sec)) {
      return min * 60 + sec;
    }
  }
  return null;
}

// Flatten nested repetition blocks inside workout steps to correspond sequentially to recorded laps
function flattenWorkoutSteps(steps: any[]): any[] {
  const result: any[] = [];
  if (!steps) return result;
  
  steps.forEach(step => {
    if (step.type === 'repeat' && step.repeatCount && step.childSteps) {
      for (let r = 0; r < step.repeatCount; r++) {
        step.childSteps.forEach((child: any) => {
          result.push({
            ...child,
            name: `${child.name || 'Work Step'} (Rep ${r + 1}/${step.repeatCount})`
          });
        });
      }
    } else {
      result.push(step);
    }
  });
  return result;
}

function CompareLabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Query parameters support
  const queryActivityId = searchParams.get('activityId');
  const queryWorkoutId = searchParams.get('workoutId');
  const queryTab = searchParams.get('tab');

  // Core navigation tab
  const [activeTab, setActiveTab] = useState<'completed-vs-completed' | 'planned-vs-completed'>('completed-vs-completed');

  // Datasets
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<any[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<any[]>([]);
  const [athleteProfile, setAthleteProfile] = useState<any | null>(null);
  
  // Laps specifically for selected completed activity
  const [activityLaps, setActivityLaps] = useState<any[] | null>(null);
  const [loadingLaps, setLoadingLaps] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // SELECTIONS - Completed vs Completed Tab
  const [actAId, setActAId] = useState<string>('');
  const [actBId, setActBId] = useState<string>('');

  // SELECTIONS - Planned vs Completed Tab
  const [selWorkoutId, setSelWorkoutId] = useState<string>('');
  const [selActivityId, setSelActivityId] = useState<string>('');

  // Loaded comparisons history selected
  const [selectedComparisonId, setSelectedComparisonId] = useState<string>('');

  // Initial tab and selections setup
  useEffect(() => {
    if (queryTab === 'planned') {
      setActiveTab('planned-vs-completed');
    }
    if (queryActivityId) {
      setSelActivityId(queryActivityId);
    }
    if (queryWorkoutId) {
      setSelWorkoutId(queryWorkoutId);
    }
  }, [queryTab, queryActivityId, queryWorkoutId]);

  // Load all central registry datasets
  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [acts, workouts, comps, profile] = await Promise.all([
        getActivities(user.uid),
        getImportedWorkouts(user.uid),
        getWorkoutComparisons(user.uid),
        getAthleteProfile(user.uid)
      ]);

      const sortedActs = (acts || []).sort((a,b) => b.startDate.localeCompare(a.startDate));
      setActivities(sortedActs);
      setPlannedWorkouts(workouts || []);
      setSavedComparisons(comps || []);
      setAthleteProfile(profile);

      // Default Completed vs Completed Selectors if empty
      if (sortedActs.length > 0) {
        if (!actAId) setActAId(sortedActs[0].id);
        if (sortedActs.length > 1 && !actBId) setActBId(sortedActs[1].id);
      }

      // Default Planned vs Completed Selectors if empty and no query params parsed
      if (!queryWorkoutId && workouts && workouts.length > 0 && !selWorkoutId) {
        setSelWorkoutId(workouts[0].id);
      }
      if (!queryActivityId && sortedActs.length > 0 && !selActivityId) {
        setSelActivityId(sortedActs[0].id);
      }
    } catch (e) {
      console.error('Failed to load Compare Lab registry:', e);
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
  }, [user, authLoading]);

  // Load Laps data when the selected activity changes under Planned vs Completed Tab
  useEffect(() => {
    async function fetchLapsForActivity() {
      if (!selActivityId) {
        setActivityLaps(null);
        return;
      }
      try {
        setLoadingLaps(true);
        const laps = await getLaps(selActivityId);
        setActivityLaps(laps);
      } catch (err) {
        console.error('Failed to fetch activity laps:', err);
        setActivityLaps(null);
      } finally {
        setLoadingLaps(false);
      }
    }
    if (activeTab === 'planned-vs-completed') {
      fetchLapsForActivity();
    }
  }, [selActivityId, activeTab]);

  // SAVED PRESET LOADER
  const handleLoadSavedComparison = (comp: any) => {
    setActiveTab('planned-vs-completed');
    setSelWorkoutId(comp.plannedWorkoutId || '');
    setSelActivityId(comp.completedActivityId || '');
    setSelectedComparisonId(comp.id);
  };

  const handleDeleteSavedComparison = async (compId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm('Are you sure you want to delete this saved comparison record?')) return;
    try {
      await deleteWorkoutComparison(user.uid, compId);
      const updatedComps = await getWorkoutComparisons(user.uid);
      setSavedComparisons(updatedComps || []);
      if (selectedComparisonId === compId) {
        setSelectedComparisonId('');
      }
    } catch (err) {
      console.error('Failed to delete comparison:', err);
    }
  };

  // DETERMINISTIC CALCULATOR ENGINE - PLANNED VS COMPLETED
  const getPlannedVsCompletedReport = () => {
    const workout = plannedWorkouts.find(w => w.id === selWorkoutId);
    const activity = activities.find(a => a.id === selActivityId);

    const getFailureReport = (errorLabel: string) => {
      return {
        success: false,
        errorLabel,
        errorMsg: errorLabel,
        overallMatch: 0,
        matchStatus: 'Not enough data' as const,
        durationPct: 0,
        distancePct: 0,
        hrPct: 0,
        pacePct: 0,
        powerPct: 0,
        cadencePct: 0,
        plannedDuration: 0,
        actualDuration: 0,
        plannedDistance: 0,
        actualDistance: 0,
        targetHrZone: null as string | null,
        targetHrBpmRange: null as [number, number] | null,
        actualHr: 0,
        targetPower: 0,
        actualPower: 0,
        targetCadence: 0,
        actualCadence: 0,
        hasDistanceTarget: false,
        hasHrTarget: false,
        hasPaceTarget: false,
        hasPowerTarget: false,
        hasCadenceTarget: false,
        workoutId: '',
        activityId: '',
        workoutTitle: '',
        activityName: '',
        flatStepsCount: 0,
        stepComparisons: [] as any[],
        activeMetricsList: [] as any[]
      };
    };

    if (!workout) return getFailureReport("Workout steps required");
    if (!activity) return getFailureReport("Completed activity required");

    const flatSteps = flattenWorkoutSteps(workout.steps || []);
    if (flatSteps.length === 0) {
      return getFailureReport("Workout steps required");
    }

    // 1. Durations
    const plannedDuration = workout.estimatedDurationSeconds || 0;
    const actualDuration = activity.movingTimeSeconds || 0;
    let durationPct = 1.0;
    if (plannedDuration > 0) {
      durationPct = Math.max(0, Math.min(1, 1 - Math.abs(actualDuration - plannedDuration) / plannedDuration));
    }

    // 2. Distances
    const plannedDistance = workout.estimatedDistanceMeters || 0;
    const actualDistance = activity.distanceMeters || 0;
    let distancePct = 1.0;
    let hasDistanceTarget = plannedDistance > 0;
    if (hasDistanceTarget) {
      distancePct = Math.max(0, Math.min(1, 1 - Math.abs(actualDistance - plannedDistance) / plannedDistance));
    }

    // 3. Heart Rate check
    const hrZonesRaw = athleteProfile?.hrZones;
    let targetHrZone: string | null = null;
    let targetHrBpmRange: [number, number] | null = null;
    
    for (const step of flatSteps) {
      if (step.targetHeartRateZone) {
        targetHrZone = step.targetHeartRateZone;
        break;
      }
    }
    if (targetHrZone && hrZonesRaw && hrZonesRaw[targetHrZone]) {
      targetHrBpmRange = hrZonesRaw[targetHrZone];
    }

    const actualHr = activity.averageHeartRate || 0;
    let hrPct = 1.0;
    let hasHrTarget = !!targetHrZone;
    if (hasHrTarget) {
      if (actualHr <= 0) {
        return getFailureReport("Heart rate stream required");
      }
      if (targetHrBpmRange) {
        const [minHr, maxHr] = targetHrBpmRange;
        if (actualHr >= minHr && actualHr <= maxHr) {
          hrPct = 1.0;
        } else {
          const midHr = (minHr + maxHr) / 2;
          hrPct = Math.max(0, Math.min(1, 1 - Math.abs(actualHr - midHr) / midHr));
        }
      }
    }

    // 4. Pace targets check
    let hasPaceTarget = false;
    let totalPaceTargetsSeconds = 0;
    let paceTargetCount = 0;
    
    for (const step of flatSteps) {
      if (step.targetPaceMinSecPerKm) {
        hasPaceTarget = true;
        const secs = parsePaceStringToSeconds(step.targetPaceMinSecPerKm);
        if (secs) {
          totalPaceTargetsSeconds += secs;
          paceTargetCount++;
        }
      }
    }

    const actualPaceAvgSec = activity.movingTimeSeconds / ((activity.distanceMeters || 1) / 1000);
    let pacePct = 1.0;
    if (hasPaceTarget) {
      if (!isRealNumber(actualPaceAvgSec) || actualPaceAvgSec <= 0 || actualPaceAvgSec === Infinity || activity.distanceMeters <= 0) {
        return getFailureReport("Pace stream required");
      }
      if (paceTargetCount > 0) {
        const avgTargetPaceSec = totalPaceTargetsSeconds / paceTargetCount;
        pacePct = Math.max(0, Math.min(1, 1 - Math.abs(actualPaceAvgSec - avgTargetPaceSec) / avgTargetPaceSec));
      }
    }

    // 5. Power targets check
    let targetPower = 0;
    for (const step of flatSteps) {
      if (step.targetPowerWatts) {
        targetPower = step.targetPowerWatts;
        break;
      }
    }
    const actualPower = activity.averageWatts || 0;
    let powerPct = 1.0;
    let hasPowerTarget = targetPower > 0;
    if (hasPowerTarget) {
      if (actualPower > 0) {
        powerPct = Math.max(0, Math.min(1, 1 - Math.abs(actualPower - targetPower) / targetPower));
      } else {
        powerPct = 0; // Missing power sensor data entirely
      }
    }

    // 6. Cadence targets check
    let targetCadence = 0;
    for (const step of flatSteps) {
      if (step.targetCadence) {
        targetCadence = step.targetCadence;
        break;
      }
    }
    const actualCadence = activity.cadenceAvg || 0;
    let cadencePct = 1.0;
    let hasCadenceTarget = targetCadence > 0;
    if (hasCadenceTarget) {
      if (actualCadence > 0) {
        cadencePct = Math.max(0, Math.min(1, 1 - Math.abs(actualCadence - targetCadence) / targetCadence));
      } else {
        cadencePct = 0; // Missing cadence data
      }
    }

    // Calculate Average Execution Match from active targets
    const activeMetricsList = [];
    if (plannedDuration > 0) activeMetricsList.push({ name: 'Duration', pct: durationPct });
    if (hasDistanceTarget) activeMetricsList.push({ name: 'Distance', pct: distancePct });
    if (hasHrTarget) activeMetricsList.push({ name: 'Heart Rate', pct: hrPct });
    if (hasPaceTarget) activeMetricsList.push({ name: 'Pace', pct: pacePct });
    if (hasPowerTarget) activeMetricsList.push({ name: 'Power', pct: powerPct });
    if (hasCadenceTarget) activeMetricsList.push({ name: 'Cadence', pct: cadencePct });

    const totalPct = activeMetricsList.reduce((sum, item) => sum + item.pct, 0);
    const overallMatch = activeMetricsList.length > 0 
      ? Math.round((totalPct / activeMetricsList.length) * 100)
      : 100;

    let matchStatus: 'Matched' | 'Partial' | 'Not enough data' = 'Partial';
    if (overallMatch >= 90) {
      matchStatus = 'Matched';
    } else if (overallMatch < 60) {
      matchStatus = 'Partial';
    }

    // Step-by-Step loop comparisons
    const stepComparisons = flatSteps.map((step, idx) => {
      const associatedLap = activityLaps && activityLaps[idx] ? activityLaps[idx] : null;
      let matched = false;
      let status: 'Matched' | 'Partial' | 'Not enough data' = 'Not enough data';
      let stepAccuracy = 100;

      if (associatedLap) {
        const metricsCounted = [];
        let scoreSum = 0;

        // Compare step duration
        if (step.durationSeconds) {
          const assocDuration = associatedLap.movingTimeSeconds || 0;
          const durAcc = Math.max(0, Math.min(1, 1 - Math.abs(assocDuration - step.durationSeconds) / step.durationSeconds));
          scoreSum += durAcc;
          metricsCounted.push(durAcc);
        }

        // Compare step distance
        if (step.distanceMeters) {
          const assocDist = associatedLap.distanceMeters || 0;
          const distAcc = Math.max(0, Math.min(1, 1 - Math.abs(assocDist - step.distanceMeters) / step.distanceMeters));
          scoreSum += distAcc;
          metricsCounted.push(distAcc);
        }

        // Compare step target pace
        if (step.targetPaceMinSecPerKm) {
          const targetPaceSec = parsePaceStringToSeconds(step.targetPaceMinSecPerKm);
          const lapPaceSec = associatedLap.paceSecPerKm || (associatedLap.movingTimeSeconds / (associatedLap.distanceMeters / 1000));
          if (targetPaceSec && isRealNumber(lapPaceSec) && lapPaceSec > 0) {
            const paceAcc = Math.max(0, Math.min(1, 1 - Math.abs(lapPaceSec - targetPaceSec) / targetPaceSec));
            scoreSum += paceAcc;
            metricsCounted.push(paceAcc);
          }
        }

        stepAccuracy = metricsCounted.length > 0 ? Math.round((scoreSum / metricsCounted.length) * 100) : 100;
        status = stepAccuracy >= 85 ? 'Matched' : 'Partial';
        matched = true;
      }

      return {
        stepIndex: idx + 1,
        stepName: step.name || `${step.type.toUpperCase()} block`,
        stepType: step.type,
        planned: step,
        completed: associatedLap,
        matched,
        stepAccuracy,
        status
      };
    });

    return {
      success: true,
      errorLabel: "",
      errorMsg: "",
      overallMatch,
      matchStatus,
      durationPct,
      distancePct,
      hrPct,
      pacePct,
      powerPct,
      cadencePct,
      plannedDuration,
      actualDuration,
      plannedDistance,
      actualDistance,
      targetHrZone,
      targetHrBpmRange,
      actualHr,
      targetPower,
      actualPower,
      targetCadence,
      actualCadence,
      hasDistanceTarget,
      hasHrTarget,
      hasPaceTarget,
      hasPowerTarget,
      hasCadenceTarget,
      workoutId: workout.id,
      activityId: activity.id,
      workoutTitle: workout.title,
      activityName: activity.name,
      flatStepsCount: flatSteps.length,
      stepComparisons,
      activeMetricsList
    };
  };

  const report = getPlannedVsCompletedReport();

  // SAVE WORKOUT COMPARISON TO FIRESTORE
  const handleSaveComparison = async () => {
    if (!user || !report.success) return;
    setIsSaving(true);
    try {
      const comparisonId = `match_${report.workoutId}_vs_${report.activityId}`;
      const payload = {
        id: comparisonId,
        userId: user.uid,
        plannedWorkoutId: report.workoutId,
        completedActivityId: report.activityId,
        source: 'manual-comparison',
        matchedAt: new Date().toISOString(),
        summary: {
          workoutTitle: report.workoutTitle,
          activityName: report.activityName,
          executionMatchScore: report.overallMatch,
          matchStatus: report.matchStatus,
          plannedDuration: report.plannedDuration,
          actualDuration: report.actualDuration,
          plannedDistance: report.plannedDistance,
          actualDistance: report.actualDistance,
          metricsChecked: report.activeMetricsList ? report.activeMetricsList.map(m => m.name) : []
        },
        stepComparisons: report.stepComparisons ? report.stepComparisons.map(s => ({
          stepIndex: s.stepIndex,
          stepName: s.stepName,
          matched: s.matched,
          stepAccuracy: s.stepAccuracy,
          status: s.status
        })) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveWorkoutComparison(user.uid, comparisonId, payload);
      alert('Workout comparison saved successfully in the local archive!');
      
      const comps = await getWorkoutComparisons(user.uid);
      setSavedComparisons(comps || []);
      setSelectedComparisonId(comparisonId);
    } catch (err) {
      console.error('Failed to save workout comparison:', err);
      alert('Failed to write comparison document to database.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Initializing Laboratory Datasets...</span>
      </div>
    );
  }

  // SELECTORS COMPONENT
  const actA = activities.find(a => a.id === actAId);
  const actB = activities.find(a => a.id === actBId);

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg shadow-sm">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Track.Studio Analytical Compare Lab</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5 uppercase font-mono">
              Deterministic diagnostics matching actual activities and structured workout plans
            </p>
          </div>
        </div>

        {/* LAB SEGMENTS SWITCHER */}
        <div className="flex border-b border-white/10 gap-4">
          <button
            onClick={() => setActiveTab('completed-vs-completed')}
            className={`py-3 px-1 text-xs uppercase font-bold tracking-wider relative transition-all cursor-pointer ${
              activeTab === 'completed-vs-completed' 
                ? 'text-[#FC5200] border-b-2 border-[#FC5200]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Completed vs Completed (Side-by-Side)
          </button>
          <button
            onClick={() => setActiveTab('planned-vs-completed')}
            className={`py-3 px-1 text-xs uppercase font-bold tracking-wider relative transition-all cursor-pointer ${
              activeTab === 'planned-vs-completed' 
                ? 'text-[#FC5200] border-b-2 border-[#FC5200]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Planned vs Completed (Deterministic Diagnostic)
          </button>
        </div>

        {/* SAVED COMPARISONS SIDEBAR HISTORY PANEL IF THEY EXIST */}
        {savedComparisons.length > 0 && activeTab === 'planned-vs-completed' && (
          <div className="bg-[#111113]/55 border border-white/10 p-4 rounded-lg space-y-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block">SAVED COMPARISONS HISTORY ARCHIVE</span>
            <div className="flex flex-wrap gap-3">
              {savedComparisons.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleLoadSavedComparison(c)}
                  className={`border text-[10px] p-2 rounded cursor-pointer transition-all flex items-center gap-2 font-mono ${
                    selectedComparisonId === c.id
                      ? 'border-[#FC5200] bg-[#FC5200]/10 text-white'
                      : 'border-white/5 bg-zinc-900/60 hover:border-white/15 text-zinc-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {c.summary?.executionMatchScore}% SCORE - {c.summary?.workoutTitle?.slice(0, 20)} vs {c.summary?.activityName?.slice(0, 20)}
                  </span>
                  <button
                    onClick={(e) => handleDeleteSavedComparison(c.id, e)}
                    className="p-1 text-zinc-500 hover:text-red-400 font-sans ml-1.5 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CORE VIEWPORTS */}

        {/* 1. COMPLETED VS COMPLETED VIEW */}
        {activeTab === 'completed-vs-completed' && (
          activities.length > 0 ? (
            <div className="space-y-6">
              
              {/* SELECTORS BLOCK */}
              <div className="bg-[#111113] border border-white/10 p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold font-mono">Select Activity A</span>
                  <select
                    value={actAId}
                    onChange={(e) => setActAId(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
                  >
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.startDate.slice(0,10)} - {a.name} ({formatDistanceKm(a.distanceMeters)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold font-mono">Select Activity B</span>
                  <select
                    value={actBId}
                    onChange={(e) => setActBId(e.target.value)}
                    className="w-full bg-[#1c1c1e] border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
                  >
                    <option value="">-- Choose Comparison Item --</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.startDate.slice(0,10)} - {a.name} ({formatDistanceKm(a.distanceMeters)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SIDE-BY-SIDE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* TARGET A */}
                <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start border-b border-white/10 pb-3">
                    <div>
                      <span className="text-sm font-sans text-zinc-400 font-bold uppercase tracking-wider">WORKOUT LAB A</span>
                      <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">{actA ? actA.name : 'Not selected'}</h3>
                    </div>
                    {actA && (
                      <span className="px-2 py-0.5 border border-white/10 bg-zinc-800/50 text-zinc-400 text-xs uppercase font-bold rounded">
                        {actA.sportType}
                      </span>
                    )}
                  </div>

                  {actA ? (
                    <div className="space-y-3 pt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">LOG DATE:</span>
                        <span className="text-white font-mono">{actA.startDate.slice(0, 10)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">GAP DISTANCE:</span>
                        <span className="text-[#FC5200] font-bold font-mono">{formatDistanceKm(actA.distanceMeters)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">MOVING DURATION:</span>
                        <span className="text-white font-mono">{formatDuration(actA.movingTimeSeconds)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">AVERAGE PACE:</span>
                        <span className="text-white font-mono">{formatPace(actA.movingTimeSeconds / (actA.distanceMeters / 1000))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">AVERAGE HR:</span>
                        <span className="text-white font-mono">{actA.averageHeartRate ? `${actA.averageHeartRate} bpm` : '—'}</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-dashed border-white/10">
                        <span className="text-zinc-400 uppercase font-mono">RPE (1-10 exertion):</span>
                        <span className="text-white font-mono">{actA.rpe || '—'}</span>
                      </div>
                      <div className="text-xs text-[#FC5200]/75 uppercase leading-relaxed font-mono">
                        * Athlete Notes: {actA.notes || '—'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 text-zinc-500 text-xs uppercase">
                      Choose an activity to load parameters
                    </div>
                  )}
                </div>

                {/* TARGET B */}
                <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-start border-b border-white/10 pb-3">
                    <div>
                      <span className="text-sm font-sans text-zinc-400 font-bold uppercase tracking-wider">WORKOUT LAB B</span>
                      <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">{actB ? actB.name : 'Not selected'}</h3>
                    </div>
                    {actB && (
                      <span className="px-2 py-0.5 border border-white/10 bg-zinc-800/50 text-zinc-400 text-xs uppercase font-bold rounded">
                        {actB.sportType}
                      </span>
                    )}
                  </div>

                  {actB ? (
                    <div className="space-y-3 pt-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">LOG DATE:</span>
                        <span className="text-white font-mono">{actB.startDate.slice(0, 10)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">GAP DISTANCE:</span>
                        <span className="text-[#FC5200] font-bold font-mono">{formatDistanceKm(actB.distanceMeters)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">MOVING DURATION:</span>
                        <span className="text-white font-mono">{formatDuration(actB.movingTimeSeconds)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">AVERAGE PACE:</span>
                        <span className="text-white font-mono">{formatPace(actB.movingTimeSeconds / (actB.distanceMeters / 1000))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400 uppercase font-mono">AVERAGE HR:</span>
                        <span className="text-white font-mono">{actB.averageHeartRate ? `${actB.averageHeartRate} bpm` : '—'}</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-dashed border-white/10">
                        <span className="text-zinc-400 uppercase font-mono">RPE (1-10 exertion):</span>
                        <span className="text-white font-mono">{actB.rpe || '—'}</span>
                      </div>
                      <div className="text-xs text-[#FC5200]/75 uppercase leading-relaxed font-mono">
                        * Athlete Notes: {actB.notes || '—'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 text-zinc-500 text-xs uppercase">
                      Choose a comparison target to inspect delta
                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
                <Database className="w-6 h-6 text-zinc-500" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-sm font-bold text-white uppercase">NOT ENOUGH DATA</h3>
                <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono animate-pulse">
                  Log activities into the central dashboard registry to enable an interactive workout comparison.
                </p>
              </div>
            </div>
          )
        )}

        {/* 2. PLANNED VS COMPLETED VIEW */}
        {activeTab === 'planned-vs-completed' && (
          <div className="space-y-6">
            
            {/* SELECTORS BLOCK */}
            <div className="bg-[#111113] border border-white/10 p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold font-mono">Select Planned Workout Plan</span>
                <select
                  value={selWorkoutId}
                  onChange={(e) => {
                    setSelWorkoutId(e.target.value);
                    setSelectedComparisonId('');
                  }}
                  className="w-full bg-[#1c1c1e] border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
                >
                  <option value="">-- Choose Planned Workout --</option>
                  {plannedWorkouts.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({w.sportType?.toUpperCase()} - {w.steps?.length || 0} steps)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold font-mono">Select Completed Strava Activity</span>
                <select
                  value={selActivityId}
                  onChange={(e) => {
                    setSelActivityId(e.target.value);
                    setSelectedComparisonId('');
                  }}
                  className="w-full bg-[#1c1c1e] border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-300 font-sans rounded"
                >
                  <option value="">-- Choose Completed Activity --</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.startDate.slice(0,10)} - {a.name} ({formatDistanceKm(a.distanceMeters)})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* ERROR / NOT ENOUGH DATA BANNER CHECK */}
            {!report.success ? (
              <div className="bg-[#111113] border border-red-500/20 rounded-lg p-8 text-center space-y-4 max-w-2xl mx-auto">
                <div className="w-12 h-12 bg-red-950/20 border border-red-500/30 flex items-center justify-center rounded-full mx-auto text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider">Not enough data to compare this workout.</h3>
                  <div className="px-3 py-1 bg-red-950/30 border border-red-900/40 text-[10px] text-red-400 font-mono uppercase rounded inline-block">
                    {report.errorLabel}
                  </div>
                  <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                    Ensure both selector dropdowns contain fully populated files and targets to proceed with diagnostics.
                  </p>
                </div>
              </div>
            ) : (
              // VALID REPORT VIEW
              <div className="space-y-6 animate-fade-in">

                {/* VISUAL COMPLIANCE ACCORDION */}
                <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  <div className="space-y-2 text-center md:text-left">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest font-mono block">DETERMINISTIC COMPLIANCE PERFORMANCE</span>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-2 justify-center md:justify-start">
                      <span className={report.overallMatch >= 90 ? "text-emerald-400" : report.overallMatch >= 60 ? "text-yellow-400" : "text-red-400"}>
                        {report.overallMatch}%
                      </span>
                      <span className="text-xs text-zinc-500 font-medium uppercase font-mono">Execution Match</span>
                    </h2>
                    <p className="text-xs text-zinc-400 font-mono max-w-md">
                      Formula aggregates structural volume duration, distance accuracy, heart rate pacing target alignment, power ranges, and workout step completions.
                    </p>
                  </div>

                  {/* STATUS PILL */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1.5 font-mono text-xs uppercase font-bold">
                      <span className="text-zinc-500">Status:</span>
                      <span className={`px-2.5 py-1 rounded text-[10px] border ${
                        report.matchStatus === 'Matched' 
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' 
                          : 'bg-yellow-950/40 border-yellow-800 text-yellow-400'
                      }`}>
                        {report.matchStatus}
                      </span>
                    </div>

                    <button
                      onClick={handleSaveComparison}
                      disabled={isSaving}
                      className="px-4 py-2 bg-[#FC5200] hover:bg-[#d84600] disabled:bg-zinc-800 text-black font-extrabold text-xs uppercase tracking-wider rounded transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving comparison...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Comparison</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

                {/* METRICS COMPARISON GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 border border-white/10 bg-white/5 rounded-lg overflow-hidden font-mono text-xs text-zinc-300">
                  
                  {/* HEADER ROW */}
                  <div className="bg-zinc-900/90 p-4 border-b border-white/10 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    TARGET METRIC
                  </div>
                  <div className="bg-zinc-900/90 p-4 border-b border-white/10 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    PLANNED TARGET
                  </div>
                  <div className="bg-zinc-900/90 p-4 border-b border-white/10 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    COMPLETED METRIC / DELTA
                  </div>

                  {/* ROW 1: DURATION */}
                  <div className="bg-[#111113] p-4 flex items-center gap-2.5 border-b border-white/5 font-sans">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="font-bold text-white uppercase tracking-wider">Workout Duration</span>
                  </div>
                  <div className="bg-[#111113] p-4 font-mono text-zinc-200 border-b border-white/5">
                    {formatDuration(report.plannedDuration)}
                  </div>
                  <div className="bg-[#111113] p-4 font-mono border-b border-white/5 flex flex-col justify-center gap-1">
                    <span className="text-white font-bold">{formatDuration(report.actualDuration)}</span>
                    <span className={`text-[10px] font-semibold ${
                      Math.abs(report.actualDuration - report.plannedDuration) <= 120 
                        ? 'text-emerald-400' 
                        : 'text-yellow-400'
                    }`}>
                      {formatDurationDelta(report.actualDuration - report.plannedDuration)} ({Math.round(report.durationPct * 100)}% match)
                    </span>
                  </div>

                  {/* ROW 2: DISTANCE */}
                  <div className="bg-[#111113] p-4 flex items-center gap-2.5 border-b border-white/5 font-sans">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    <span className="font-bold text-white uppercase tracking-wider">Total Distance</span>
                  </div>
                  <div className="bg-[#111113] p-4 font-mono text-zinc-200 border-b border-white/5">
                    {report.hasDistanceTarget ? formatDistanceKm(report.plannedDistance) : '—'}
                  </div>
                  <div className="bg-[#111113] p-4 font-mono border-b border-white/5 flex flex-col justify-center gap-1">
                    {report.hasDistanceTarget ? (
                      <>
                        <span className="text-white font-bold">{formatDistanceKm(report.actualDistance)}</span>
                        <span className={`text-[10px] font-semibold ${
                          Math.abs(report.actualDistance - report.plannedDistance) <= 150 
                            ? 'text-emerald-400' 
                            : 'text-yellow-400'
                        }`}>
                          {formatDistanceKmDelta(report.actualDistance - report.plannedDistance)} ({Math.round(report.distancePct * 100)}% match)
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-500 text-[10px] uppercase font-bold text-zinc-650">No distance target set</span>
                    )}
                  </div>

                  {/* ROW 3: HEART RATE */}
                  <div className="bg-[#111113] p-4 flex items-center gap-2.5 border-b border-white/5 font-sans">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="font-bold text-white uppercase tracking-wider">Heart Rate Target</span>
                  </div>
                  <div className="bg-[#111113] p-4 font-mono text-zinc-200 border-b border-white/5">
                    {report.hasHrTarget && report.targetHrBpmRange ? (
                      <div className="space-y-1">
                        <span className="text-white font-bold uppercase">{report.targetHrZone?.toUpperCase()} Range</span>
                        <span className="block text-[10px] text-zinc-400">{report.targetHrBpmRange[0]} - {report.targetHrBpmRange[1]} BPM</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="bg-[#111113] p-4 font-mono border-b border-white/5 flex flex-col justify-center gap-1">
                    {report.hasHrTarget ? (
                      <>
                        <span className="text-white font-bold">{report.actualHr ? `${Math.round(report.actualHr)} BPM` : '—'}</span>
                        <span className={`text-[10px] font-semibold ${
                          report.hrPct >= 0.90 ? 'text-emerald-400' : 'text-yellow-400'
                        }`}>
                          ({Math.round(report.hrPct * 100)}% alignment)
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-500 text-[10px] uppercase font-bold text-zinc-650">No heart rate target set</span>
                    )}
                  </div>

                  {/* ROW 4: POWER */}
                  <div className="bg-[#111113] p-4 flex items-center gap-2.5 border-b border-white/5 font-sans">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white uppercase tracking-wider">Power Target</span>
                  </div>
                  <div className="bg-[#111113] p-4 font-mono text-zinc-200 border-b border-white/5">
                    {report.hasPowerTarget ? `${report.targetPower} Watts` : '—'}
                  </div>
                  <div className="bg-[#111113] p-4 font-mono border-b border-white/5 flex flex-col justify-center gap-1">
                    {report.hasPowerTarget ? (
                      <>
                        <span className="text-white font-bold">{report.actualPower ? `${Math.round(report.actualPower)} Watts` : '—'}</span>
                        <span className={`text-[10px] font-semibold ${
                          Math.abs(report.actualPower - report.targetPower) <= 15 ? 'text-emerald-400' : 'text-yellow-400'
                        }`}>
                          {report.actualPower - report.targetPower > 0 ? '+' : ''}{Math.round(report.actualPower - report.targetPower)} Watts ({Math.round(report.powerPct * 100)}% accuracy)
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-500 text-[10px] uppercase font-bold text-zinc-650">No power target set</span>
                    )}
                  </div>

                  {/* ROW 5: CADENCE */}
                  <div className="bg-[#111113] p-4 flex items-center gap-2.5 font-sans">
                    <Gauge className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white uppercase tracking-wider">Target Cadence</span>
                  </div>
                  <div className="bg-[#111113] p-4 font-mono text-zinc-200">
                    {report.hasCadenceTarget ? `${report.targetCadence} RPM` : '—'}
                  </div>
                  <div className="bg-[#111113] p-4 font-mono flex flex-col justify-center gap-1">
                    {report.hasCadenceTarget ? (
                      <>
                        <span className="text-white font-bold">{report.actualCadence ? `${Math.round(report.actualCadence)} RPM` : '—'}</span>
                        <span className={`text-[10px] font-semibold ${
                          Math.abs(report.actualCadence - report.targetCadence) <= 5 ? 'text-emerald-400' : 'text-yellow-400'
                        }`}>
                          {report.actualCadence - report.targetCadence > 0 ? '+' : ''}{Math.round(report.actualCadence - report.targetCadence)} RPM ({Math.round(report.cadencePct * 100)}% accuracy)
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-500 text-[10px] uppercase font-bold text-zinc-650">No cadence target set</span>
                    )}
                  </div>

                </div>

                {/* STEP-BY-STEP DIAGNOISTIC BREAKDOWN */}
                <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5 shadow-sm">
                  
                  <div className="flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 inline-flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#FC5200]" /> Step-by-Step Lap Diagnostic Alignment
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase mt-1">
                      Compares sequential elements of planned workout steps against actual recorded laps synced from devices
                    </p>
                  </div>

                  {loadingLaps ? (
                    <div className="flex items-center justify-center py-10 text-xs uppercase font-mono text-zinc-400 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FC5200]" />
                      <span>Aligning laps sequential arrays...</span>
                    </div>
                  ) : !activityLaps || activityLaps.length === 0 ? (
                    <div className="bg-zinc-900/60 border border-dashed border-white/5 rounded-lg p-6 text-center space-y-3">
                      <Info className="w-6 h-6 text-[#FC5200] mx-auto opacity-70" />
                      <p className="text-xs text-zinc-400 font-mono uppercase max-w-md mx-auto leading-relaxed">
                        Step-by-step diagnostic requires sequential lap streams. Go to the Activity Detail page and click "Sync Laps & Splits" to unlock full telemetry alignment.
                      </p>
                    </div>
                  ) : (
                    // RENDER COMPARISONS TABLE
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap font-mono text-zinc-300">
                        <thead className="text-[9px] text-[#FC5200] font-black uppercase tracking-widest border-b border-white/10">
                          <tr>
                            <th className="pb-3 px-2">STEP #</th>
                            <th className="pb-3 px-2">PLANNED TARGET STEP</th>
                            <th className="pb-3 px-2 text-indigo-400">RECORDED LAP MATCH</th>
                            <th className="pb-3 px-2">DELTA / DEVIATION</th>
                            <th className="pb-3 px-2 text-right">EXECUTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {report.stepComparisons?.map((stepMatch: any) => {
                            const planned = stepMatch.planned;
                            const completed = stepMatch.completed;

                            return (
                              <tr key={stepMatch.stepIndex} className="hover:bg-zinc-950/40 transition-colors">
                                <td className="py-3 px-2 text-zinc-500 font-bold">
                                  {stepMatch.stepIndex}
                                </td>
                                
                                <td className="py-3 px-2">
                                  <div className="space-y-1">
                                    <span className="text-white font-bold block">{stepMatch.stepName}</span>
                                    <div className="flex gap-2 text-[10px] text-zinc-400 uppercase">
                                      {planned.durationSeconds && <span>DUR: {formatDuration(planned.durationSeconds)}</span>}
                                      {planned.distanceMeters && <span>DIST: {formatDistanceKm(planned.distanceMeters)}</span>}
                                      {planned.targetPaceMinSecPerKm && <span className="text-[#FC5200]">PACE: {planned.targetPaceMinSecPerKm}</span>}
                                      {planned.targetHeartRateZone && <span>HR: {planned.targetHeartRateZone?.toUpperCase()}</span>}
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-2">
                                  {completed ? (
                                    <div className="space-y-1 text-zinc-300">
                                      <span className="font-bold block text-white">Lap {completed.lapIndex || stepMatch.stepIndex} ({completed.name || 'Auto-lap'})</span>
                                      <div className="flex gap-2 text-[10px] text-zinc-400">
                                        <span>DUR: {formatDuration(completed.movingTimeSeconds)}</span>
                                        <span>DIST: {formatDistanceKm(completed.distanceMeters)}</span>
                                        {completed.paceSecPerKm && <span className="text-indigo-400">PACE: {formatPace(completed.paceSecPerKm)}</span>}
                                        {completed.averageHeartRate && <span>HR: {Math.round(completed.averageHeartRate)} BPM</span>}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-zinc-650 uppercase">No corresponding lap file synced</span>
                                  )}
                                </td>

                                <td className="py-3 px-2 font-mono">
                                  {completed ? (
                                    <div className="space-y-1 text-[10px] leading-tight">
                                      {planned.durationSeconds && (
                                        <div className="flex justify-between w-36">
                                          <span className="text-zinc-500">DUR:</span>
                                          <span className={Math.abs(completed.movingTimeSeconds - planned.durationSeconds) <= 15 ? 'text-emerald-400' : 'text-yellow-400'}>
                                            {formatDurationDelta(completed.movingTimeSeconds - planned.durationSeconds)}
                                          </span>
                                        </div>
                                      )}
                                      {planned.distanceMeters && (
                                        <div className="flex justify-between w-36">
                                          <span className="text-zinc-500">DIST:</span>
                                          <span className={Math.abs(completed.distanceMeters - planned.distanceMeters) <= 30 ? 'text-emerald-400' : 'text-yellow-400'}>
                                            {formatDistanceKmDelta(completed.distanceMeters - planned.distanceMeters)}
                                          </span>
                                        </div>
                                      )}
                                      {planned.targetPaceMinSecPerKm && completed.paceSecPerKm && (
                                        <div className="flex justify-between w-36">
                                          <span className="text-zinc-500">PACE:</span>
                                          <span className="text-indigo-400">
                                            {formatPaceDelta(completed.paceSecPerKm - (parsePaceStringToSeconds(planned.targetPaceMinSecPerKm) || 0))}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-zinc-650">—</span>
                                  )}
                                </td>

                                <td className="py-3 px-2 text-right">
                                  {completed ? (
                                    <div className="inline-flex flex-col items-end">
                                      <span className={`text-[11px] font-extrabold ${
                                        stepMatch.stepAccuracy >= 85 ? 'text-emerald-400' : 'text-yellow-400'
                                      }`}>
                                        {stepMatch.stepAccuracy}%
                                      </span>
                                      <span className="text-[8px] text-zinc-500 uppercase">{stepMatch.status}</span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-650 inline-block px-1 border border-zinc-900 text-[10px] uppercase font-bold text-zinc-650 rounded bg-zinc-950/20">
                                      OMITTED
                                    </span>
                                  )}
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default function CompareLabPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Loading Laboratory Content...</span>
      </div>
    }>
      <CompareLabContent />
    </Suspense>
  );
}
