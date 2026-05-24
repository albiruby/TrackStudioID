'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  FileText,
  Plus,
  ArrowUpCircle,
  Wrench,
  AlertTriangle
} from 'lucide-react';

export default function ReleaseNotesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FC5200]/30 selection:text-white pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </button>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-white" />
              <h1 className="text-sm font-bold uppercase tracking-wider text-white">Release Notes</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-16 space-y-16">
        
        {/* VERSION HEADER */}
        <div className="border-b border-white/10 pb-8 text-center sm:text-left">
          <h2 className="text-3xl font-extrabold tracking-tight">Track.Studio V3.0</h2>
          <p className="text-sm text-zinc-400 font-mono mt-2 uppercase tracking-widest">
            Latest Features, Enhancements, and Fixes
          </p>
        </div>

        {/* ADDED */}
        <section className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#FC5200] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Added
          </h3>
          <ul className="space-y-4">
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-[#FC5200] shrink-0 mt-2 border border-black" />
               <p>Comprehensive Strava OAuth integration for secure standard read-only syncing. Stream analysis now automatically populates high-fidelity stream data natively.</p>
             </li>
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-[#FC5200] shrink-0 mt-2 border border-black" />
               <p>Intervals.icu connection for daily training load (CTL/ATL/TSB) and wellness data tracking. Enables deterministic Overtraining Guard monitoring.</p>
             </li>
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-[#FC5200] shrink-0 mt-2 border border-black" />
               <p>Export canvas tools for rendering PNG snapshots of activity telemetry, including custom backgrounds and canonical verification labels.</p>
             </li>
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-[#FC5200] shrink-0 mt-2 border border-black" />
               <p>Race predictor matrices using strict scaling constants derived from historical best efforts.</p>
             </li>
          </ul>
        </section>

        {/* IMPROVED */}
        <section className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4" /> Improved
          </h3>
          <ul className="space-y-4">
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2 border border-black" />
               <p>Missing data handling: All empty states and data gaps are explicitly labeled. No synthetic placeholders are generated.</p>
             </li>
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2 border border-black" />
               <p>Responsive multi-column layouts across Dashboard, Activities, and Analytics modules for improved desktop viewing.</p>
             </li>
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2 border border-black" />
               <p>Privacy architecture: Strict client-side protection. External API tokens are never saved to localStorage.</p>
             </li>
          </ul>
        </section>

        {/* FIXED */}
        <section className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Fixed
          </h3>
          <ul className="space-y-4">
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2 border border-black" />
               <p>Firebase authentication redirection bugs resolved. Login securely redirects to Dashboard on success.</p>
             </li>
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2 border border-black" />
               <p>Resolved missing stream data clipping in specific chart components.</p>
             </li>
             <li className="flex gap-4 p-4 border border-white/5 bg-zinc-950/40 rounded-lg text-sm text-zinc-300 leading-relaxed">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-2 border border-black" />
               <p>Cleared typographical and formatting inconsistencies across form labels and tooltips.</p>
             </li>
          </ul>
        </section>

        {/* KNOWN LIMITATIONS */}
        <section className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Known Limitations
          </h3>
          <div className="bg-amber-950/10 border border-amber-900/30 rounded-lg p-6">
            <ul className="space-y-4">
               <li className="flex gap-4 text-sm text-zinc-300 leading-relaxed">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2 border border-black" />
                 <p><strong className="text-amber-500/80 mr-1 uppercase text-xs tracking-wide">Sensors Required:</strong> Some metrics require sensors such as HR, cadence, power, or GPS.</p>
               </li>
               <li className="flex gap-4 text-sm text-zinc-300 leading-relaxed">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2 border border-black" />
                 <p><strong className="text-amber-500/80 mr-1 uppercase text-xs tracking-wide">External Services:</strong> Some training load and HRV features require Intervals.icu.</p>
               </li>
               <li className="flex gap-4 text-sm text-zinc-300 leading-relaxed">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2 border border-black" />
                 <p><strong className="text-amber-500/80 mr-1 uppercase text-xs tracking-wide">API Usage:</strong> Strava integration uses free API capabilities only.</p>
               </li>
               <li className="flex gap-4 text-sm text-zinc-300 leading-relaxed">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2 border border-black" />
                 <p><strong className="text-amber-500/80 mr-1 uppercase text-xs tracking-wide">Strict Data Policy:</strong> Missing data will be shown as unavailable instead of estimated without source.</p>
               </li>
               <li className="flex gap-4 text-sm text-zinc-300 leading-relaxed">
                 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2 border border-black" />
                 <p><strong className="text-amber-500/80 mr-1 uppercase text-xs tracking-wide">Estimates:</strong> Race predictions are deterministic estimates, not guaranteed outcomes.</p>
               </li>
            </ul>
          </div>
        </section>

      </main>
    </div>
  );
}
