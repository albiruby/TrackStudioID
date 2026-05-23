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
import { getWellnessLogs } from '../../lib/firebase/firestore';
import { DailyWellnessLog } from '../../data/types';

export default function SleepPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const data = await getWellnessLogs(user.uid);
        setWellnessLogs(data);
      } catch (e) {
        console.error('Failed to load wellness logs for sleep page:', e);
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

  const rawLogs = wellnessLogs.filter(w => w.sleepHours);

  // Compute average sleep duration
  const totalSleep = rawLogs.reduce((sum, curr) => sum + (curr.sleepHours || 0), 0);
  const avgSleep = rawLogs.length > 0 ? (totalSleep / rawLogs.length).toFixed(1) : null;

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Querying Cell Sleep Logs...</span>
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
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Cellular Sleep Registry</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Analyze true registered sleep hours and cardiac cell restoration indicators
            </p>
          </div>
        </div>

        {avgSleep ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">DURATION SUMMARY</span>
                <h3 className="font-sans text-base font-semibold text-white mt-1 uppercase">Average cellular sleep</h3>
              </div>

              <div className="bg-zinc-800/50/40 border border-white/10 p-6 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-white/10/60">
                  <span className="text-zinc-400 text-xs">AVERAGE HOURS LOGGED:</span>
                  <span className="text-[#FC5200] font-bold">{avgSleep} Hours</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400 text-xs">TOTAL TRACKED NIGHTS:</span>
                  <span className="text-white font-bold">{rawLogs.length} days</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {rawLogs.slice(0, 3).map((l) => (
                <div key={l.id} className="bg-[#111113] border border-white/10 w-full p-6 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-xs text-[#FC5200] font-bold block">{l.date}</span>
                    <span className="text-white font-bold mt-0.5 block">Sleep Sleep check</span>
                  </div>
                  <span className="text-white font-extrabold">{l.sleepHours} hrs</span>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">No sleep times registered</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Sleep logs are fully deterministic and require completing the morning wellness log.
              </p>
              <button
                onClick={() => router.push('/morning-check')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 border border-[#FC5200] bg-[#FC5200]/5 text-[#FC5200] text-xs font-bold rounded uppercase cursor-pointer hover:bg-[#FC5200] hover:text-black transition-all"
              >
                <span>Log Wellness Check</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
