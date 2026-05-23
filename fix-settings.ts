import * as fs from 'fs';

function updateSettings() {
  const file = 'app/settings/page.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Insert states
  const statesInsertion = `
  const [stravaStatus, setStravaStatus] = useState<any>(null);
  const [checkStrava, setCheckStrava] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

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
  }, [user, checkStrava]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.error) {
           alert('Strava error: ' + event.data.message);
        } else {
           setCheckStrava(prev => !prev);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectStrava = async () => {
    if (!user) return;
    setIsConnecting(true);
    try {
      const qs = new URLSearchParams();
      qs.set('userId', user.uid);
      const res = await fetch(\`/api/strava/connect?\${qs.toString()}\`);
      if (!res.ok) throw new Error('Failed to get auth URL');
      const { url } = await res.json();
      
      const authWindow = window.open(url, 'oauth_popup', 'width=600,height=700');
      if (!authWindow) alert('Please allow popups to connect Strava');
    } catch(e) {
      console.error(e);
      alert('Error initiating connection');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectStrava = async () => {
    if (!user) return;
    if (!confirm('Disconnect Strava?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/strava/disconnect', {
         method: 'POST',
         headers: { 'Authorization': \`Bearer \${token}\` }
      });
      if (res.ok) {
        setCheckStrava(prev => !prev);
      } else {
        alert('Failed to disconnect');
      }
    } catch(e) {
       console.error(e);
    }
  };
`;

  content = content.replace("const [saveSuccess, setSaveSuccess] = useState(false);", "const [saveSuccess, setSaveSuccess] = useState(false);\n" + statesInsertion);

  // Replace Strava Card
  const stravaCardStart = Array.from(content.matchAll(/{\/\* Strava Synchronization Setup Card \*\/}/g))[0].index;
  const workoutsCardStart = Array.from(content.matchAll(/{\/\* Workouts\.icu Integration Setup Card \*\/}/g))[0].index;
  
  if (stravaCardStart === undefined || workoutsCardStart === undefined) {
      console.error('Regex match failed');
      return;
  }

  const newStravaCard = `
            {/* Strava Synchronization Setup Card */}
            <div className="border border-white/10 rounded-lg bg-zinc-955 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-heading text-xl font-bold text-white uppercase tracking-wide">Strava Health Sync</h4>
                  <span className={\`px-2 py-0.5 border \${stravaStatus?.connected ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-400' : 'border-white/10 bg-zinc-900 text-zinc-500'} text-xs uppercase font-bold rounded\`}>
                    {stravaStatus?.connected ? 'CONNECTED' : 'SETUP REQUIRED'}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Exposes cardiac activities, distance matrices, pacing decay intervals, GPS segments and lap summaries.
                </p>

                <div className="bg-zinc-800/50/20 border border-white/10 text-xs p-3 rounded font-mono space-y-1.5 text-zinc-400 leading-relaxed">
                  <div className="flex justify-between">
                    <span>OAUTH GATE:</span>
                    <span className={stravaStatus?.connected ? 'text-emerald-500 font-bold' : 'text-zinc-600'}>{stravaStatus?.connected ? 'ACTIVE' : 'INACTIVE'}</span>
                  </div>
                  {stravaStatus?.connected && (
                    <div className="pt-2 border-t border-white/10 mt-2">
                       <div className="flex justify-between">
                         <span className="text-zinc-500">Athlete:</span>
                         <span className="text-white">{stravaStatus.athleteName || stravaStatus.athleteId}</span>
                       </div>
                       <div className="flex justify-between mt-1">
                         <span className="text-zinc-500">Connected:</span>
                         <span className="text-zinc-300">{new Date(stravaStatus.connectedAt).toLocaleDateString()}</span>
                       </div>
                       <div className="flex justify-between mt-1">
                         <span className="text-zinc-500">Scopes:</span>
                         <span className={stravaStatus.missingScopes ? "text-yellow-500" : "text-green-500"}>{stravaStatus.missingScopes ? 'INCOMPLETE' : 'VALID'}</span>
                       </div>
                    </div>
                  )}
                  {!stravaStatus?.connected && (
                    <div className="text-xs">
                      * Strava OAuth is structured under cloud environment variables and is gated on secure server-side proxy routes to safeguard API client secrets.
                    </div>
                  )}
                </div>
              </div>

              {stravaStatus?.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectStrava}
                  className="mt-6 w-full text-red-400 bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 hover:border-red-900/60 transition-colors p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer"
                >
                  DISCONNECT STRAVA
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectStrava}
                  disabled={isConnecting}
                  className="mt-6 w-full text-[#FC5200] bg-[#FC5200]/10 border border-[#FC5200]/30 hover:bg-[#FC5200]/20 hover:border-[#FC5200]/50 transition-colors p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer"
                >
                  {isConnecting ? 'CONNECTING...' : 'SECURE STRAVA OAUTH CHANNEL'}
                </button>
              )}
            </div>

`;

  content = content.substring(0, stravaCardStart) + newStravaCard + content.substring(workoutsCardStart);

  fs.writeFileSync(file, content);
  console.log("Updated app/settings/page.tsx");
}

updateSettings();
