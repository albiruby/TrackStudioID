import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  targetRoute?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, targetRoute, icon }: EmptyStateProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) onAction();
    if (targetRoute) router.push(targetRoute);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#111113] border border-white/5 rounded-xl">
      <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-500 mb-4">
        {icon || <AlertCircle className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{title}</h3>
      <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed bg-zinc-900/50 p-3 rounded font-mono border border-white/5">
        {description}
      </p>
      {actionLabel && (
        <button
          onClick={handleAction}
          className="flex items-center gap-2 px-4 py-3 bg-white text-black hover:bg-zinc-200 text-xs font-bold uppercase rounded transition-colors"
        >
          {actionLabel}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
