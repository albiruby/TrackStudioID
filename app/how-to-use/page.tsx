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
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">System User Guide</h1>
            </div>
            <p className="text-xs text-zinc-400 font-medium tracking-wide mt-1.5">
              Mathematical formulas, training stress metrics, and terminal operation principles
            </p>
          </div>
        </div>

        {/* DECREE BILLBOARD */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-6">
          <div>
            <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">CHAPTER 01</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1">Core Data Philosophies</h2>
          </div>

          <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
            <div className="border-l-2 border-[#FC5200] pl-4 py-1.5 space-y-2">
              <p className="font-extrabold text-[#FC5200]">Data Truth Mandate (Anti-AI & Anti-Slop)</p>
              <p className="text-xs text-zinc-400">
                Track.Studio strictly operates as a high-fidelity sports science dashboard. We do not generate text prompts, make speculative evaluations. If data is missing in your profile, the terminal displays "—" and warns of missing data. Missing items will never be synthesized or set to zero.
              </p>
            </div>
          </div>
        </div>

        {/* MATHEMATICAL MODULES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#FC5200]">
              <Heart className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wide">TRIMP (Training Impulse)</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calculates training stress score using cardiac duration and load multipliers:
            </p>
            <div className="bg-zinc-800/50/40 p-3 rounded text-sm font-sans text-zinc-400 font-mono">
              TRIMP = Duration (min) x HF x 0.64 x e^(1.92 x HF)
            </div>
            <p className="text-sm font-medium tracking-wide text-zinc-400 leading-relaxed">
              Where HF represents fractional Heart Rate reserve. This maps physiological impact with scientific certainty.
            </p>
          </div>

          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#FC5205]">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wide">ACWR (Acute-to-Chronic Workload)</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Measures the sweet spot of training strain to avoid overuse injuries:
            </p>
            <div className="bg-zinc-800/50/40 p-3 rounded text-sm font-sans text-zinc-400 font-mono">
              ACWR = 7-Day Average Load / 28-Day Average Load
            </div>
            <p className="text-sm font-medium tracking-wide text-zinc-400 leading-relaxed">
              Ranges between 0.8 and 1.3 represent optimal fitness progressions. Ratios exceeding 1.5 trigger acute hazard statuses.
            </p>
          </div>

          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#FC5200]">
              <Zap className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wide">Jack Daniels VDOT Formulation</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Approximates cellular oxygen utilisation from fixed race distances:
            </p>
            <div className="bg-zinc-800/50/40 p-3 rounded text-sm font-sans text-zinc-400 font-mono">
              VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
            </div>
            <p className="text-sm font-medium tracking-wide text-zinc-400 leading-relaxed">
              A single race metric enables mapping easy, threshold, marathon, and repetition zones with absolute precision.
            </p>
          </div>

          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#FC5200]">
              <Heart className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wide">Heart Rate Reserve (Karvonen)</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calculates precise cardiac zones taking individual resting baseline into account:
            </p>
            <div className="bg-zinc-800/50/40 p-3 rounded text-sm font-sans text-zinc-400 font-mono">
              Target HR = Resting HR + (Max HR - Resting HR) * Intensity%
            </div>
            <p className="text-sm font-medium tracking-wide text-zinc-400 leading-relaxed">
              Accounting for heart rate reserves prevents zones overestimation during base adaptation days.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
