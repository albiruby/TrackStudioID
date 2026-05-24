'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  BookOpen, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  Heart, 
  Award, 
  Database 
} from 'lucide-react';

export default function HowToUsePage() {
  const router = useRouter();

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
              <BookOpen className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">How to Use Track.Studio</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
              Comprehensive guide to modules, data sources, and system operations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* 1. GETTING STARTED */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <Zap className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wide">1. Getting Started</h2>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-400 leading-relaxed">
                <li><strong className="text-zinc-200">Sign in:</strong> Authenticate securely using your Google account.</li>
                <li><strong className="text-zinc-200">Connect Strava:</strong> Navigate to Settings or Onboarding to link your Strava account for activity syncing.</li>
                <li><strong className="text-zinc-200">Sync Activities:</strong> Allow the system to securely import your public activity streams.</li>
                <li><strong className="text-zinc-200">Connect Intervals.icu:</strong> If available, connect to Intervals.icu to import advanced load and wellness parameters.</li>
                <li><strong className="text-zinc-200">Athlete Profile:</strong> Manually input your baseline metrics (resting HR, max HR, threshold pace) for accurate calculations.</li>
                <li><strong className="text-zinc-200">Open Dashboard:</strong> Begin analyzing your deterministic performance insights on the main dashboard.</li>
              </ul>
            </div>

             {/* 2. DATA SOURCES */}
             <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
              <div className="flex items-center gap-2 text-blue-400 mb-4">
                <Database className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wide">2. Data Sources</h2>
              </div>
              
              <div className="space-y-4">
                <div className="border border-white/5 bg-zinc-900/50 p-4 rounded">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FC5200] mb-2">Strava (Free API)</h3>
                  <p className="text-xs text-zinc-400">Activities, distance, time, pace, route polygons, heart rate (if available), cadence (if available), power (if available), laps, splits, and best efforts when available through free API permissions.</p>
                </div>
                <div className="border border-white/5 bg-zinc-900/50 p-4 rounded">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Intervals.icu API</h3>
                  <p className="text-xs text-zinc-400">Training load (CTL, ATL, TSB), wellness logs, HRV data, sleep data (if available), physiological zones, and planned workouts (if scheduled).</p>
                </div>
                <div className="border border-white/5 bg-zinc-900/50 p-4 rounded">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Manual Input</h3>
                  <p className="text-xs text-zinc-400">Athlete baseline profile, daily subjective wellness logs, custom manual workouts, manual gear/shoe records, and historic race results.</p>
                </div>
              </div>
            </div>

            {/* 3. MISSING DATA */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-yellow-400 mb-4">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wide">3. Understanding Missing Data</h2>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed mb-2">
                Track.Studio strictly relies on real data. Missing data is <strong>never</strong> replaced with fake values or simulated defaults.
              </p>
              <div className="bg-zinc-900/50 p-4 rounded border border-white/5 text-xs text-zinc-300">
                If a required metric is unavailable, the system will explicitly show:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400 font-mono">
                  <li>—</li>
                  <li>Data not available</li>
                  <li>Sync required</li>
                  <li>Sensor data required</li>
                  <li>Stream data required</li>
                  <li>Not enough data to calculate</li>
                </ul>
              </div>
            </div>

            {/* 4. DASHBOARD */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-white mb-4">
                <TrendingUp className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wide">4. Dashboard Overview</h2>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The primary focal point of the platform. Here you will find aggregated metrics including fitness, fatigue, and form indices. The dashboard visualizes weekly volume, readiness states, recent activities, and high-level data health status. All components require synced historical data.
              </p>
            </div>

            {/* 5. ACTIVITIES */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-white mb-4">
                <TrendingUp className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wide">5. Activity Analysis</h2>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Review your synced activity list and deeply inspect individual activity details. This module grants access to high-resolution streams, laps, splits, deterministic best efforts, and route geometry availability where GPS arrays were recorded.
              </p>
            </div>

            {/* 6. TRAINING */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-white mb-4">
                <TrendingUp className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wide">6. Training Operations</h2>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Manage your workout library and interact with your training calendar. Compare planned workout loads against completed activities. Create manual structured workouts or review those imported automatically from your external accounts.
              </p>
            </div>
            
            {/* 7. WELLNESS */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2 text-white mb-4">
                <Heart className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wide">7. Wellness Tracking</h2>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                A dedicated terminal for logging and inspecting physiological wellness. Track resting HRV, readiness scores, and load vs. recovery equilibrium. If hardware sensors are disconnected, certain readouts will lock until data requirements are met.
              </p>
            </div>

          </div>

          <div className="space-y-6">
            
            {/* 8. REPORTS */}
            <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-white mb-2">8. Reports & Exports</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Compile historical data into periodic formats. Generate Monthly and Annual reports. Visualize paths via Route Art, and create sharable Export Cards. Securely output screens to PNG format or copy directly to clipboard.
              </p>
            </div>

             {/* 9. DATA HEALTH */}
             <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-white mb-2">9. Data Health Module</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                A system verification tool to monitor:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-zinc-400">
                  <li>Strava / Intervals.icu OAuth states</li>
                  <li>Total activities synchronized</li>
                  <li>Missing streams or invalid dates</li>
                  <li>Sync latency status</li>
                  <li>Overall module readiness</li>
                </ul>
            </div>

             {/* 10. PRIVACY */}
             <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-400 mb-2">10. Privacy & Security</h2>
              <ul className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>Tokens are strictly managed securely server-side.</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>Secret credentials are never exposed in UI payloads.</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>Data is strictly isolated to your user account.</li>
                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1"></div>No metrics are tracked publicly unless manually exported.</li>
              </ul>
            </div>

            {/* 11. LIMITATIONS */}
            <div className="bg-[#111113] border border-[#FC5200]/30 rounded-lg p-6 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#FC5200]/10 rounded-bl-full translate-x-8 -translate-y-8"></div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#FC5200] mb-2">11. Product Limitations</h2>
              <ul className="space-y-2 text-xs text-zinc-400 leading-relaxed">
                <li className="flex items-start gap-2"><span className="text-[#FC5200] mt-0.5">•</span>Track.Studio relies strictly on Strava free API tier capabilities. Premium functions are not replicated.</li>
                <li className="flex items-start gap-2"><span className="text-[#FC5200] mt-0.5">•</span>Advanced dynamic metrics require external heart rate or power hardware sensors.</li>
                <li className="flex items-start gap-2"><span className="text-[#FC5200] mt-0.5">•</span>Some fatigue models explicitly require connecting Intervals.icu matrices.</li>
                <li className="flex items-start gap-2"><span className="text-[#FC5200] mt-0.5">•</span>Macro-analysis modules need sufficient historical data volume.</li>
                <li className="flex items-start gap-2"><span className="text-[#FC5200] mt-0.5">•</span>When applying mathematical performance conversions, output numbers are strictly labeled as "Estimated".</li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
