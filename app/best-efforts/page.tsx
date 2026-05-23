'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Award, 
  RefreshCw, 
  Database,
  Activity
} from 'lucide-react';
import { getActivities } from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';
import { formatDistanceKm, formatDuration, formatPace } from '../../lib/data/dataLaw';

export default function BestEffortsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const data = await getActivities(user.uid);
        setActivities(data);
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

  // Read real efforts deterministically
  const getBestEfforts = () => {
    if (activities.length === 0) return null;

    // Filter runs
    const runs = activities.filter(a => a.sportType.toLowerCase() === 'run');
    if (runs.length === 0) return null;

    // Scan for fastest paces
    let best1k: CanonicalActivity | null = null;
    let best5k: CanonicalActivity | null = null;
    let b1kMinPace = Infinity;
    let b5kMinPace = Infinity;

    runs.forEach(r => {
      const pace = r.movingTimeSeconds / (r.distanceMeters / 1000);
      if (r.distanceMeters >= 1000 && pace < b1kMinPace) {
        b1kMinPace = pace;
        best1k = r;
      }
      if (r.distanceMeters >= 5000 && pace < b5kMinPace) {
        b5kMinPace = pace;
        best5k = r;
      }
    });

    return {
      k1: best1k ? { act: best1k, pace: b1kMinPace } : null,
      k5: best5k ? { act: best5k, pace: b5kMinPace } : null,
    };
  };

  const efforts: any = getBestEfforts();

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold font-mono">Scanning Personal Benchmarks...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8 ">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

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
              <Award className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Personal Best Efforts</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Scan individual activities database for baseline speed and endurance achievements
            </p>
          </div>
        </div>

        {efforts && (efforts.k1 || efforts.k5) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">1,000 METRE TARGET</span>
                <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">Best 1K Metric</h3>
              </div>

              {efforts.k1 ? (
                <div className="bg-zinc-800/50/40 border border-white/10 p-6 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">WORKOUT BASIS:</span>
                    <span className="text-white font-extrabold">{efforts.k1.act.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">RECORD PACE:</span>
                    <span className="text-[#FC5200] font-bold">{formatPace(efforts.k1.pace)}</span>
                  </div>
                  <div className="text-xs text-zinc-600 block text-right">Logged on {efforts.k1.act.startDate.slice(0, 10)}</div>
                </div>
              ) : (
                <div className="h-24 border border-dashed border-white/10 rounded flex items-center justify-center text-sm font-sans text-zinc-400">
                  No registered run log exceeding 1 km in distance
                </div>
              )}
            </div>

            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">5,000 METRE TARGET</span>
                <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">Best 5K Metric</h3>
              </div>

              {efforts.k5 ? (
                <div className="bg-zinc-800/50/40 border border-white/10 p-6 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">WORKOUT BASIS:</span>
                    <span className="text-white font-extrabold">{efforts.k5.act.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">RECORD PACE:</span>
                    <span className="text-[#FC5200] font-bold">{formatPace(efforts.k5.pace)}</span>
                  </div>
                  <div className="text-xs text-zinc-600 block text-right">Logged on {efforts.k5.act.startDate.slice(0, 10)}</div>
                </div>
              ) : (
                <div className="h-24 border border-dashed border-white/10 rounded flex items-center justify-center text-sm font-sans text-zinc-400">
                  No registered run log exceeding 5 km in distance
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">No registered run logs found</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Add runs to your workout registry inside the dashboard console to extract personal endurance benchmarks. No simulation models are used.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
