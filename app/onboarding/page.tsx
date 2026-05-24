'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { db } from '../../lib/firebase/client';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { RefreshCw, ArrowRight, ShieldCheck, Database, Activity, MapPin, CheckCircle, Flame, ShieldAlert, ArrowLeft, Edit2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, athleteProfile, updateAthleteProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Connection state
  const [stravaConnected, setStravaConnected] = useState(false);
  const [intervalsConnected, setIntervalsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Form state for baseline
  const [form, setForm] = useState({
    displayName: '',
    weightKg: '',
    restingHR: '',
    maxHR: '',
    thresholdPace: ''
  });

  useEffect(() => {
    const init = async () => {
      if (!user) {
        router.push('/');
        return;
      }
      if (!db) return;
      try {
        const onboardingRef = doc(db, 'users', user.uid, 'settings', 'onboarding');
        const snap = await getDoc(onboardingRef);
        if (snap.exists() && snap.data()?.completed) {
          router.push('/dashboard');
          return;
        }
        
        // Load existing connections to prefill flags
        const stravaCheck = await getDoc(doc(db, 'users', user.uid, 'connections', 'strava'));
        if (stravaCheck.exists()) setStravaConnected(true);

        const intervalsCheck = await getDoc(doc(db, 'users', user.uid, 'connections', 'intervals'));
        if (intervalsCheck.exists()) setIntervalsConnected(true);

        setForm({
           displayName: athleteProfile?.displayName || user.displayName || '',
           weightKg: athleteProfile?.weightKg?.toString() || '',
           restingHR: athleteProfile?.restingHeartRate?.toString() || '',
           maxHR: athleteProfile?.maxHeartRate?.toString() || '',
           thresholdPace: athleteProfile?.thresholdPaceSecPerKm ? formatPace(athleteProfile.thresholdPaceSecPerKm) : ''
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, athleteProfile, router]);

  // Listener for OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === 'object' && event.data.type === 'oauth_success') {
        if (event.data.provider === 'strava') {
          setStravaConnected(true);
          handleNext();
        } else if (event.data.provider === 'intervals') {
          setIntervalsConnected(true);
          handleNext();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [step]); // step dependency to allow handleNext cleanly

  const formatPace = (secPerKm: number) => {
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const parsePace = (str: string) => {
    if (!str) return null;
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 7));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

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

  const handleConnectIntervals = () => {
    if (!user) return;
    setIsConnecting(true);
    try {
      const authWindow = window.open(`/api/intervals/connect?userId=${user.uid}`, 'IntervalsAuth', 'width=600,height=700');
      if (!authWindow) alert('Please allow popups to connect Intervals.icu');
    } catch (e) {
      console.error(e);
    } finally {
      setIsConnecting(false);
    }
  };

  const saveProfileAndContinue = async () => {
    setIsConnecting(true);
    try {
      const updates: any = {};
      if (form.displayName) updates.displayName = form.displayName;
      if (form.weightKg) updates.weightKg = parseFloat(form.weightKg);
      if (form.restingHR) updates.restingHeartRate = parseInt(form.restingHR, 10);
      if (form.maxHR) updates.maxHeartRate = parseInt(form.maxHR, 10);
      
      const pSec = parsePace(form.thresholdPace);
      if (pSec) updates.thresholdPaceSecPerKm = pSec;

      await updateAthleteProfile(updates);
      handleNext();
    } catch (e) {
      console.error(e);
      alert("Failed to save profile updates.");
    } finally {
      setIsConnecting(false);
    }
  };

  const completeOnboarding = async () => {
    if (!user || !db) return;
    setIsConnecting(true);
    try {
      const onboardingRef = doc(db, 'users', user.uid, 'settings', 'onboarding');
      await setDoc(onboardingRef, {
        completed: true,
        completedAt: serverTimestamp()
      }, { merge: true });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to complete onboarding. Check console logs.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-[10px] tracking-widest uppercase font-mono text-zinc-500">Initializing Profile Context...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-200 flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center pt-16 md:pt-24 p-6">
        
        {/* Progress Bar */}
        <div className="w-full max-w-2xl mb-8">
           <div className="h-1 bg-zinc-900 w-full rounded overflow-hidden flex">
             {[1,2,3,4,5,6,7].map(i => (
               <div key={i} className={`flex-1 ${i <= step ? 'bg-[#FC5200]' : 'bg-transparent'} ${i < step ? 'opacity-50' : ''} border-r border-[#070708]`} />
             ))}
           </div>
        </div>

        <div className="w-full max-w-2xl max-h-min bg-[#0f0f12] border border-white/5 rounded-xl shadow-2xl relative overflow-hidden flex flex-col">
          {/* Top highlight */}
          <div className="h-1 w-full bg-gradient-to-r from-[#FC5200] to-orange-400 absolute top-0 left-0"></div>

          <div className="p-8 md:p-12 space-y-6">
            
            {/* STEP 1: WELCOME */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="w-12 h-12 bg-[#FC5200]/10 border border-[#FC5200]/20 flex items-center justify-center rounded-lg mb-6">
                  <Activity className="w-6 h-6 text-[#FC5200]" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome to Track.Studio</h1>
                  <p className="text-zinc-400 leading-relaxed max-w-lg text-sm">
                    Analyze your training, recovery, and performance using real activity data.
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded text-sm text-zinc-300">
                  Track.Studio uses synced data from Strava, Intervals.icu, Firebase-stored user data, and manual input where needed. We do not generate mock analytics or fake metrics.
                </div>
                <button onClick={handleNext} className="w-full py-3 bg-white text-black font-bold uppercase tracking-wider rounded text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 mt-8">
                  Begin <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: DATA SOURCES */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Database className="w-4 h-4 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Data Sources</h2>
                </div>
                <p className="text-zinc-400 text-sm">To provide accurate analytics without fabricating data, Track.Studio relies on three core data pillars:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="border border-white/5 bg-zinc-900/40 p-4 rounded flex flex-col items-center text-center gap-3">
                    <MapPin className="w-6 h-6 text-[#FC5200]" />
                    <div>
                      <h3 className="text-xs font-bold uppercase text-zinc-300 tracking-wider">Strava</h3>
                      <p className="text-zinc-500 text-[11px] mt-1">Imports real activities, routes, pace, heart rate, power, laps, splits, and best efforts when available via free API capabilities.</p>
                    </div>
                  </div>
                  
                  <div className="border border-white/5 bg-zinc-900/40 p-4 rounded flex flex-col items-center text-center gap-3">
                    <Activity className="w-6 h-6 text-indigo-400" />
                    <div>
                      <h3 className="text-xs font-bold uppercase text-zinc-300 tracking-wider">Intervals.icu</h3>
                      <p className="text-zinc-500 text-[11px] mt-1">Imports training load, wellness, HRV, physiological zones, and planned scheduled workouts.</p>
                    </div>
                  </div>

                  <div className="border border-white/5 bg-zinc-900/40 p-4 rounded flex flex-col items-center text-center gap-3">
                    <Edit2 className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h3 className="text-xs font-bold uppercase text-zinc-300 tracking-wider">Manual Input</h3>
                      <p className="text-zinc-500 text-[11px] mt-1">Direct explicit input for athlete profiles, wellness logging, and custom workout structures.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                  <button onClick={handlePrev} className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider rounded text-xs transition-colors flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={handleNext} className="flex-1 py-3 bg-white text-black font-bold uppercase tracking-wider rounded text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                    Connect Services <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Connect Strava */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="w-12 h-12 bg-[#FC5200]/10 border border-[#FC5200]/20 flex items-center justify-center rounded-lg mb-6">
                  <svg className="w-6 h-6 text-[#FC5200]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Connect Strava</h2>
                  <p className="text-zinc-400 text-sm">Sync your public activity logs to populate the dashboard metrics.</p>
                </div>
                
                {stravaConnected ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 flex items-center gap-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">Strava Connected</h4>
                      <p className="text-xs opacity-75">Your activities are now ready to stream securely.</p>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnectStrava} 
                    disabled={isConnecting}
                    className="w-full py-4 bg-[#FC5200] text-white font-bold uppercase tracking-wider rounded text-sm hover:bg-[#e44a00] transition-colors flex items-center justify-center gap-2"
                  >
                     {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Connect Strava Securely'}
                  </button>
                )}

                <div className="flex items-center gap-3 pt-6">
                  <button onClick={handlePrev} className="px-4 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider rounded text-xs transition-colors flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={handleNext} className="flex-1 py-3 bg-zinc-900 border border-white/5 text-white font-bold uppercase tracking-wider rounded text-xs hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                    {stravaConnected ? 'Continue' : 'Skip For Now'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {!stravaConnected && <p className="text-center text-[10px] text-zinc-500 uppercase tracking-wider">You can connect Strava later from Settings.</p>}
              </div>
            )}

            {/* STEP 4: Connect Intervals */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center rounded-lg mb-6">
                  <Activity className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Connect Intervals.icu</h2>
                  <p className="text-zinc-400 text-sm">Sync your wellness, HRV, zones, and training calendar.</p>
                </div>
                
                {intervalsConnected ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 flex items-center gap-3 rounded-lg">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">Intervals.icu Connected</h4>
                      <p className="text-xs opacity-75">Your training loads and wellness parameters are ready.</p>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnectIntervals} 
                    disabled={isConnecting}
                    className="w-full py-4 bg-indigo-600 text-white font-bold uppercase tracking-wider rounded text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                     {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Connect via OAuth'}
                  </button>
                )}

                <div className="flex items-center gap-3 pt-6">
                  <button onClick={handlePrev} className="px-4 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider rounded text-xs transition-colors flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={handleNext} className="flex-1 py-3 bg-zinc-900 border border-white/5 text-white font-bold uppercase tracking-wider rounded text-xs hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                    {intervalsConnected ? 'Continue' : 'Skip For Now'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {!intervalsConnected && <p className="text-center text-[10px] text-zinc-500 uppercase tracking-wider">You can connect Intervals.icu later from Settings.</p>}
              </div>
            )}

            {/* STEP 5: Athlete Profile */}
            {step === 5 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <Flame className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Athlete Baseline</h2>
                </div>
                <p className="text-zinc-400 text-sm">Provide physiological baseline parameters to ensure tracking models calculate accurately. You can leave these blank if unknown.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Display Name</label>
                    <input 
                      type="text" 
                      value={form.displayName} 
                      onChange={e => setForm(p => ({...p, displayName: e.target.value}))} 
                      placeholder="Not set" 
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-[#FC5200] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Weight (kg)</label>
                    <input 
                      type="number" 
                      value={form.weightKg} 
                      onChange={e => setForm(p => ({...p, weightKg: e.target.value}))} 
                      placeholder="Not set" 
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-[#FC5200] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Resting Heart Rate</label>
                    <input 
                      type="number" 
                      value={form.restingHR} 
                      onChange={e => setForm(p => ({...p, restingHR: e.target.value}))} 
                      placeholder="Not set" 
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-[#FC5200] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Max Heart Rate</label>
                    <input 
                      type="number" 
                      value={form.maxHR} 
                      onChange={e => setForm(p => ({...p, maxHR: e.target.value}))} 
                      placeholder="Not set" 
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-[#FC5200] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Threshold Pace (MM:SS) <span className="opacity-50 lowercase float-right">per km</span></label>
                    <input 
                      type="text" 
                      value={form.thresholdPace} 
                      onChange={e => setForm(p => ({...p, thresholdPace: e.target.value}))} 
                      placeholder="e.g. 05:30 (Not set)" 
                      className="w-full bg-black border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-[#FC5200] transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                  <button onClick={handlePrev} className="px-4 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider rounded text-xs transition-colors flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={saveProfileAndContinue} 
                    disabled={isConnecting}
                    className="flex-1 py-3 bg-white text-black font-bold uppercase tracking-wider rounded text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                  >
                    {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save & Continue'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: Data Law */}
            {step === 6 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                    <ShieldCheck className="w-4 h-4 text-yellow-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Product Principles</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-4 p-4 rounded bg-zinc-900/50 border border-white/5">
                    <CheckCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200">No AI-generated metrics</h4>
                      <p className="text-xs text-zinc-500 mt-1">We do not employ AI or LLMs to evaluate or diagnose your physiological data.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded bg-zinc-900/50 border border-white/5">
                    <CheckCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200">No fake data</h4>
                      <p className="text-xs text-zinc-500 mt-1">Missing analytics are explicitly flagged as "Data not available" instead of zeroed or mocked.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded bg-zinc-900/50 border border-white/5">
                    <CheckCircle className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200">Transparent Estimates</h4>
                      <p className="text-xs text-zinc-500 mt-1">When mathematical conversions are applied (such as VDOT indices or Race Time Models), they are clearly labeled as "Estimated" or "Simulation Mode".</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <button onClick={handlePrev} className="px-4 py-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white font-bold uppercase tracking-wider rounded text-xs transition-colors flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={handleNext} className="flex-1 py-3 bg-white text-black font-bold uppercase tracking-wider rounded text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
                    Accept Principles <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: Finish */}
            {step === 7 && (
              <div className="space-y-6 animate-fade-in text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-full mb-2">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-extrabold text-white">System Ready</h2>
                <p className="text-zinc-400 text-sm max-w-sm mb-4">
                  Track.Studio is initialized. Head to the dashboard to begin processing your data.
                </p>

                <div className="w-full pt-8">
                  <button 
                    onClick={completeOnboarding} 
                    disabled={isConnecting}
                    className="w-full py-4 bg-[#FC5200] text-white font-bold uppercase tracking-wider rounded text-sm hover:bg-[#e44a00] transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                     {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Go To Dashboard'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
