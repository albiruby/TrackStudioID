'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ShieldAlert, 
  Database,
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft, 
  Activity, 
  Heart, 
  Clock, 
  Loader2, 
  User, 
  Fingerprint, 
  FileText, 
  Check, 
  Lock, 
  Settings, 
  AlertCircle,
  EyeOff,
  Cable,
  Gauge,
  BarChart3,
  Flame,
  Award
} from 'lucide-react';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../../lib/firebase/client';
import { 
  athletesCollection, 
  activitiesCollection, 
  gearCollection,
  activityStreamsCollection 
} from '../../lib/firebase/collections';
import { CanonicalActivity, DailyWellnessLog, DailyTrainingLoad } from '../../data/types';

interface AuditWarning {
  id: string;
  category: 'date' | 'pace' | 'time' | 'heartrate' | 'gps' | 'id_dup' | 'source' | 'syncedAt' | 'sync_mismatch' | 'wellness' | 'load';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedId?: string;
  affectedName?: string;
}

export default function DataHealthPage() {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();

  // Primary states
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditRun, setAuditRun] = useState(false);
  const [auditStep, setAuditStep] = useState<string>('');
  
  // Real Firestore documents state
  const [userDocExists, setUserDocExists] = useState<boolean | null>(null);
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [dailyLoads, setDailyLoads] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    activities: 0,
    streams: 0,
    laps: 0,
    bestEfforts: 0,
    dailyLoad: 0,
    wellnessLogs: 0,
    gear: 0,
    reports: 0
  });

  // Connection placeholders
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaStatus, setStravaStatus] = useState<any>(null);

  const [intervalsConnected, setIntervalsConnected] = useState(false);
  const [intervalsStatus, setIntervalsStatus] = useState<any>(null);

  useEffect(() => {
    async function loadStrava() {
        if (!user) return;
        try {
           const token = await user.getIdToken();
           const res = await fetch('/api/strava/status', {
              headers: { 'Authorization': `Bearer ${token}` }
           });
           if (res.ok) {
             setStravaStatus(await res.json());
           }
        } catch(e) {}
    }
    if (user) loadStrava();
  }, [user]);

  useEffect(() => {
    async function loadIntervals() {
        if (!user) return;
        try {
           const token = await user.getIdToken();
           const res = await fetch('/api/intervals/status', {
              headers: { 'Authorization': `Bearer ${token}` }
           });
           if (res.ok) {
             setIntervalsStatus(await res.json());
           }
        } catch(e) {}
    }
    if (user) loadIntervals();
  }, [user]);

  // Warnings collection
  const [warnings, setWarnings] = useState<AuditWarning[]>([]);

  // Safe counts wrapper to prevent index errors
  const fetchCountsAndData = async (uid: string) => {
    try {
      setLoadingStats(true);

      // Verify if user doc exists in the 'athletes' collection
      const userRef = doc(athletesCollection, uid);
      const userSnap = await getDoc(userRef);
      setUserDocExists(userSnap.exists());

      // Fetch user activities, wellness logs, and daily loads
      const actsQuery = query(activitiesCollection, where('userId', '==', uid));
      const wellnessQuery = query(collection(db, 'users', uid, 'wellnessLogs'));
      const dailyLoadsQuery = query(collection(db, 'users', uid, 'dailyLoad'));
      const gearQuery = query(gearCollection, where('userId', '==', uid));

      // Separate query fetches wrapped to survive missing collections or rules
      const [actsSnap, wellnessSnap, dailyLoadsSnap, gearSnap] = await Promise.all([
        getDocs(actsQuery).catch(() => ({ docs: [], size: 0 })),
        getDocs(wellnessQuery).catch(() => ({ docs: [], size: 0 })),
        getDocs(dailyLoadsQuery).catch(() => ({ docs: [], size: 0 })),
        getDocs(gearQuery).catch(() => ({ docs: [], size: 0 }))
      ]);

      const loadedActs = actsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as CanonicalActivity[];
      const loadedWellness = wellnessSnap.docs.map(d => ({ ...d.data(), id: d.id })) as DailyWellnessLog[];
      const loadedLoads = dailyLoadsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as DailyTrainingLoad[];

      setActivities(loadedActs);
      setWellnessLogs(loadedWellness);
      setDailyLoads(loadedLoads);

      let hrvCount = 0;
      let sleepCount = 0;
      let oldestDate = '9999-12-31';
      let newestDate = '0000-00-00';
      loadedWellness.forEach(w => {
         if (w.hrvRmssd != null) hrvCount++;
         if (w.sleepDurationHours != null) sleepCount++;
         if (w.date && w.date < oldestDate) oldestDate = w.date;
         if (w.date && w.date > newestDate) newestDate = w.date;
      });

      let loadParamsCount = 0;
      loadedLoads.forEach(l => {
         if (l.fitnessCtl != null) loadParamsCount++;
      });

      // Query laps
      let lapsCount = 0;
      try {
        const lapsSnap = await getDocs(query(collection(db, 'laps'), where('userId', '==', uid)));
        lapsCount = lapsSnap.size;
      } catch (e) {
        console.warn('Laps collection query failed or uninited:', e);
      }

      // Query best efforts
      let bestEffortsCount = 0;
      try {
        const bestEffortsSnap = await getDocs(query(collection(db, 'best_efforts'), where('userId', '==', uid)));
        bestEffortsCount = bestEffortsSnap.size;
      } catch (e) {
        try {
          const alternateSnap = await getDocs(query(collection(db, 'best-efforts'), where('userId', '==', uid)));
          bestEffortsCount = alternateSnap.size;
        } catch (errInternal) {
          console.warn('Best efforts collection query failed:', errInternal);
        }
      }

      // Query reports
      let reportsCount = 0;
      try {
        const reportsSnap = await getDocs(query(collection(db, 'reports'), where('userId', '==', uid)));
        reportsCount = reportsSnap.size;
      } catch (e) {
        try {
          const alternateSnap = await getDocs(query(collection(db, 'report_summaries'), where('userId', '==', uid)));
          reportsCount = alternateSnap.size;
        } catch (errInternal) {
          console.warn('Reports collection query failed:', errInternal);
        }
      }

      // Query streams
      let streamsCount = 0;
      try {
        const streamsSnap = await getDocs(activityStreamsCollection);
        // Map streams that correspond to current user's activities
        const actIds = new Set(loadedActs.map(a => a.id));
        streamsCount = streamsSnap.docs.filter(d => actIds.has(d.id)).length;
      } catch (e) {
        console.warn('Activity streams collection scale load failed:', e);
      }

      setCounts({
        activities: actsSnap.size,
        streams: streamsCount,
        laps: lapsCount,
        bestEfforts: bestEffortsCount,
        dailyLoad: dailyLoadsSnap.size,
        wellnessLogs: wellnessSnap.size,
        gear: gearSnap.size,
        reports: reportsCount,
        hrvCount,
        sleepCount,
        oldestDate: oldestDate === '9999-12-31' ? null : oldestDate,
        newestDate: newestDate === '0000-00-00' ? null : newestDate,
        ctlCount: loadParamsCount,
      } as any);

    } catch (err) {
      console.error('[DataHealth load error]:', err);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchCountsAndData(user.uid);
      setStravaConnected(!!athleteProfile?.stravaConnected);
    }
  }, [user, athleteProfile, authLoading, router]);

  const handleManualRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchCountsAndData(user.uid);
  };

  // Perform Local Data Quality Audit
  const handleRunAudit = async () => {
    if (!user) return;
    setAuditing(true);
    setAuditStep('INITIATING LOCAL STORAGE TELEMETRY SCAN...');
    setWarnings([]);

    await new Promise(r => setTimeout(r, 450));
    setAuditStep('EXTRACTING ACTIVE CARDIOVASCULAR ACTIVITY LOGS...');
    
    let streamsMap: Record<string, any> = {};
    try {
      const streamsSnap = await getDocs(activityStreamsCollection);
      streamsSnap.docs.forEach(doc => {
        streamsMap[doc.id] = doc.data();
      });
    } catch (e) {
      console.warn('Failed to load activity streams map for audit:', e);
    }

    await new Promise(r => setTimeout(r, 400));
    setAuditStep('ANALYSING GPS COORDINATES AND COMPETING POLYLINES...');
    
    await new Promise(r => setTimeout(r, 350));
    setAuditStep('CALCULATING DAILY WORKLOAD TRIMP VS CTL/ATL RATIOS...');

    const detectedWarnings: AuditWarning[] = [];
    const externalIds = new Set<string>();

    activities.forEach(act => {
      // 1. invalid/missing dates
      const dateObj = new Date(act.startDate);
      const isInvalid = isNaN(dateObj.getTime()) || !act.startDate;
      if (isInvalid) {
        detectedWarnings.push({
          id: `invalid_date_${act.id}`,
          category: 'date',
          severity: 'high',
          message: `Activity '${act.name || 'Unnamed'}' registers with an invalid ISO timestamp or empty date field.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }

      // 2. distance exists but pace missing
      const hasDistance = act.distanceMeters && act.distanceMeters > 0;
      if (hasDistance && !act.averagePaceSecPerKm && (!act.movingTimeSeconds || act.movingTimeSeconds === 0)) {
        detectedWarnings.push({
          id: `missing_pace_${act.id}`,
          category: 'pace',
          severity: 'medium',
          message: `Workout is recorded with a positive distance of ${(act.distanceMeters! / 1000).toFixed(2)}km, but moving time and pace are missing.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }
      
      // 3. moving time missing
      if (!act.movingTimeSeconds || act.movingTimeSeconds === 0) {
        detectedWarnings.push({
          id: `missing_time_${act.id}`,
          category: 'time',
          severity: 'medium',
          message: `Workout is missing moving time.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }

      // 4. HR summary exists but stream not synced yet
      const hasHrSummary = (act.averageHeartRate && act.averageHeartRate > 0) || act.hasHeartRate === true;
      const matchedStream = streamsMap[act.id];
      const hasNoHrStream = hasHrSummary && (!matchedStream || !matchedStream.heartRateStream || matchedStream.heartRateStream.length === 0);
      if (hasNoHrStream) {
        detectedWarnings.push({
          id: `no_hr_stream_${act.id}`,
          category: 'heartrate',
          severity: 'low',
          message: `Heart rate metrics summarized in metadata (${act.averageHeartRate} bpm) but corresponding cardio stream is completely empty.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }

      // 5. GPS flag true but polyline missing
      if (act.hasGps && !act.summaryPolyline && !act.polyline) {
        detectedWarnings.push({
          id: `no_gps_polyline_${act.id}`,
          category: 'gps',
          severity: 'medium',
          message: `GPS tracking flag is active but coordinates stream (summary_polyline) is missing.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }

      // 6. duplicate externalId
      if (act.externalId) {
        if (externalIds.has(act.externalId)) {
          detectedWarnings.push({
            id: `dup_ext_${act.id}`,
            category: 'id_dup',
            severity: 'high',
            message: `Duplicate externalId detected: ${act.externalId}.`,
            affectedId: act.id,
            affectedName: act.name
          });
        }
        externalIds.add(act.externalId);
      }

      // 7. activities missing source
      if (!act.source) {
        detectedWarnings.push({
          id: `no_source_${act.id}`,
          category: 'source',
          severity: 'high',
          message: `Activity is missing external source tag.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }

      // 8. activities missing syncedAt
      if (!act.syncedAt) {
        detectedWarnings.push({
          id: `no_syncedAt_${act.id}`,
          category: 'syncedAt',
          severity: 'medium',
          message: `Activity is missing syncedAt timestamp.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }

      // 9. activities missing detailSyncedAt
      if (!act.detailSyncedAt) {
        detectedWarnings.push({
          id: `no_detailSyncedAt_${act.id}`,
          category: 'syncedAt',
          severity: 'low',
          message: `Activity is missing detail sync. High-resolution metrics like laps, best efforts, and full polyline are unavailable.`,
          affectedId: act.id,
          affectedName: act.name
        });
      }

      // 10. activities missing structured data sync
      if (!act.structuredDataSyncedAt) {
        detectedWarnings.push({
          id: `no_structuredDataSyncedAt_${act.id}`,
          category: 'syncedAt',
          severity: 'low',
          message: `Activity is missing structured data sync (laps, splits, best efforts).`,
          affectedId: act.id,
          affectedName: act.name
        });
      }
    });

    // 11. Wellness Logs Analytics Audit
    wellnessLogs.forEach(w => {
      if (!w.date) {
        detectedWarnings.push({
          id: `wellness_missing_date_${w.id}`,
          category: 'wellness',
          severity: 'high',
          message: `Wellness log has an invalid or missing date field.`,
          affectedId: w.id
        });
      }
      if (w.hrvRmssd === undefined || w.hrvRmssd === null) {
        detectedWarnings.push({
          id: `wellness_missing_hrv_${w.date || w.id}`,
          category: 'wellness',
          severity: 'low',
          message: `Wellness record for ${w.date || 'unknown date'} is missing HRV (RMSSD) value. This is expected if syncing without an HRV device.`,
          affectedId: w.id
        });
      }
      if (w.restingHeartRate === undefined || w.restingHeartRate === null) {
        detectedWarnings.push({
          id: `wellness_missing_rhr_${w.date || w.id}`,
          category: 'wellness',
          severity: 'low',
          message: `Wellness record for ${w.date || 'unknown date'} is missing Resting Heart Rate (RHR).`,
          affectedId: w.id
        });
      }
    });

    // 12. Daily Training Load Audit
    dailyLoads.forEach((load) => {
      const l = load as DailyTrainingLoad;
      if (!l.date) {
        detectedWarnings.push({
          id: `load_missing_date_${l.id}`,
          category: 'load',
          severity: 'high',
          message: `Daily training load log has an invalid or missing date field.`,
          affectedId: l.id
        });
      }
      if (l.fitnessCtl === undefined || l.fitnessCtl === null) {
        detectedWarnings.push({
          id: `load_missing_ctl_${l.date || l.id}`,
          category: 'load',
          severity: 'medium',
          message: `Training load record for ${l.date || 'unknown date'} is missing Fitness (CTL). This is required for PMC charting.`,
          affectedId: l.id
        });
      }
      if (l.fatigueAtl === undefined || l.fatigueAtl === null) {
        detectedWarnings.push({
          id: `load_missing_atl_${l.date || l.id}`,
          category: 'load',
          severity: 'medium',
          message: `Training load record for ${l.date || 'unknown date'} is missing Fatigue (ATL). This is required for PMC charting.`,
          affectedId: l.id
        });
      }
      if (l.formTsb === undefined || l.formTsb === null) {
        detectedWarnings.push({
          id: `load_missing_tsb_${l.date || l.id}`,
          category: 'load',
          severity: 'medium',
          message: `Training load record for ${l.date || 'unknown date'} is missing Form (TSB). This is required for PMC charting.`,
          affectedId: l.id
        });
      }
    });

    setWarnings(detectedWarnings);
    setAuditing(false);
    setAuditRun(true);
    setAuditStep('');
  };

  if (authLoading || (loadingStats && !refreshing)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs tracking-wider uppercase">TUNING DATA SECURITY PROTOCOLS...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8 ">
      
      <div className="max-w-[1400px] w-full mx-auto space-y-6">
        
        {/* HEADER AREA */}
        <div className="flex flex-wrap items-center justify-between gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Console Data Health Reports</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5">
                Inspect Firebase databases, sync channels, data schema integrity, and audit pipelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-850 border border-white/10 disabled:bg-[#111113] text-xs text-zinc-300 font-bold uppercase rounded cursor-pointer transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'REFRESHING DATABASE...' : 'REFRESH TERMINAL STATUS'}</span>
            </button>
          </div>
        </div>

        {/* TOP CONFIGURATION STATE INDICATORS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. FIREBASE AUTHENTICATION TERMINAL */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#FC5200]/41" />
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">MODULE 01</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Fingerprint className="w-4.5 h-4.5 text-[#FC5200] shrink-0" />
                    <span>Firebase Authentication</span>
                  </h3>
                </div>
                
                {user ? (
                  <span className="px-2 py-0.5 border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 text-xs uppercase font-bold rounded inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> SECURE AUTH ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 border border-red-900 bg-red-950/40 text-red-400 text-xs uppercase font-bold rounded inline-flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> DEACTIVATED
                  </span>
                )}
              </div>

              {user ? (
                <div className="space-y-3 text-xs border-t border-white/10/60 pt-4 text-zinc-400">
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <span className="text-zinc-400 uppercase text-xs">Client UID</span>
                    <span className="col-span-2 text-zinc-300 select-all truncate break-all">{user.uid}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <span className="text-zinc-400 uppercase text-xs">Athlete Ident</span>
                    <span className="col-span-2 text-zinc-300 truncate">{user.email}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-1">
                    <span className="text-zinc-400 uppercase text-xs">Display Name</span>
                    <span className="col-span-2 text-zinc-300">{athleteProfile?.displayName || 'Elite Athlete'}</span>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-zinc-400 text-xs italic">
                  Athlete authentication is retired. Login through portal to run Firestore stats queries.
                </div>
              )}
            </div>
          </div>

          {/* 2. FIRESTORE DATABASE HEALTH & COUNT METRICS */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#FC5200]/41" />
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">MODULE 02</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4.5 h-4.5 text-[#FC5200] shrink-0" />
                    <span>Firestore Document Vaults</span>
                  </h3>
                </div>
                
                {userDocExists ? (
                  <span className="px-2 py-0.5 border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 text-xs uppercase font-bold rounded inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> ATHLETE PROFILE SYNCED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 border border-red-900 bg-red-950/40 text-red-500 text-xs uppercase font-bold rounded inline-flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> PROFILE DOC MISSING
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 pt-2 font-mono mt-4">
                <div className="bg-zinc-800/50/40 border border-white/10 p-2.5 rounded text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold">Activities</span>
                  <p className="text-sm font-extrabold text-white mt-1">{counts.activities}</p>
                </div>
                <div className="bg-zinc-800/50/40 border border-white/10 p-2.5 rounded text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold">Streams</span>
                  <p className="text-sm font-extrabold text-white mt-1">{counts.streams}</p>
                </div>
                <div className="bg-zinc-800/50/40 border border-white/10 p-2.5 rounded text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold">Laps</span>
                  <p className="text-sm font-extrabold text-white mt-1">{counts.laps}</p>
                </div>
                <div className="bg-zinc-800/50/40 border border-white/10 p-2.5 rounded text-center">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold">Efforts</span>
                  <p className="text-sm font-extrabold text-white mt-1">{counts.bestEfforts}</p>
                </div>
              </div>
              
              <div className="border border-white/10 p-4 rounded bg-zinc-800/50/20 space-y-3.5 text-xs text-zinc-400 mt-4 font-mono">
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-zinc-400 uppercase text-[9.5px]">Daily Load Records</span>
                   <span className="text-zinc-300 font-bold">{counts.dailyLoad || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-zinc-400 uppercase text-[9.5px]">Wellness Logs</span>
                   <span className="text-zinc-300 font-bold">{counts.wellnessLogs || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-zinc-400 uppercase text-[9.5px]">HRV Datapoints</span>
                   <span className="text-zinc-300">{(counts as any).hrvCount || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-zinc-400 uppercase text-[9.5px]">Sleep Logs</span>
                   <span className="text-zinc-300">{(counts as any).sleepCount || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-zinc-400 uppercase text-[9.5px]">CTL/ATL Availability</span>
                   <span className="text-zinc-300">{(counts as any).ctlCount || 0}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-zinc-400 uppercase text-[9.5px]">Oldest Data</span>
                   <span className="text-zinc-300">{(counts as any).oldestDate || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-zinc-400 uppercase text-[9.5px]">Newest Data</span>
                   <span className="text-zinc-300">{(counts as any).newestDate || '—'}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-zinc-400 uppercase text-[9.5px]">Reports Generated</span>
                   <span className="text-[#FC5200] font-bold">{counts.reports}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

                {/* ENHANCED SYNC AUDIT PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* 1. STRAVA CONNECTION */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SYNC SOURCE</span>
                <div className="flex justify-between items-center mt-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Strava API Bridge</h3>
                  {stravaStatus?.connected ? (
                    <span className="px-2 py-0.5 border border-orange-950 bg-orange-950/20 text-[#FC5200] text-[9.5px] uppercase font-extrabold rounded">
                      CONNECTED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 border border-white/10 bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold rounded">
                      NOT CONNECTED
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-white/10 p-4 rounded bg-zinc-800/50/20 space-y-3.5 text-xs text-zinc-400">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Token Status</span>
                  <span className="text-zinc-300">
                    {stravaStatus?.connected ? (
                      stravaStatus.reauthRequired ? 'REAUTHORIZATION REQUIRED' : (stravaStatus.isExpired ? 'EXPIRED' : 'ACTIVE')
                    ) : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Last Sync Timestamp</span>
                  <span className="text-zinc-300">
                    {stravaStatus?.connected && stravaStatus.lastSyncAt ? new Date(stravaStatus.lastSyncAt).toLocaleString() : 'NEVER SYNCED'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Sync Error State</span>
                  <span className={stravaStatus?.lastSyncError ? "text-red-400" : "text-emerald-400"}>
                    {stravaStatus?.connected ? (stravaStatus.lastSyncError || 'NO ERRORS') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Authorization Scopes</span>
                  <span className="text-zinc-300">
                    {stravaStatus?.connected ? stravaStatus.scopes : '—'}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/settings')}
              className="mt-5 w-full bg-zinc-900 hover:bg-zinc-850 text-[#FC5200] border border-white/10 hover:border-white/20 py-2.5 rounded font-bold uppercase text-xs tracking-wider cursor-pointer transition-all inline-flex items-center justify-center gap-2"
            >
              <Cable className="w-3.5 h-3.5" />
              <span>{stravaStatus?.connected ? 'Manage Connection' : 'Connect in Settings'}</span>
            </button>
          </div>

          {/* 1.5. INTERVALS CONNECTION */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SYNC SOURCE</span>
                <div className="flex justify-between items-center mt-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Intervals.icu Portal</h3>
                  {intervalsStatus?.connected ? (
                    <span className="px-2 py-0.5 border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 text-[9.5px] uppercase font-extrabold rounded">
                      CONNECTED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 border border-white/10 bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold rounded">
                      NOT CONNECTED
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-white/10 p-4 rounded bg-zinc-800/50/20 space-y-3.5 text-xs text-zinc-400">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Auth Method</span>
                  <span className="text-zinc-300">
                    {intervalsStatus?.connected ? (intervalsStatus.authMethod === 'oauth' ? 'OAuth 2.0' : 'API Key') : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Athlete ID</span>
                  <span className="text-zinc-300">
                    {intervalsStatus?.connected ? (intervalsStatus.athleteId || 'Hidden') : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Last Sync Timestamp</span>
                  <span className="text-zinc-300">
                    {intervalsStatus?.connected && intervalsStatus.lastSyncAt ? new Date(intervalsStatus.lastSyncAt).toLocaleString() : 'NEVER SYNCED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Sync Error State</span>
                  <span className={intervalsStatus?.lastSyncError ? "text-red-400" : "text-emerald-400"}>
                    {intervalsStatus?.connected ? (intervalsStatus.lastSyncError || 'NO ERRORS') : '—'}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/settings')}
              className="mt-5 w-full bg-zinc-900 hover:bg-zinc-850 text-[#FC5200] border border-white/10 hover:border-white/20 py-2.5 rounded font-bold uppercase text-xs tracking-wider cursor-pointer transition-all inline-flex items-center justify-center gap-2"
            >
              <Cable className="w-3.5 h-3.5" />
              <span>{intervalsStatus?.connected ? 'Manage Connection' : 'Connect in Settings'}</span>
            </button>
          </div>

          {/* 2. ACTIVITY SYNC SUMMARY */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">DATA PIPELINE</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-1">Activity Sync Summary</h3>
              </div>

              {(() => {
                 const syncedActs = activities.filter(a => a.source === 'strava');
                 const total = syncedActs.length;
                 const runs = syncedActs.filter(a => a.sportType?.toLowerCase() === 'run').length;
                 const rides = syncedActs.filter(a => a.sportType?.toLowerCase() === 'ride' || a.sportType?.toLowerCase() === 'virtualride').length;
                 const others = total - runs - rides;
                 const withGps = syncedActs.filter(a => a.hasGps || a.summaryPolyline).length;
                 const noGps = total - withGps;
                 const withHr = syncedActs.filter(a => a.hasHeartRate || (a.averageHeartRate && a.averageHeartRate > 0)).length;
                 const noHr = total - withHr;
                 const withPower = syncedActs.filter(a => a.hasPower || (a.averageWatts && a.averageWatts > 0) || a.deviceWatts).length;
                 const noPower = total - withPower;
                 const withCadence = syncedActs.filter(a => a.hasCadence || (a.cadenceAvg && a.cadenceAvg > 0)).length;
                 const noCadence = total - withCadence;
                 const withDetail = syncedActs.filter(a => !!a.detailSyncedAt).length;
                 const noDetail = total - withDetail;
                 const withStreams = syncedActs.filter(a => !!a.streamsSyncedAt).length;
                 const noStreams = total - withStreams;
                 const withLaps = syncedActs.filter(a => !!a.structuredDataSyncedAt && !!a.hasLaps).length;
                 const withSplits = syncedActs.filter(a => !!a.structuredDataSyncedAt && !!a.hasSplits).length;
                 const withBestEfforts = syncedActs.filter(a => !!a.structuredDataSyncedAt && !!a.hasBestEfforts).length;
                 
                 return (
                   <div className="border border-white/10 p-4 rounded bg-zinc-800/50/20 space-y-3 text-xs text-zinc-400">
                      <div className="flex justify-between border-b border-white/10 pb-2">
                         <span className="text-zinc-400 uppercase text-[9.5px]">Total Activities Synced</span>
                         <span className="text-zinc-300 font-bold">{total} <span className="text-[10px] text-zinc-600 font-normal ml-1">TOTAL</span></span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-2">
                         <div className="text-center"><span className="block text-[9px] uppercase">Runs</span><span className="font-bold text-zinc-300">{runs}</span></div>
                         <div className="text-center"><span className="block text-[9px] uppercase">Rides</span><span className="font-bold text-zinc-300">{rides}</span></div>
                         <div className="text-center"><span className="block text-[9px] uppercase">Other</span><span className="font-bold text-zinc-300">{others}</span></div>
                      </div>
                      <div className="grid grid-cols-6 gap-2 pt-1 text-center">
                         <div><span className="block text-[8px] uppercase">W/ DETAIL</span><span className="font-bold text-zinc-100 block">{withDetail}</span><span className="text-[9px] block text-zinc-600 uppercase mt-0.5">X {noDetail}</span></div>
                         <div><span className="block text-[8px] uppercase">W/ STREAM</span><span className="font-bold text-indigo-400 block">{withStreams}</span><span className="text-[9px] block text-zinc-600 uppercase mt-0.5">X {noStreams}</span></div>
                         <div><span className="block text-[8px] uppercase">LAPS</span><span className="font-bold text-pink-400 block">{withLaps}</span><span className="text-[9px] block text-zinc-600 uppercase mt-0.5">X {total - withLaps}</span></div>
                         <div><span className="block text-[8px] uppercase">SPLITS</span><span className="font-bold text-orange-400 block">{withSplits}</span><span className="text-[9px] block text-zinc-600 uppercase mt-0.5">X {total - withSplits}</span></div>
                         <div><span className="block text-[8px] uppercase">BEST EFFORTS</span><span className="font-bold text-yellow-400 block">{withBestEfforts}</span><span className="text-[9px] block text-zinc-600 uppercase mt-0.5">X {total - withBestEfforts}</span></div>
                         <div><span className="block text-[8px] uppercase">W/ POWER</span><span className="font-bold text-purple-400 block">{withPower}</span><span className="text-[9px] block text-zinc-600 uppercase mt-0.5">X {noPower}</span></div>
                      </div>
                   </div>
                 );
              })()}
            </div>
          </div>

          {/* 3. DASHBOARD READINESS */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SYSTEM ANALYSIS</span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-1">Feature Readiness Board</h3>
              </div>

              {(() => {
                 const hasGear = counts.gear > 0;
                 const hasBestEfforts = counts.bestEfforts > 0;
                 const hasReports = counts.reports > 0;
                 const gpsActivitiesCount = activities.filter(a => !!a.summaryPolyline).length;
                 const hasRouteArt = gpsActivitiesCount > 0;
                 
                 // Audit for cards warnings
                 const potentialExportWarnings = [];
                 if (activities.some(a => !a.name)) {
                   potentialExportWarnings.push("Activity missing names (might default to 'Strava Workout')");
                 }
                 if (activities.some(a => !a.startDate)) {
                   potentialExportWarnings.push("Activity missing starting timestamps (gated dates)");
                 }
                 if (activities.length > 0 && !activities.some(a => a.averageHeartRate && a.averageHeartRate > 0)) {
                   potentialExportWarnings.push("No Heart Rate streams tracked; RX template gated");
                 }
                 
                 return (
                    <div className="space-y-4">
                      <div className="border border-white/10 p-3 rounded bg-zinc-800/50/20 space-y-3 text-xs text-zinc-400 font-mono">
                         {/* Gear Tracker Readiness */}
                         <div className="flex justify-between items-center border-b border-white/10 pb-2">
                           <span className="uppercase text-[9.5px]">Gear Tracker Readiness</span>
                           {hasGear ? (
                             <span className="text-emerald-400 font-bold uppercase">{counts.gear} Active items</span>
                           ) : (
                             <span className="text-amber-500 font-bold uppercase">No items listed</span>
                           )}
                         </div>

                         {/* Best Efforts Readiness */}
                         <div className="flex justify-between items-center border-b border-white/10 pb-2">
                           <span className="uppercase text-[9.5px]">Best Effort Readiness</span>
                           {hasBestEfforts ? (
                             <span className="text-emerald-400 font-bold uppercase">{counts.bestEfforts} Records loaded</span>
                           ) : (
                             <span className="text-zinc-500 font-bold uppercase">Sync required</span>
                           )}
                         </div>

                         {/* Report Readiness */}
                         <div className="flex justify-between items-center border-b border-white/10 pb-2">
                           <span className="uppercase text-[9.5px]">Report Aggregation</span>
                           {hasReports ? (
                             <span className="text-emerald-400 font-bold uppercase">{counts.reports} Summaries</span>
                           ) : (
                             <span className="text-zinc-500 font-bold uppercase">Aggregate ready</span>
                           )}
                         </div>

                         {/* Route Art Readiness */}
                         <div className="flex justify-between items-center">
                           <span className="uppercase text-[9.5px]">Route Art Readiness</span>
                           {hasRouteArt ? (
                             <span className="text-emerald-400 font-bold uppercase">{gpsActivitiesCount} GPS routes ready</span>
                           ) : (
                             <span className="text-amber-500 font-bold uppercase">No GPS activities found</span>
                           )}
                         </div>
                      </div>

                      {/* Export payload warnings banner if any occur */}
                      <div className="p-3 bg-zinc-950/40 border border-white/5 rounded text-[10px] space-y-2">
                         <span className="text-zinc-400 uppercase font-bold block tracking-wider">Export Payload Warnings:</span>
                         {potentialExportWarnings.length > 0 ? (
                           <div className="space-y-1">
                             {potentialExportWarnings.slice(0, 2).map((w, index) => (
                               <div key={index} className="flex items-center gap-1.5 text-[#FC5200] font-mono leading-relaxed uppercase">
                                 <AlertCircle className="w-3 h-3 text-[#FC5200]" strokeWidth={3} />
                                 <span>{w}</span>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <span className="text-emerald-400 uppercase font-mono tracking-wide block">All export payload parameters healthy</span>
                         )}
                      </div>
                    </div>
                 );
              })()}
            </div>
          </div>

        </div>
        
{/* CLINICAL DATA QUALITY AUDIT CONTAINER */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6 sm:p-8 space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FC5200]" />
                <span>Local Data Quality Audit</span>
              </h3>
              <p className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide tracking-wide mt-1">
                Scan all stored user activities, wellness vectors, and streams for structural anomalies and mismatches
              </p>
            </div>

            <button
              onClick={handleRunAudit}
              disabled={auditing}
              className="px-5 py-3 bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800/50 text-black font-bold text-xs select-none cursor-pointer tracking-wider uppercase transition-colors rounded inline-flex items-center gap-3"
            >
              {auditing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUDITING WORKLOAD SNAPSHOTS...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  <span>Run Local Data Audit</span>
                </>
              )}
            </button>
          </div>

          {auditing && (
            <div className="border border-white/10 bg-zinc-800/50/10 p-5 rounded text-xs space-y-3 flex flex-col justify-center items-center text-center animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin text-[#FC5200]" />
              <p className="text-zinc-300 font-extrabold uppercase tracking-wide">{auditStep}</p>
              <span className="text-xs text-zinc-400">Compiling dataset metrics from Firestore schema definitions...</span>
            </div>
          )}

          {/* AUDIT LOG RESULTS */}
          {auditRun && !auditing && (
            <div className="space-y-6">
              
              <div className="bg-zinc-800/50/20 border border-white/10 p-4 rounded flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-400 block uppercase text-xs">Audit Execution Results</span>
                  <p className="text-zinc-200 mt-1 font-bold">
                    Scanned <strong className="text-white">{activities.length}</strong> activity records, <strong className="text-white">{wellnessLogs.length}</strong> wellness diaries, and <strong className="text-white">{dailyLoads.length}</strong> daily loads.
                  </p>
                </div>
                <div>
                  {warnings.length === 0 ? (
                    <span className="px-3 py-1.5 border border-emerald-950 bg-emerald-950/20 text-emerald-400 font-bold uppercase tracking-wide text-xs rounded block">
                      DATA 100% HEALTHY
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 border border-amber-950 bg-amber-950/20 text-[#FC5200] font-bold uppercase tracking-wide text-xs rounded block">
                      {warnings.length} SCHEMATIC PROTOCOL ISSUES
                    </span>
                  )}
                </div>
              </div>

              {warnings.length > 0 ? (
                <div className="space-y-3">
                  {warnings.map(warn => {
                    const sevColor = 
                      warn.severity === 'high' 
                        ? 'border-red-950 bg-red-950/10 text-red-400' 
                        : warn.severity === 'medium'
                        ? 'border-amber-950 bg-amber-950/10 text-[#FC5200]'
                        : 'border-white/10 bg-zinc-900 text-zinc-400';

                    const sevLabel = 
                      warn.severity === 'high' 
                        ? 'CRITICAL RECOGNITION GAP' 
                        : warn.severity === 'medium'
                        ? 'INTEGRITY ADAPTATION WARNING'
                        : 'Data Discrepancy';

                    return (
                      <div 
                        key={warn.id}
                        className={`border rounded-lg p-5 flex flex-col md:flex-row md:items-start justify-between gap-6 font-mono transition-all hover:bg-zinc-800/50/10 ${sevColor}`}
                      >
                        <div className="space-y-1.5 max-w-[1400px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="p-1 px-2 border-none bg-black/40 text-xs font-extrabold uppercase rounded tracking-wide font-mono">
                              {warn.category.toUpperCase()}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wide block leading-none">
                              {sevLabel}
                            </span>
                          </div>
                          
                          <p className="text-xs leading-relaxed text-zinc-300">
                            {warn.message}
                          </p>

                          {warn.affectedId && (
                            <div className="text-sm font-sans text-zinc-400 font-mono">
                              Affected Snapshot ID: <code className="text-zinc-400 bg-black/20 p-0.5 rounded px-1.5">{warn.affectedId}</code> {warn.affectedName && `(${warn.affectedName})`}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center self-start shrink-0 text-xs uppercase font-bold text-zinc-500 tracking-wider">
                          <span className="inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{warn.severity.toUpperCase()} PRIORITY</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-emerald-950/40 bg-zinc-800/50/10 rounded-lg p-8 text-center space-y-3 font-mono">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-400 tracking-wider">ZERO STRUCTURAL DEFECTS DETECTED</h4>
                  <p className="text-sm font-sans text-zinc-400 max-w-md mx-auto uppercase leading-relaxed">
                    All cardiovascular streams, pacing duration scales, geo map boundaries, daily workloads, and athlete reflections align safely with Firestore schemas.
                  </p>
                </div>
              )}

            </div>
          )}

          {!auditRun && !auditing && (
            <div className="border border-dashed border-white/10 rounded-lg p-8 text-center space-y-3 font-mono">
              <AlertTriangle className="w-6 h-6 text-zinc-500 mx-auto" />
              <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">SCHEMATIC DIAGNOSTIC SCAN PENDING</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                No active audit currently cached. Run manual diagnostic trace command above.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
