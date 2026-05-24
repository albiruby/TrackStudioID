'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  CheckSquare, 
  Square,
  ShieldAlert,
  Rocket
} from 'lucide-react';

const LAUNCH_CHECKLIST = [
  {
    id: 'env',
    title: '1. Environment',
    items: [
      { id: 'env_1', label: 'Firebase env configured' },
      { id: 'env_2', label: 'Strava env configured' },
      { id: 'env_3', label: 'Intervals env configured if used' },
      { id: 'env_4', label: 'NEXT_PUBLIC_APP_URL configured' },
      { id: 'env_5', label: 'No secrets in frontend' }
    ]
  },
  {
    id: 'firebase',
    title: '2. Firebase',
    items: [
      { id: 'fb_1', label: 'Auth working' },
      { id: 'fb_2', label: 'Firestore rules deployed' },
      { id: 'fb_3', label: 'Storage rules deployed if used' },
      { id: 'fb_4', label: 'Indexes deployed' },
      { id: 'fb_5', label: 'User data scoped correctly' }
    ]
  },
  {
    id: 'strava',
    title: '3. Strava',
    items: [
      { id: 'stv_1', label: 'OAuth works' },
      { id: 'stv_2', label: 'Callback domain correct' },
      { id: 'stv_3', label: 'Free API only' },
      { id: 'stv_4', label: 'Rate limits handled' },
      { id: 'stv_5', label: 'Tokens server-side only' }
    ]
  },
  {
    id: 'intervals',
    title: '4. Intervals.icu',
    items: [
      { id: 'int_1', label: 'Connection works' },
      { id: 'int_2', label: 'Credentials protected' },
      { id: 'int_3', label: 'Wellness/load sync tested' },
      { id: 'int_4', label: 'Missing data gates tested' }
    ]
  },
  {
    id: 'core_pages',
    title: '5. Core Pages',
    items: [
      { id: 'pg_1', label: 'Dashboard' },
      { id: 'pg_2', label: 'Activities' },
      { id: 'pg_3', label: 'Activity Detail' },
      { id: 'pg_4', label: 'Training' },
      { id: 'pg_5', label: 'Wellness' },
      { id: 'pg_6', label: 'Reports' },
      { id: 'pg_7', label: 'Settings' },
      { id: 'pg_8', label: 'Data Health' }
    ]
  },
  {
    id: 'data_cons',
    title: '6. Data Consistency',
    items: [
      { id: 'dc_1', label: 'Dashboard equals Reports for same period' },
      { id: 'dc_2', label: 'Activity List equals Activity Detail' },
      { id: 'dc_3', label: 'Export payload equals source' },
      { id: 'dc_4', label: 'Missing data gates correct' }
    ]
  },
  {
    id: 'ui',
    title: '7. UI',
    items: [
      { id: 'ui_1', label: 'Desktop tested' },
      { id: 'ui_2', label: 'Mobile tested' },
      { id: 'ui_3', label: 'Copy clear' },
      { id: 'ui_4', label: 'No clipped text' },
      { id: 'ui_5', label: 'No gimmick labels' },
      { id: 'ui_6', label: 'No unreadable fonts' }
    ]
  },
  {
    id: 'export',
    title: '8. Export',
    items: [
      { id: 'ex_1', label: 'PNG export works' },
      { id: 'ex_2', label: 'Copy image works' },
      { id: 'ex_3', label: 'Route templates gated' },
      { id: 'ex_4', label: 'HR templates gated' }
    ]
  },
  {
    id: 'privacy',
    title: '9. Privacy',
    items: [
      { id: 'pr_1', label: 'No token in UI' },
      { id: 'pr_2', label: 'No token in localStorage' },
      { id: 'pr_3', label: 'No token in console' },
      { id: 'pr_4', label: 'No cross-user data access' }
    ]
  },
  {
    id: 'product_law',
    title: '10. Product Law',
    items: [
      { id: 'pl_1', label: 'No AI' },
      { id: 'pl_2', label: 'No fake data' },
      { id: 'pl_3', label: 'No mock data' },
      { id: 'pl_4', label: 'Real data only' },
      { id: 'pl_5', label: 'Estimates labeled' }
    ]
  }
];

export default function LaunchChecklistPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('track-studio-launch-checklist');
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse checklist', e);
      }
    }
  }, []);

  const toggleItem = (id: string) => {
    const next = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(next);
    localStorage.setItem('track-studio-launch-checklist', JSON.stringify(next));
  };

  if (!isClient) return null;

  const totalItems = LAUNCH_CHECKLIST.reduce((acc, section) => acc + section.items.length, 0);
  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

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
              <Rocket className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-sm font-bold uppercase tracking-wider text-white">Launch Checklist</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest px-3 py-1 bg-zinc-900 border border-white/10 rounded">
             {completedItems} / {totalItems}
            </div>
          </div>
        </div>
      </header>

      {/* PROGRESS BAR */}
      <div className="h-1 bg-zinc-900 w-full relative">
        <div 
          className="absolute top-0 left-0 h-full bg-[#FC5200] transition-all duration-300" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        
        {/* WARNING BANNER */}
        <div className="bg-blue-950/20 border border-blue-900/40 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wide">Internal Launch Protocol</h3>
            <p className="text-xs text-blue-500/80 mt-1 leading-relaxed font-mono uppercase">
              This checklist is strictly for pre-production launch verification. State is maintained locally. Ensure all environment variables and platform security protocols meet production standards before deployment.
            </p>
          </div>
        </div>

        {/* CHECKLIST SECTIONS */}
        <div className="space-y-6">
          {LAUNCH_CHECKLIST.map((section) => {
            const sectionTotal = section.items.length;
            const sectionCompleted = section.items.filter(item => checkedItems[item.id]).length;
            const isSectionComplete = sectionCompleted === sectionTotal;

            return (
              <div key={section.id} className="bg-[#111113] border border-white/5 rounded-xl overflow-hidden">
                <div className={`p-4 border-b ${isSectionComplete ? 'border-[#FC5200]/20 bg-[#FC5200]/5' : 'border-white/5 bg-black/40'} flex items-center justify-between`}>
                  <h2 className={`text-sm font-bold uppercase tracking-wider ${isSectionComplete ? 'text-[#FC5200]' : 'text-zinc-300'}`}>
                    {section.title}
                  </h2>
                  <span className="text-xs font-mono text-zinc-500">
                    {sectionCompleted}/{sectionTotal}
                  </span>
                </div>
                <div className="divide-y divide-white/5">
                  {section.items.map((item) => {
                    const isChecked = !!checkedItems[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className="w-full p-4 flex items-start gap-4 text-left hover:bg-white/5 transition-colors group"
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-[#FC5200]" />
                          ) : (
                            <Square className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-300'} transition-all`}>
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
