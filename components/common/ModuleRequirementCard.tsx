import React from 'react';
import { REQUIREMENTS } from '../../lib/data/requirements';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ModuleRequirementCardProps {
  requirementId: keyof typeof REQUIREMENTS;
}

export function ModuleRequirementCard({ requirementId }: ModuleRequirementCardProps) {
  const req = REQUIREMENTS[requirementId];
  const router = useRouter();
  if (!req) return null;

  return (
    <div className="bg-[#111113] border border-orange-500/20 rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-6 justify-between animate-fade-in">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-orange-400">
           <ShieldAlert className="w-5 h-5" />
           <h3 className="text-sm font-bold uppercase tracking-wider">{req.title}</h3>
        </div>
        <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
          {req.explanation}
        </p>
        <div className="flex items-center gap-2 mt-2">
           <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-white/5 uppercase tracking-wider">
             Source: {req.requiredSource}
           </span>
           <span className={`text-[10px] font-mono px-2 py-1 rounded border uppercase tracking-wider ${
             req.severity === 'blocking' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
             req.severity === 'warning' ? 'text-orange-400 border-orange-500/20 bg-orange-500/10' :
             'text-blue-400 border-blue-500/20 bg-blue-500/10'
           }`}>
             Severity: {req.severity}
           </span>
        </div>
      </div>
      {req.actionLabel && req.targetRoute && (
        <button 
          onClick={() => router.push(req.targetRoute!)}
          className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase rounded transition-colors"
        >
          {req.actionLabel}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
