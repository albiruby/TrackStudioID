'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Settings, 
  RefreshCw, 
  Database,
  Activity
} from 'lucide-react';
import { getActivities, getWellnessLogs } from '../../lib/firebase/firestore';
import { CanonicalActivity, DailyWellnessLog } from '../../data/types';
import { formatDistanceKm, formatDuration } from '../../lib/data/dataLaw';

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [actData, wellnessData] = await Promise.all([
          getActivities(user.uid),
          getWellnessLogs(user.uid)
        ]);
        setActivities(actData);
        setWellnessLogs(wellnessData);
      } catch (e) {
        console.error('Failed to load reports metrics:', e);
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

  const totalDistance = activities.reduce((sum, curr) => sum + curr.distanceMeters, 0);
  const totalDuration = activities.reduce((sum, curr) => sum + curr.movingTimeSeconds, 0);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Consolidating Reports report...</span>
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
              <Settings className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Performance Reports</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Unbiased diagnostics summaries of physical outputs and logs
            </p>
          </div>
        </div>

        {activities.length > 0 || wellnessLogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">CHAPTER 01</span>
                <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">Performance outputs</h3>
              </div>

              <div className="bg-zinc-900 p-4 border border-white/10 rounded-lg text-xs space-y-3 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">CUMULATIVE DISTANCE:</span>
                  <span className="text-white font-extrabold">{formatDistanceKm(totalDistance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">TOTAL ACTIVE MOVING TIME:</span>
                  <span className="text-white font-bold">{formatDuration(totalDuration)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-zinc-400">TOTAL INTEGRATED WORKOUTS:</span>
                  <span className="text-[#FC5200]">{activities.length} logs</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">CHAPTER 02</span>
                <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">Autonomic wellness consistency</h3>
              </div>

              <div className="bg-zinc-900 p-4 border border-white/10 rounded-lg text-xs space-y-3 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-400">WELLNESS JOURNAL COHERENCE:</span>
                  <span className="text-white font-extrabold">{wellnessLogs.length} active logs</span>
                </div>
                <div className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide leading-relaxed font-mono">
                  * Consistency score registers {wellnessLogs.length > 7 ? 'HIGH' : 'INTERMITTENT/BASELINE'}. Keep submitting daily morning wellness checks to build dense analytical baselines.
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">Diagnostic data sheets unpopulated</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Please enter workouts or complete the morning wellness check to build summaries.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
