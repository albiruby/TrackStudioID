import * as fs from 'fs';

function updateSidebar() {
  const filePath = 'components/track-studio-shell.tsx';
  let content = fs.readFileSync(filePath, 'utf8');
  
  const sidebarStart = content.indexOf('<div className="flex-1 overflow-y-auto p-4 space-y-6">');
  const sidebarEnd = content.indexOf('<div className="p-4 border-t border-white/10 space-y-2">');
  
  if (sidebarStart === -1 || sidebarEnd === -1) {
    console.error('Could not find sidebar boundaries');
    return;
  }
  
  const newSidebar = `<div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">CORE</span>
            <button
              onClick={() => handleTabChange('dashboard')}
              className={\`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                activeTab === 'dashboard' ? 'bg-[#FC5200]/10 text-[#FC5200]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }\`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('activities')}
              className={\`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                activeTab === 'activities' ? 'bg-[#FC5200]/10 text-[#FC5200]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }\`}
            >
              Activities
            </button>
            <button onClick={() => router.push('/training')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              Training
            </button>
            <button onClick={() => router.push('/workout-library')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              Workout Library
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">ANALYTICS</span>
            <button onClick={() => router.push('/compare-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Compare Activities</button>
            <button onClick={() => router.push('/form-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Running Form</button>
            <button onClick={() => router.push('/course-records')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Course Records</button>
            <button onClick={() => router.push('/best-efforts')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Best Efforts</button>
            <button onClick={() => router.push('/gear-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Gear Tracker</button>
            <button onClick={() => router.push('/trail-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Trail Analysis</button>
            <button onClick={() => router.push('/prediction')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Race Predictor</button>
            <button onClick={() => router.push('/vdot-calculator')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">VDOT Calculator</button>
            <button onClick={() => router.push('/hr-calculator')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Heart Rate Calculator</button>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">WELLNESS</span>
             <button
              onClick={() => handleTabChange('wellness')}
              className={\`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                activeTab === 'wellness' ? 'bg-[#FC5200]/10 text-[#FC5200]' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }\`}
            >
              Wellness
            </button>
            <button onClick={() => router.push('/hrv-lab')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">HRV Lab</button>
            <button onClick={() => router.push('/morning-check')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Morning Check</button>
            <button onClick={() => router.push('/sleep')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Sleep</button>
            <button onClick={() => router.push('/overtraining-guard')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Overtraining Guard</button>
            <button onClick={() => router.push('/injury-radar')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Injury Risk</button>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider px-3 mb-2 block">TOOLS</span>
            <button onClick={() => router.push('/reports')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Reports</button>
            <button onClick={() => router.push('/route-art')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Route Art</button>
            <button onClick={() => router.push('/athlete-profile')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Athlete Profile</button>
            <button onClick={() => router.push('/how-to-use')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">How to Use</button>
            <button onClick={() => router.push('/settings')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Settings</button>
            <button onClick={() => router.push('/data-health')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">Data Health</button>
          </div>
        </div>\n\n        `;
        
  content = content.substring(0, sidebarStart) + newSidebar + content.substring(sidebarEnd);
  
  // also clean up old ATHLETE block, since we brought Athlete Profile into TOOLS 
  // Let's replace the whole bottom section, but keep Sign Out

  const bottomSectionStart = content.indexOf('<div className="p-4 border-t border-white/10 space-y-2">');
  const bottomSectionEnd = content.indexOf('</aside>');
  
  if (bottomSectionStart !== -1 && bottomSectionEnd !== -1) {
    const bottomNew = `<div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-red-900/40"
          >
            Sign Out
          </button>
        </div>
      `;
    content = content.substring(0, bottomSectionStart) + bottomNew + content.substring(bottomSectionEnd);
  }

  // Rewrite card titles in the dashboard
  content = content.replace(/h3 className="text-base font-semibold text-white tracking-wide group-hover:text-\[#FC5200\] transition-colors">Consolidated Reports/g, 'h3 className="text-base font-semibold text-white tracking-wide group-hover:text-[#FC5200] transition-colors">Reports');

  fs.writeFileSync(filePath, content);
  console.log("Sidebar rewritten successfully");
}

updateSidebar();
