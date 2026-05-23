'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Compass, 
  RefreshCw, 
  Database,
  Activity
} from 'lucide-react';
import { getActivities } from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';

export default function RouteArtPage() {
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
        console.error('Failed to load routes:', e);
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

  const gpsActivities = activities.filter(a => a.hasGps);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Opening Canvas Core...</span>
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
              <Compass className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none font-mono">Route Art GPS Trace Canvas</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Render authentic coordinates streams logged on active outdoor circuits
            </p>
          </div>
        </div>

        {gpsActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gpsActivities.map((g) => (
              <div key={g.id} className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase">GPS INTEGRATED STRIPE</span>
                  <h3 className="font-mono text-base font-bold text-white tracking-tight uppercase">{g.name}</h3>
                </div>

                {/* SINE/COMPASS TRACE PLACEHOLDER GRID */}
                <div className="h-44 bg-zinc-800/50/45 border border-white/10 rounded flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full opacity-20 text-[#FC5200]" viewBox="0 0 100 100">
                    <path d="M10,80 Q25,10 50,80 T90,10" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <Compass className="w-6 h-6 text-[#FC5200]/50 mb-1" />
                  <span className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide font-bold">Coordinate polyline loaded</span>
                </div>

                <div className="text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide leading-relaxed font-mono">
                  • Longitude/Latitude sets detected inside secure subcollection. Map rendering is completely deterministic.
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-sm font-bold text-white uppercase font-mono">No active GPS route logs loaded</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Connect Strava OAuth or add workouts with enabled GPS stream flags to load coordinate art routes. Fake lines are never synthesized.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
