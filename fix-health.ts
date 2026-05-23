import * as fs from 'fs';

function updateDataHealth() {
  const file = 'app/data-health/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Add state
  const stateInsert = `
  const [stravaStatus, setStravaStatus] = useState<any>(null);

  useEffect(() => {
    async function loadStrava() {
        if (!user) return;
        try {
           const token = await user.getIdToken();
           const res = await fetch('/api/strava/status', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           });
           if (res.ok) {
             setStravaStatus(await res.json());
           }
        } catch(e) {}
    }
    if (user) loadStrava();
  }, [user]);
`;

  content = content.replace("const [stravaConnected, setStravaConnected] = useState(false);", "const [stravaConnected, setStravaConnected] = useState(false);\n" + stateInsert);

  // Replace Strava Sync Panel
  const stravaStartIdx = Array.from(content.matchAll(/{\/\* STRAVA SYNC PANEL \*\/}/g))[0].index;
  const intervalsStartIdx = Array.from(content.matchAll(/{\/\* INTERVALS\.ICU SYNC PANEL \*\/}/g))[0].index;

  const newStravaCard = `
          {/* STRAVA SYNC PANEL */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">EXTERNAL CONNECTIONS 01</span>
                <div className="flex justify-between items-center mt-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Strava API Bridge</h3>
                  {stravaStatus?.connected ? (
                    <span className="px-2 py-0.5 border border-orange-950 bg-orange-950/20 text-[#FC5200] text-[9.5px] uppercase font-extrabold rounded">
                      CONNECTED
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 border border-white/10 bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold rounded">
                      Not connected / setup required
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-white/10 p-4 rounded bg-zinc-800/50/20 space-y-3.5 text-xs text-zinc-400">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Token Status</span>
                  <span className="text-zinc-300">
                    {stravaStatus?.connected ? (
                      stravaStatus.isExpired ? 'EXPIRED' : 'ACTIVE'
                    ) : 'NOT FOUND'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Authorization Scopes</span>
                  <span className="text-zinc-300">
                    {stravaStatus?.connected ? stravaStatus.scopes : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-zinc-400 uppercase text-[9.5px]">Last Sync Timestamp</span>
                  <span className="text-zinc-300">
                    {stravaStatus?.connected && stravaStatus.lastSyncAt ? new Date(stravaStatus.lastSyncAt).toLocaleString() : 'NEVER SYNCED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 uppercase text-[9.5px]">API Status Endpoint</span>
                  <span className="text-emerald-400">https://www.strava.com/api/v3</span>
                </div>
              </div>
              
              {!stravaStatus?.connected && (
                  <div className="text-xs text-red-400 font-bold uppercase mt-2">
                     Connect Strava to import your real activities.
                  </div>
              )}
              {stravaStatus?.connected && stravaStatus.missingScopes && (
                 <div className="text-xs text-yellow-500 font-bold uppercase mt-2">
                    Missing scopes: {stravaStatus.missingScopes.join(', ')}
                 </div>
              )}
            </div>
            
            <button
              onClick={() => {
                 router.push('/settings')
              }}
              className="mt-5 w-full bg-zinc-900 hover:bg-zinc-850 text-[#FC5200] border border-white/10 hover:border-white/20 py-2.5 rounded font-bold uppercase text-xs tracking-wider cursor-pointer transition-all inline-flex items-center justify-center gap-2"
            >
              <Cable className="w-3.5 h-3.5" />
              <span>{stravaStatus?.connected ? 'Manage Connection in Settings' : 'Connect in Settings'}</span>
            </button>
          </div>

`;

  if (stravaStartIdx !== undefined && intervalsStartIdx !== undefined) {
      content = content.substring(0, stravaStartIdx) + newStravaCard + content.substring(intervalsStartIdx);
  }

  // Remove the "Demo placeholder" text about Strava inside the dashboard
  fs.writeFileSync(file, content);
  console.log("Updated app/data-health/page.tsx");
}

updateDataHealth();
