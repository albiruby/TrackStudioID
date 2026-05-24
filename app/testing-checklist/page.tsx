'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  CheckSquare, 
  Square,
  ShieldAlert,
  AlertTriangle,
  Beaker
} from 'lucide-react';

const CHECKLIST_SECTIONS = [
  {
    id: 'auth',
    title: '1. Authentication',
    items: [
      { id: 'auth_1', label: 'Login works' },
      { id: 'auth_2', label: 'Logout works' },
      { id: 'auth_3', label: 'Protected routes redirect unauthenticated users' },
      { id: 'auth_4', label: 'User cannot access other user data' }
    ]
  },
  {
    id: 'firebase',
    title: '2. Firebase',
    items: [
      { id: 'fib_1', label: 'User document created' },
      { id: 'fib_2', label: 'Firestore reads work' },
      { id: 'fib_3', label: 'Firestore writes work' },
      { id: 'fib_4', label: 'Security rules tested' },
      { id: 'fib_5', label: 'No private token readable by client' }
    ]
  },
  {
    id: 'strava',
    title: '3. Strava',
    items: [
      { id: 'str_1', label: 'Connect Strava works' },
      { id: 'str_2', label: 'Disconnect Strava works' },
      { id: 'str_3', label: 'Token refresh works' },
      { id: 'str_4', label: 'Activity sync works' },
      { id: 'str_5', label: 'Detail sync works' },
      { id: 'str_6', label: 'Stream sync works' },
      { id: 'str_7', label: 'Laps/splits/best efforts sync works' },
      { id: 'str_8', label: 'Rate limit handled' },
      { id: 'str_9', label: 'No Strava Premium dependency' }
    ]
  },
  {
    id: 'intervals',
    title: '4. Intervals.icu',
    items: [
      { id: 'int_1', label: 'Connect works' },
      { id: 'int_2', label: 'Disconnect works' },
      { id: 'int_3', label: 'Wellness sync works' },
      { id: 'int_4', label: 'Load sync works' },
      { id: 'int_5', label: 'HRV data gates correctly' },
      { id: 'int_6', label: 'Zones sync works if available' },
      { id: 'int_7', label: 'Planned workouts sync works if available' }
    ]
  },
  {
    id: 'dashboard',
    title: '5. Dashboard',
    items: [
      { id: 'dash_1', label: 'No fake values' },
      { id: 'dash_2', label: 'Totals match reports' },
      { id: 'dash_3', label: 'Missing data gated' },
      { id: 'dash_4', label: 'Recent activities accurate' },
      { id: 'dash_5', label: 'CTL/ATL/TSB only show from valid data' }
    ]
  },
  {
    id: 'activity_detail',
    title: '6. Activity Detail',
    items: [
      { id: 'act_1', label: 'Summary matches activity list' },
      { id: 'act_2', label: 'Map gates no-GPS activities' },
      { id: 'act_3', label: 'Streams render only when available' },
      { id: 'act_4', label: 'HR/pace zones reconcile with stream duration' },
      { id: 'act_5', label: 'No invalid date' },
      { id: 'act_6', label: 'No fake 0 values' }
    ]
  },
  {
    id: 'training',
    title: '7. Training',
    items: [
      { id: 'trn_1', label: 'Athlete profile saves' },
      { id: 'trn_2', label: 'VDOT calculator works' },
      { id: 'trn_3', label: 'HR calculator works' },
      { id: 'trn_4', label: 'Workout builder works' },
      { id: 'trn_5', label: 'Training calendar works' },
      { id: 'trn_6', label: 'Planned vs completed works' },
      { id: 'trn_7', label: 'Reset plan works if implemented' }
    ]
  },
  {
    id: 'wellness',
    title: '8. Wellness and Risk',
    items: [
      { id: 'wel_1', label: 'Wellness logs save' },
      { id: 'wel_2', label: 'Readiness gates correctly' },
      { id: 'wel_3', label: 'HRV Lab gates missing HRV' },
      { id: 'wel_4', label: 'Injury Risk shows Insufficient Data when required' },
      { id: 'wel_5', label: 'Overtraining Guard does not diagnose' }
    ]
  },
  {
    id: 'exports',
    title: '9. Exports',
    items: [
      { id: 'exp_1', label: 'Reports use real data' },
      { id: 'exp_2', label: 'Export Card uses real props' },
      { id: 'exp_3', label: 'Route Art uses real route only' },
      { id: 'exp_4', label: 'Save PNG works' },
      { id: 'exp_5', label: 'Copy image works' },
      { id: 'exp_6', label: 'No UNKNOWN RUN' },
      { id: 'exp_7', label: 'No --KM' },
      { id: 'exp_8', label: 'No invalid date' }
    ]
  },
  {
    id: 'responsive',
    title: '10. Responsive UI',
    items: [
      { id: 'res_1', label: 'Desktop works' },
      { id: 'res_2', label: 'Tablet works' },
      { id: 'res_3', label: 'Mobile works' },
      { id: 'res_4', label: 'No horizontal overflow' },
      { id: 'res_5', label: 'Modals usable' },
      { id: 'res_6', label: 'Tables scroll correctly' }
    ]
  },
  {
    id: 'product_law',
    title: '11. Final Product Law',
    items: [
      { id: 'law_1', label: 'No AI feature' },
      { id: 'law_2', label: 'No fake data' },
      { id: 'law_3', label: 'No mock charts' },
      { id: 'law_4', label: 'No hallucinated metrics' },
      { id: 'law_5', label: 'Real data only' },
      { id: 'law_6', label: 'Estimates labeled' }
    ]
  }
];

export default function TestingChecklistPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('track-studio-testing-checklist');
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
    localStorage.setItem('track-studio-testing-checklist', JSON.stringify(next));
  };

  if (!isClient) return null;

  const totalItems = CHECKLIST_SECTIONS.reduce((acc, section) => acc + section.items.length, 0);
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
              <Beaker className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-sm font-bold uppercase tracking-wider text-white">QA Testing Checklist</h1>
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
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wide">Internal Testing Only</h3>
            <p className="text-xs text-amber-500/80 mt-1 leading-relaxed font-mono uppercase">
              This environment is strictly for application QA verification before launch. Checklist states are saved locally. Ensure all data safety protocols remain active. No mock data or artificial states shall bypass security rules.
            </p>
          </div>
        </div>

        {/* CHECKLIST SECTIONS */}
        <div className="space-y-6">
          {CHECKLIST_SECTIONS.map((section) => {
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
