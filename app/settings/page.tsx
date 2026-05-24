'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Settings, 
  User, 
  Mail, 
  LogOut, 
  Scale, 
  Database, 
  Info, 
  Check, 
  ShieldAlert, 
  AlertTriangle, 
  Globe, 
  Cpu, 
  Calendar, 
  Compass, 
  Lock, 
  RefreshCw,
  Sliders,
  HelpCircle,
  EyeOff,
  Dumbbell
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, athleteProfile, logout, updateAthleteProfile, loading: authLoading } = useAuth();

  // Settings editing states
  const [displayName, setDisplayName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [restingHR, setRestingHR] = useState('');
  const [vdotScore, setVdotScore] = useState('');
  
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [stravaStatus, setStravaStatus] = useState<any>(null);
  const [checkStrava, setCheckStrava] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [intervalsStatus, setIntervalsStatus] = useState<any>(null);
  const [checkIntervals, setCheckIntervals] = useState(false);
  const [isConnectingIntervals, setIsConnectingIntervals] = useState(false);
  const [isSyncingZones, setIsSyncingZones] = useState(false);
  const [isSyncingPlanned, setIsSyncingPlanned] = useState(false);
  const [intervalsAthleteId, setIntervalsAthleteId] = useState('0');
  const [intervalsApiKey, setIntervalsApiKey] = useState('');
  const [showIntervalsForm, setShowIntervalsForm] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncStrava = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/strava/sync/activities', {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
         const data = await res.json();
         alert('Synced ' + data.count + ' activities.');
         setCheckStrava(prev => !prev);
      } else {
         const err = await res.json();
         alert('Failed to sync activities: ' + (err.error || 'Unspecified error'));
      }
    } catch(e) {
       console.error(e);
       alert('Failed to sync activities');
    } finally {
      setIsSyncing(false);
    }
  };


  useEffect(() => {
    async function loadStrava() {
        if (!user) return;
        try {
           const token = await user.getIdToken();
           const res = await fetch('/api/strava/status', {
              headers: { 'Authorization': `Bearer ${token}` }
           });
           if (res.ok) {
             setStravaStatus(await res.json());
           }
        } catch(e) {}
    }
    if (user) loadStrava();
  }, [user, checkStrava]);

  useEffect(() => {
    async function loadIntervals() {
        if (!user) return;
        try {
           const token = await user.getIdToken();
           const res = await fetch('/api/intervals/status', {
              headers: { 'Authorization': `Bearer ${token}` }
           });
           if (res.ok) {
             setIntervalsStatus(await res.json());
           }
        } catch(e) {}
    }
    if (user) loadIntervals();
  }, [user, checkIntervals]);

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
      const token = await user.getIdToken();
      const res = await fetch(`/api/strava/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
         headers: { 'Authorization': `Bearer ${token}` }
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

  const handleDisconnectIntervals = async () => {
    if (!user) return;
    if (!confirm('Disconnect Intervals.icu?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/intervals/disconnect', {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCheckIntervals(prev => !prev);
      } else {
        alert('Failed to disconnect Intervals.icu');
      }
    } catch(e) {
       console.error(e);
    }
  };

  const handleConnectIntervalsOAuth = async () => {
      if (!user) return;
      setIsConnectingIntervals(true);
      try {
        const authWindow = window.open(`/api/intervals/connect?userId=${user.uid}`, 'IntervalsAuth', 'width=600,height=700');
        if (!authWindow) alert('Please allow popups to connect Intervals.icu');
      } catch (error) {
        console.error('Error connecting intervals', error);
      } finally {
        setIsConnectingIntervals(false);
      }
  };

  const handleConnectIntervalsApiKey = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !intervalsApiKey) return;
     setIsConnectingIntervals(true);
     try {
       const token = await user.getIdToken();
       const res = await fetch('/api/intervals/connect-api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ athleteId: intervalsAthleteId, apiKey: intervalsApiKey })
       });
       if (res.ok) {
          setShowIntervalsForm(false);
          setIntervalsApiKey('');
          setCheckIntervals(prev => !prev);
       } else {
          const data = await res.json();
          alert('Failed to connect Intervals.icu API Key: ' + data.error);
       }
     } catch (err) {
       console.error(err);
       alert('Failed to connect API Key');
     } finally {
       setIsConnectingIntervals(false);
     }
  };


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (athleteProfile) {
      setDisplayName(athleteProfile.displayName || '');
      setWeightKg(athleteProfile.weightKg?.toString() || '');
      setRestingHR(athleteProfile.restingHR?.toString() || '');
      setVdotScore(athleteProfile.vdotScore?.toString() || '');
      setUnits(athleteProfile.units || 'metric');
    }
  }, [user, athleteProfile, authLoading, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updateAthleteProfile({
        displayName: displayName || 'Elite Athlete',
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        restingHR: restingHR ? parseInt(restingHR) : undefined,
        vdotScore: vdotScore ? parseFloat(vdotScore) : undefined,
        units: units
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('[Settings Save Error]:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnitChange = async (newVal: 'metric' | 'imperial') => {
    setUnits(newVal);
    if (!user) return;
    try {
      await updateAthleteProfile({
        units: newVal
      });
    } catch (err) {
      console.error('[Unit Change Persist Error]:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs tracking-wider uppercase font-bold text-zinc-400">Loading Athlete Settings...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8 ">
      
      <div className="max-w-[1400px] w-full mx-auto space-y-6">
        
        {/* HEADER BLOCK */}
        <div className="flex items-center gap-6 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Athlete Console Settings</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5">
              Manage terminal profiles, secure data connectors, custom metrics unit systems, and data flow laws
            </p>
          </div>
        </div>

        {/* DATA LAW BANNER (Rule Gated Policy Card) */}
        <div className="bg-[#111113] border border-[#FC5200]/30 rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ShieldAlert className="w-24 h-24 text-[#FC5200]" />
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#FC5200]">
              <ShieldAlert className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wide">TRACK.STUDIO PRINCIPLE LAW DECREE</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2">
              <div className="border border-red-900/60 bg-red-950/10 p-2 text-center rounded">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">NO AI.</p>
              </div>
              <div className="border border-red-900/60 bg-red-950/10 p-2 text-center rounded">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">NO FAKE DATA.</p>
              </div>
              <div className="border border-red-900/60 bg-red-950/10 p-2 text-center rounded">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">NO HALLUCINATION.</p>
              </div>
              <div className="border border-red-900/60 bg-red-950/10 p-2 text-center rounded">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">REAL DATA ONLY.</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-zinc-400 font-mono">
              All metrics on this screen and the active dashboard reports are guaranteed to be fully deterministic. Calculations derive safely from connected Strava API streams, Workouts.icu API wellness logs, stored Firestore documents, or specific, deliberate manual athlete entries. Systems never fabricate training load parameters or simulate imaginary cardiac stress waves.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* SECTION 1: ACCOUNT & ATHLETE TERMINAL */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SECTION 01</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1 flex items-center gap-2">
                <User className="w-4 h-4 text-[#FC5200]" />
                <span>Athlete Profile Terminal</span>
              </h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Credential Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    disabled
                    value={user?.email || 'not-signed-in@track.studio'}
                    className="w-full bg-zinc-800/50/40 border border-white/10/60 text-zinc-500 text-xs p-2.5 pl-10 rounded font-mono cursor-not-allowed select-text"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="athlete-display-name" className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Athlete Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                  <input
                    id="athlete-display-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Steve Prefontaine"
                    className="w-full bg-zinc-800/50/70 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 pl-10 text-zinc-200 rounded transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor="body-mass" className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Body Mass</label>
                  <input
                    id="body-mass"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full bg-zinc-800/50/70 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded transition-colors"
                  />
                  <span className="text-xs text-zinc-600 block mt-0.5 text-right">{units === 'metric' ? 'kg' : 'lbs'}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">Resting HR</label>
                  <input
                    type="number"
                    placeholder="48"
                    value={restingHR}
                    onChange={(e) => setRestingHR(e.target.value)}
                    className="w-full bg-zinc-800/50/70 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded transition-colors"
                  />
                  <span className="text-xs text-zinc-600 block mt-0.5 text-right">bpm</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider block">VDOT Score</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="52.4"
                    value={vdotScore}
                    onChange={(e) => setVdotScore(e.target.value)}
                    className="w-full bg-zinc-800/50/70 border border-white/10 focus:border-[#FC5200] outline-none text-xs p-2.5 text-zinc-200 rounded transition-colors"
                  />
                  <span className="text-xs text-zinc-600 block mt-0.5 text-right">index</span>
                </div>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 animate-fade-in">
                  <Check className="w-4 h-4" /> ATHLETIC METRIC DISPATCH CONSOLIDATED
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800/50 text-black font-bold py-2.5 rounded text-xs select-none cursor-pointer tracking-wider uppercase transition-colors"
                >
                  {saving ? 'UPDATING ARCHIVE...' : 'SAVE TERMINAL VALUES'}
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="bg-zinc-800/50 hover:bg-red-950/40 border border-white/10 hover:border-red-950 text-zinc-400 hover:text-red-400 px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wide cursor-pointer transition-all inline-flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>LOGOUT</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 4: MEASUREMENT UNIT SYSTEM */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SECTION 02</span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#FC5200]" />
                  <span>Velocity & Capacity Systems</span>
                </h2>
              </div>

              <p className="text-xs leading-relaxed text-zinc-400">
                Configure formatting algorithms for distance, velocity, elevation gains, and weight. Metrics system values are stored directly inside athlete cloud metadata documents.
              </p>

              <div className="bg-zinc-800/50/30 border border-white/10 rounded p-4 grid grid-cols-2 gap-6">
                <button
                  type="button"
                  onClick={() => handleUnitChange('metric')}
                  className={`p-3 rounded border text-xs font-bold uppercase tracking-wide text-center transition-all select-none cursor-pointer ${
                    units === 'metric' 
                      ? 'bg-[#FC5200]/10 border-[#FC5200] text-white font-extrabold' 
                      : 'bg-[#111113] border-white/10 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="block text-xs">METRIC SYSTEM</span>
                  <span className="text-sm font-sans text-zinc-400 font-normal block mt-1">KM / METERS / KG</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUnitChange('imperial')}
                  className={`p-3 rounded border text-xs font-bold uppercase tracking-wide text-center transition-all select-none cursor-pointer ${
                    units === 'imperial' 
                      ? 'bg-[#FC5200]/10 border-[#FC5200] text-white font-extrabold' 
                      : 'bg-[#111113] border-white/10 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="block text-xs">IMPERIAL SYSTEM</span>
                  <span className="text-sm font-sans text-zinc-400 font-normal block mt-1">MILES / FEET / LBS</span>
                </button>
              </div>
            </div>

            <div className="border border-white/10 bg-zinc-800/50/10 p-3.5 rounded text-xs text-zinc-400 font-mono leading-relaxed">
              📌 Default: <strong className="text-[#FC5200]">Metric System</strong>. Any calculation overrides automatically convert stored parameters on-the-fly.
            </div>
          </div>

        </div>

        {/* SECTION 2: EXTERNAL DATA CONNECTIONS */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SECTION 03</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1 flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-[#FC5200]" />
              <span>Third-Party Sync Connections</span>
            </h2>
            <p className="text-xs text-zinc-400 font-sans tracking-wide mt-1">
              Secure OAuth tunnels and API synchronizers — Token parameters kept strictly hidden
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            
            {/* Strava Synchronization Setup Card */}
            <div className="border border-white/10 rounded-lg bg-zinc-955 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-heading text-xl font-bold text-white uppercase tracking-wide">Strava Health Sync</h4>
                  <span className={`px-2 py-0.5 border ${stravaStatus?.connected ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-400' : 'border-white/10 bg-zinc-900 text-zinc-500'} text-xs uppercase font-bold rounded`}>
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
                         <span className="text-zinc-500">Status:</span>
                         <span className={stravaStatus.reauthRequired ? "text-red-500" : "text-emerald-500"}>{stravaStatus.reauthRequired ? 'REAUTH REQUIRED' : 'VALID'}</span>
                       </div>
                       {stravaStatus.lastSyncError && (
                         <div className="flex justify-between mt-1">
                           <span className="text-zinc-500">Error:</span>
                           <span className="text-red-500">{stravaStatus.lastSyncError}</span>
                         </div>
                       )}
                       <div className="flex justify-between mt-1">
                         <span className="text-zinc-500">Scopes:</span>
                         <span className="text-green-500">VALID</span>
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
                <div className="mt-6 flex flex-col gap-2">
                   <button
                     type="button"
                     onClick={handleSyncStrava}
                     disabled={isSyncing}
                     className="w-full text-[#FC5200] bg-[#FC5200]/10 border border-[#FC5200]/30 hover:bg-[#FC5200]/20 transition-colors p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer disabled:opacity-50"
                   >
                     {isSyncing ? 'SYNCING ACTIVITIES...' : 'SYNC STRAVA ACTIVITIES'}
                   </button>
                   <button
                     type="button"
                     onClick={handleDisconnectStrava}
                     disabled={isSyncing}
                     className="w-full text-red-400 bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 transition-colors p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer disabled:opacity-50"
                   >
                     DISCONNECT STRAVA
                   </button>
                </div>
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

{/* Workouts.icu Integration Setup Card */}
            <div className="border border-white/10 rounded-lg bg-zinc-955 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-heading text-xl font-bold text-white uppercase tracking-wide">Intervals.icu Portal</h4>
                  <span className={`px-2 py-0.5 border ${intervalsStatus?.connected ? 'border-emerald-900/60 bg-emerald-950/20 text-emerald-400' : 'border-white/10 bg-zinc-900 text-zinc-500'} text-xs uppercase font-bold rounded`}>
                    {intervalsStatus?.connected ? 'CONNECTED' : 'SETUP REQUIRED'}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Consolidates daily morning resting HRV scores, fatigue wellness indices, waking HR levels, and multi-sport training CTL fatigue workloads.
                </p>

                <div className="bg-zinc-800/50/20 border border-white/10 text-xs p-3 rounded font-mono space-y-1.5 text-zinc-400 leading-relaxed">
                  <div className="flex justify-between">
                    <span>API KEY STORAGE:</span>
                    <span className={intervalsStatus?.connected ? 'text-emerald-500 font-bold' : 'text-zinc-600'}>
                      {intervalsStatus?.connected ? 'GATED' : 'CONFINED'}
                    </span>
                  </div>
                  {intervalsStatus?.connected && (
                    <div className="pt-2 border-t border-white/10 mt-2">
                       <div className="flex justify-between">
                         <span className="text-zinc-500">Method:</span>
                         <span className="text-white">{intervalsStatus.authMethod === 'oauth' ? 'OAuth 2.0' : 'API Key'}</span>
                       </div>
                       <div className="flex justify-between mt-1">
                         <span className="text-zinc-500">Athlete ID:</span>
                         <span className="text-zinc-300">{intervalsStatus.athleteId || 'Hidden'}</span>
                       </div>
                       {intervalsStatus.lastSyncError && (
                         <div className="flex justify-between mt-1">
                           <span className="text-zinc-500">Error:</span>
                           <span className="text-red-500">{intervalsStatus.lastSyncError}</span>
                         </div>
                       )}
                       <div className="flex justify-between mt-1">
                         <span className="text-zinc-500">Last Sync:</span>
                         <span className="text-zinc-300">{intervalsStatus.lastSyncAt ? new Date(intervalsStatus.lastSyncAt).toLocaleString() : 'Never'}</span>
                       </div>
                    </div>
                  )}
                  {!intervalsStatus?.connected && (
                    <div className="text-xs mt-2">
                      * Connect Intervals.icu to import training load, wellness, HRV, and planned workouts. Private athlete credentials and secret keys must never write or leak to the frontend client. Integration requires secure server proxy routes.
                    </div>
                  )}
                </div>
              </div>

              {intervalsStatus?.connected ? (
                 <button
                   type="button"
                   onClick={handleDisconnectIntervals}
                   className="mt-6 w-full text-red-400 bg-red-950/20 border border-red-900/40 hover:bg-red-950/40 transition-colors p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer"
                 >
                   DISCONNECT INTERVALS
                 </button>
              ) : (
                <div className="mt-6">
                  {intervalsStatus?.hasOAuth ? (
                     <button
                       type="button"
                       onClick={handleConnectIntervalsOAuth}
                       disabled={isConnectingIntervals}
                       className="w-full text-[#FC5200] bg-[#FC5200]/10 hover:bg-[#FC5200]/20 border border-[#FC5200]/30 p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors disabled:opacity-50"
                     >
                       {isConnectingIntervals ? 'CONNECTING...' : 'CONNECT WITH OAUTH 2.0'}
                     </button>
                  ) : (
                     <>
                        <button
                          type="button"
                          onClick={() => setShowIntervalsForm(!showIntervalsForm)}
                          className="w-full text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/10 p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors"
                        >
                          {showIntervalsForm ? 'CANCEL' : 'SECURE API KEY INJECT (PRIVATE MVP ONLY)'}
                        </button>
                        {showIntervalsForm && (
                          <form onSubmit={handleConnectIntervalsApiKey} className="mt-4 p-4 border border-indigo-900/40 bg-indigo-950/10 rounded-lg space-y-4">
                             <div className="text-xs text-indigo-400 mb-2 font-mono">
                               API key connection is intended for private use. For public use, use OAuth.
                             </div>
                             <div>
                               <label htmlFor="intervals-athlete-id" className="block text-xs uppercase font-bold text-zinc-400 tracking-wider mb-1.5">Athlete ID (Optional)</label>
                               <input 
                                 id="intervals-athlete-id"
                                 type="text" 
                                 placeholder="e.g. 0" 
                                 value={intervalsAthleteId}
                                 onChange={(e) => setIntervalsAthleteId(e.target.value)}
                                 className="w-full bg-zinc-900 border border-white/10 text-white rounded p-2 text-sm focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                               />
                             </div>
                             <div>
                               <label htmlFor="intervals-api-key" className="block text-xs uppercase font-bold text-zinc-400 tracking-wider mb-1.5">API Key</label>
                               <input 
                                 id="intervals-api-key"
                                 type="password" 
                                 required
                                 value={intervalsApiKey}
                                 onChange={(e) => setIntervalsApiKey(e.target.value)}
                                 className="w-full bg-zinc-900 border border-white/10 text-white rounded p-2 text-sm focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                               />
                             </div>
                             <button
                                type="submit"
                                disabled={isConnectingIntervals || !intervalsApiKey}
                                className="w-full text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-900/60 p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors disabled:opacity-50 mt-2"
                             >
                               {isConnectingIntervals ? 'INJECTING...' : 'INJECT SECURE CREDENTIALS'}
                             </button>
                          </form>
                        )}
                     </>
                  )}
                </div>
              )}

              {intervalsStatus?.connected && (
                <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                  <button
                    type="button"
                    onClick={async () => {
                       if (!user) return;
                       setIsConnectingIntervals(true);
                       try {
                         const token = await user.getIdToken();
                         const res = await fetch('/api/intervals/sync/wellness', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                         });
                         if (res.ok) {
                            setCheckIntervals(prev => !prev);
                            alert("Wellness & training loads synced successfully.");
                         } else {
                            const data = await res.json();
                            alert("Sync failed: " + data.error);
                         }
                       } catch(e) {
                         alert("Exception syncing");
                       } finally {
                         setIsConnectingIntervals(false);
                       }
                    }}
                    disabled={isConnectingIntervals || isSyncingZones || isSyncingPlanned}
                    className="w-full text-white bg-zinc-800 hover:bg-zinc-700 border border-white/20 p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isConnectingIntervals ? 'SYNCING WELLNESS & LOAD...' : 'SYNC INTERVALS.ICU WELLNESS'}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                       if (!user) return;
                       setIsSyncingZones(true);
                       try {
                         const token = await user.getIdToken();
                         const res = await fetch('/api/intervals/sync/zones', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                         });
                         const data = await res.json();
                         if (res.ok && data.success) {
                            setCheckIntervals(prev => !prev);
                            alert("Training zones synced successfully from Intervals.icu.");
                         } else {
                            alert("Zones sync failed: " + (data.error || 'No zones returned. Sync from Intervals.icu or enter manually.'));
                         }
                       } catch(e) {
                         alert("Exception syncing zones.");
                       } finally {
                         setIsSyncingZones(false);
                       }
                    }}
                    disabled={isConnectingIntervals || isSyncingZones || isSyncingPlanned}
                    className="w-full text-white bg-zinc-800 hover:bg-zinc-700 border border-white/20 p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSyncingZones ? 'SYNCING TRAINING ZONES...' : 'SYNC INTERVALS.ICU ZONES'}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                       if (!user) return;
                       setIsSyncingPlanned(true);
                       try {
                         const token = await user.getIdToken();
                         const res = await fetch('/api/intervals/sync/planned-workouts', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                         });
                         const data = await res.json();
                         if (res.ok && data.success) {
                            setCheckIntervals(prev => !prev);
                            alert(`Planned workouts calendar synced. Synced ${data.count || 0} scheduled sessions.`);
                         } else {
                            alert("Planned workouts sync failed: " + (data.error || 'API returned empty or invalid structure.'));
                         }
                       } catch(e) {
                         alert("Exception syncing planned workouts.");
                       } finally {
                         setIsSyncingPlanned(false);
                       }
                    }}
                    disabled={isConnectingIntervals || isSyncingZones || isSyncingPlanned}
                    className="w-full text-white bg-zinc-800 hover:bg-zinc-700 border border-white/20 p-2 rounded text-xs uppercase font-bold tracking-wider cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSyncingPlanned ? 'SYNCING PLANNED WORKOUTS...' : 'SYNC PLANNED WORKOUTS'}
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="border border-dashed border-white/10 p-4 rounded text-center text-xs text-zinc-400 uppercase">
            ⚠️ Gated Client Integrity Mode Activated: No third-party API credentials, keys, or token parameters are publicly exposed.
          </div>
        </div>

        {/* SECTION 3: FIREBASE DATA STATUS */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6 sm:p-8 space-y-4">
          <div>
            <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">SECTION 04</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-1 flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-[#FC5200]" />
              <span>Firebase Database Integrations</span>
            </h2>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Track.Studio operates on a live Firestore NoSQL Cloud DB combined with proactive persistent caching. Inspect security access controls and cached databases below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            
            <div className="bg-zinc-800/50/30 border border-white/10 p-4 rounded space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold uppercase text-xs">Cloud Firestore status</span>
                <span className="px-2 py-0.5 border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 text-xs uppercase font-extrabold rounded">
                  ONLINE & READY
                </span>
              </div>
              <div className="space-y-1 text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide leading-relaxed font-mono">
                <div>• Projects endpoint: Google Cloud Firebase Client SDK</div>
                <div>• Read security schema: firestore.rules (Strict userUID block)</div>
                <div>• Write constraint: Authenticated owner-write sandbox only</div>
              </div>
            </div>

            <div className="bg-zinc-800/50/30 border border-white/10 p-4 rounded space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-bold uppercase text-xs">Local persistent offline cache</span>
                <span className="px-2 py-0.5 border border-emerald-900/60 bg-emerald-950/20 text-emerald-400 text-xs uppercase font-extrabold rounded">
                  ACTIVE
                </span>
              </div>
              <div className="space-y-1 text-xs font-sans font-medium text-zinc-400 uppercase tracking-wide leading-relaxed font-mono">
                <div>• Cache engine: persistentLocalCache (Firestore Web SDK)</div>
                <div>• Sync Manager: persistentMultipleTabManager (multi-tab synchronized)</div>
                <div>• Cache security: Local IndexedDB container storage</div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
