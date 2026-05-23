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

export default function CourseRecordsPage() {
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
        console.error('Failed to load course records:', e);
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

  // Retrieve fastest overall activity run
  const getPRSegment = () => {
    if (activities.length === 0) return null;
    const runs = activities.filter(a => a.sportType.toLowerCase() === 'run');
    if (runs.length === 0) return null;

    // Return the activity with highest distance or pace
    return runs.reduce((prev, current) => {
      return (prev.distanceMeters > current.distanceMeters) ? prev : current;
    });
  };

  const recordSegment = getPRSegment();

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Querying Course Records...</span>
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
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Course Records</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Unbiased calculation of historical peaks logged across specific running courses
            </p>
          </div>
        </div>

        {recordSegment ? (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">LONGEST Aerobic RUN IN LOGS</span>
              <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">{recordSegment.name}</h3>
            </div>

            <div className="bg-zinc-800/50/40 border border-white/10 p-6 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400 text-xs">DISTANCE SUM:</span>
                <span className="text-[#FC5200] font-bold">{formatDistanceKm(recordSegment.distanceMeters)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 text-xs">ELAPSED TIME:</span>
                <span className="text-white font-bold">{formatDuration(recordSegment.movingTimeSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 text-xs">AVERAGE PACING:</span>
                <span className="text-white font-bold">{formatPace(recordSegment.movingTimeSeconds / (recordSegment.distanceMeters / 1000))}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">Course records registry empty</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Log activities into the dashboard console workout sheets to detect historical record runs.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
