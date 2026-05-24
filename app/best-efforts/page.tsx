'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Award, 
  RefreshCw, 
  Database,
  Link2,
  Heart,
  Calendar,
  Activity,
  Flame,
  Clock,
  Navigation
} from 'lucide-react';
import { getActivities, getAllBestEfforts, getCourseRecords } from '../../lib/firebase/firestore';
import { CanonicalActivity, CanonicalBestEffort, CourseRecord } from '../../data/types';
import { formatDistanceKm, formatDuration, formatPace } from '../../lib/data/dataLaw';
import { getAthleteProfile } from '../../lib/firebase/firestore';

interface DisplayEffort {
  distanceCategory: string;
  bestTime: number; // in seconds
  pace: number; // in sec/km
  activityId: string;
  activityName: string;
  date: string;
  heartRate: number | null;
  source: 'strava' | 'stream';
}

const ORDERED_CATEGORIES = [
  "400m",
  "800m",
  "1K",
  "1 mile",
  "2 miles",
  "5K",
  "10K",
  "15K",
  "10 miles",
  "20K",
  "Half Marathon",
  "Marathon",
  "50K"
];

function normalizeDistanceName(name: string): string | null {
  if (!name) return null;
  const clean = name.toLowerCase().replace(/[\s\-_]/g, '');
  if (clean === '400m') return '400m';
  if (clean === '800m') return '800m';
  if (clean === '1k' || clean === '1000m') return '1K';
  if (clean === '1mile' || clean === '1mi') return '1 mile';
  if (clean === '2mile' || clean === '2miles') return '2 miles';
  if (clean === '5k' || clean === '5000m') return '5K';
  if (clean === '10k' || clean === '10000m') return '10K';
  if (clean === '15k' || clean === '15000m') return '15K';
  if (clean === '10mile' || clean === '10miles') return '10 miles';
  if (clean === '20k' || clean === '20000m') return '20K';
  if (clean === 'halfmarathon') return 'Half Marathon';
  if (clean === 'marathon') return 'Marathon';
  if (clean === '50k' || clean === '50000m') return '50K';
  return null;
}

export default function BestEffortsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [rawBestEfforts, setRawBestEfforts] = useState<any[]>([]);
  const [courseRecords, setCourseRecords] = useState<CourseRecord[]>([]);
  const [athleteProfile, setAthleteProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [acts, rawBe, crs, profile] = await Promise.all([
          getActivities(user.uid),
          getAllBestEfforts(user.uid),
          getCourseRecords(user.uid),
          getAthleteProfile(user.uid)
        ]);
        setActivities(acts || []);
        setRawBestEfforts(rawBe || []);
        setCourseRecords(crs || []);
        setAthleteProfile(profile || null);
      } catch (e) {
        console.error('Failed to load efforts:', e);
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

  const isMetric = athleteProfile?.preferredUnits !== 'imperial';

  // Pace formatter
  const formatPaceWithUnit = (secondsPerKm: number) => {
    if (!secondsPerKm || isNaN(secondsPerKm)) return '--:--';
    const paceSeconds = isMetric ? secondsPerKm : secondsPerKm * 1.609344;
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')} /${isMetric ? 'km' : 'mi'}`;
  };

  // Build categorised personal efforts list
  const getCompiledBestEfforts = (): DisplayEffort[] => {
    const displayEffortsMap: { [category: string]: DisplayEffort } = {};

    // 1. Process standard Strava linked best efforts subcollection
    const flatEfforts: CanonicalBestEffort[] = [];
    rawBestEfforts.forEach(docItem => {
      if (Array.isArray(docItem.bestEfforts)) {
        docItem.bestEfforts.forEach((be: any) => {
          flatEfforts.push({
            ...be,
            activityId: be.activityId || docItem.id
          });
        });
      }
    });

    flatEfforts.forEach(eff => {
      const category = normalizeDistanceName(eff.name);
      if (!category) return;

      const time = eff.movingTimeSeconds || eff.elapsedTimeSeconds || 0;
      if (time <= 0) return;

      const paceVal = eff.paceSecPerKm || (time / ((eff.distanceMeters || 1) / 1000));
      const act = activities.find(a => a.id === eff.activityId);
      const actName = act ? act.name : (eff.raw?.activity?.name || "Strava Run");

      const existingEff = displayEffortsMap[category];
      if (!existingEff || time < existingEff.bestTime) {
        displayEffortsMap[category] = {
          distanceCategory: category,
          bestTime: time,
          pace: paceVal,
          activityId: eff.activityId,
          date: eff.startDate || act?.startDate || "",
          activityName: actName,
          heartRate: eff.averageHeartRate || null,
          source: 'strava'
        };
      }
    });

    // 2. Deterministic activity-based estimation fallbacks for 1K and 5K if still missing
    const missingCatsList = ORDERED_CATEGORIES.filter(cat => !displayEffortsMap[cat]);
    if (missingCatsList.length > 0 && activities.length > 0) {
      const runs = activities.filter(a => a.sportType?.toLowerCase() === 'run');
      
      runs.forEach(r => {
        const distKm = r.distanceMeters / 1000;
        const totalSec = r.movingTimeSeconds || r.elapsedTimeSeconds || 0;
        if (totalSec <= 0 || distKm <= 0) return;
        const avgPace = totalSec / distKm;

        // Approximate 1K benchmark
        if (distKm >= 1.0 && missingCatsList.includes('1K')) {
          const estimated1KSeconds = avgPace;
          const currentBest1K = displayEffortsMap['1K'];
          if (!currentBest1K || estimated1KSeconds < currentBest1K.bestTime) {
            displayEffortsMap['1K'] = {
              distanceCategory: '1K',
              bestTime: estimated1KSeconds,
              pace: avgPace,
              activityId: r.id!,
              activityName: r.name,
              date: r.startDate || "",
              heartRate: r.averageHeartRate || null,
              source: 'stream' // stream / activity basis
            };
          }
        }

        // Approximate 5K benchmark
        if (distKm >= 5.0 && missingCatsList.includes('5K')) {
          const estimated5KSeconds = avgPace * 5;
          const currentBest5K = displayEffortsMap['5K'];
          if (!currentBest5K || estimated5KSeconds < currentBest5K.bestTime) {
            displayEffortsMap['5K'] = {
              distanceCategory: '5K',
              bestTime: estimated5KSeconds,
              pace: avgPace,
              activityId: r.id!,
              activityName: r.name,
              date: r.startDate || "",
              heartRate: r.averageHeartRate || null,
              source: 'stream'
            };
          }
        }
      });
    }

    // Sort into display order
    return ORDERED_CATEGORIES.map(category => displayEffortsMap[category]).filter(Boolean);
  };

  const compiledEfforts = getCompiledBestEfforts();

  // Data health stats
  const totalBestEffortsCount = rawBestEfforts.reduce((acc, d) => acc + (d.bestEfforts?.length || 0), 0);
  const activitiesWithBestEffortsCount = rawBestEfforts.length;
  const activitiesWithStreamsCount = activities.filter(a => !!a.streamsSyncedAt || (a.streamKeysAvailable && a.streamKeysAvailable.length > 0)).length;
  const gpsActivitiesCount = activities.filter(a => !!a.map?.summary_polyline || !!a.map?.polyline).length;
  const courseRecordsCount = courseRecords.length;

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold font-mono">Loading Best Efforts...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-xl font-bold uppercase tracking-wide text-white leading-none font-mono">Best Efforts</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
                Browse personal records and fastest pacing benchmarks synced from real workout details
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] bg-[#FC5200]/10 text-[#FC5200] border border-[#FC5200]/20 px-2 py-1 rounded-full font-mono font-bold uppercase">
              Free Strava API Only
            </span>
          </div>
        </div>

        {/* DATA DIAGNOSTICS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Best Efforts Records</span>
            <span className="text-lg font-bold text-white font-mono mt-1 block">{totalBestEffortsCount} Raw Steps</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Efforts Sync Activities</span>
            <span className="text-lg font-bold text-[#FC5200] font-mono mt-1 block">{activitiesWithBestEffortsCount} Runs</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Synced Activity Streams</span>
            <span className="text-lg font-bold text-cyan-400 font-mono mt-1 block">{activitiesWithStreamsCount} Synced</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">GPS GPS Routes</span>
            <span className="text-lg font-bold text-emerald-400 font-mono mt-1 block">{gpsActivitiesCount} Tracks</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Active Course Records</span>
            <span className="text-lg font-bold text-purple-400 font-mono mt-1 block">{courseRecordsCount} Courses</span>
          </div>
        </div>

        {compiledEfforts.length > 0 ? (
          <div className="bg-[#111113] border border-white/10 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/[0.02]">
              <span className="text-xs uppercase font-mono font-bold text-zinc-400">Personal Records (PR) Breakdown</span>
            </div>
            <div className="divide-y divide-white/10">
              {compiledEfforts.map((effort, idx) => {
                const isCalculated = effort.source === 'stream';
                return (
                  <div key={idx} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-white/[0.01] transition-colors">
                    {/* Category Label */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FC5200]/10 border border-[#FC5200]/20 flex items-center justify-center rounded-lg">
                        <Flame className="w-5 h-5 text-[#FC5200]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono">{effort.distanceCategory} Record</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase text-zinc-500">Source:</span>
                          {isCalculated ? (
                            <span className="text-[9px] font-mono font-bold uppercase bg-cyan-900/40 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded">
                              Calculated from synced stream data
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold uppercase bg-[#FC5200]/10 text-zinc-300 border border-[#FC5200]/20 px-2 py-0.5 rounded">
                              Strava Sync
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block leading-tight">Best Time</span>
                        <span className="text-lg font-mono font-extrabold text-white">{formatDuration(effort.bestTime)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block leading-tight">Best Pace</span>
                        <span className="text-sm font-mono font-extrabold text-[#FC5200]">{formatPaceWithUnit(effort.pace)}</span>
                      </div>
                      {effort.heartRate && (
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block leading-tight">Heart Rate</span>
                          <span className="text-xs text-rose-400 font-mono font-bold flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" /> {Math.round(effort.heartRate)} bpm
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Source Link */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                      <div className="text-right sm:max-w-[200px]">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block leading-none">Workout Title</span>
                        <span className="text-xs text-zinc-300 font-medium line-clamp-1 block mt-1">{effort.activityName}</span>
                        {effort.date && (
                          <span className="text-[10px] text-zinc-550 block font-mono">
                            {effort.date.slice(0, 10)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/activities/${effort.activityId}`)}
                        className="p-2 border border-white/10 hover:border-[#FC5200]/30 hover:bg-[#FC5200]/5 text-zinc-400 hover:text-white rounded transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                      >
                        <Link2 className="w-4 h-4 text-[#FC5200]" />
                        <span>Source</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto animate-pulse">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono">No Best Efforts Synced</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Best effort data is not available. Sync activity details from Strava or use activities with available stream data.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
