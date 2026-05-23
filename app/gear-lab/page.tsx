'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Settings, 
  Check, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Database,
  Sliders
} from 'lucide-react';
import { CanonicalGear } from '../../data/types';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase/client';

export default function GearLabPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [gear, setGear] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New shoe states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [startingKm, setStartingKm] = useState('0');
  const [maxKm, setMaxKm] = useState('800');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function loadGear() {
    if (!user) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'gear'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const loaded = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setGear(loaded);
    } catch (e) {
      console.warn('Gear collection load error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadGear();
      }
    }
  }, [user, authLoading, router]);

  const handleAddGear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await addDoc(collection(db, 'gear'), {
        userId: user.uid,
        name: name.trim(),
        brand: brand.trim() || 'Custom Brand',
        currentDistanceMeters: (parseFloat(startingKm) || 0) * 1000,
        maxDistanceMeters: (parseFloat(maxKm) || 800) * 1000,
        acquiredDate: new Date().toISOString().split('T')[0],
        status: 'active'
      });
      setName('');
      setBrand('');
      setStartingKm('0');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      await loadGear();
    } catch (err) {
      console.error('[Add Gear Sync Error]:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    try {
      await deleteDoc(doc(db, 'gear', gearId));
      await loadGear();
    } catch (e) {
      console.error('Delete gear failed:', e);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Querying Active Gear Shed...</span>
      </div>
    );
  }

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
              <Settings className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Shoe Mileage & Equipment Lab</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Track cardiovascular workloads logged against active footwear components
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ADD COMPONENT FORM */}
          <form onSubmit={handleAddGear} className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 h-fit">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">PROVISION NEW</span>
              <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Register Footwear</h2>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold block">Model Name</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vaporfly Next% 3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-200 font-sans rounded"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400 uppercase font-bold block">Manufacturer Brand</span>
                <input
                  type="text"
                  placeholder="e.g. Nike"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-zinc-200 font-sans rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Base Mileage (km)</span>
                  <input
                    type="number"
                    value={startingKm}
                    onChange={(e) => setStartingKm(e.target.value)}
                    className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-center text-zinc-200 font-sans rounded"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-400 uppercase font-bold block">Fatigue threshold</span>
                  <input
                    type="number"
                    value={maxKm}
                    onChange={(e) => setMaxKm(e.target.value)}
                    className="w-full bg-transparent border border-white/10 w-full p-2.5 outline-none focus:border-[#FC5200] text-xs text-center text-zinc-200 font-sans rounded"
                  />
                </div>
              </div>

              {saveSuccess && (
                <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 font-mono">
                  <Check className="w-4 h-4" /> COMPONENT LOGGED IN SHED
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800/50 text-black font-bold text-xs py-2.5 rounded uppercase tracking-wider cursor-pointer"
              >
                {saving ? 'DEPOSITING...' : 'REGISTER GEAR UNIT'}
              </button>
            </div>
          </form>

          {/* ACTIVE SHED */}
          <div className="bg-[#111113] border border-white/10 rounded-lg p-6 md:col-span-2 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase">INVENTORY STATS</span>
              <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Active Gear Archive</h2>
            </div>

            {gear.length > 0 ? (
              <div className="space-y-4">
                {gear.map((g) => {
                  const currentKm = (g.currentDistanceMeters || 0) / 1000;
                  const thresholdKm = (g.maxDistanceMeters || 800000) / 1000;
                  const pct = Math.min(100, Math.round((currentKm / thresholdKm) * 100));

                  return (
                    <div key={g.id} className="border border-white/10d0 bg-zinc-800/50/10 p-6 rounded-xl space-y-3 relative">
                      <button
                        onClick={() => handleDeleteGear(g.id)}
                        className="absolute top-4 right-4 p-1 text-zinc-600 hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Dismantle item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="space-y-1">
                        <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider block">{g.brand}</span>
                        <h3 className="text-sm font-bold text-white uppercase">{g.name}</h3>
                      </div>

                      <div className="space-y-1.5 font-mono">
                        <div className="flex justify-between text-xs uppercase text-zinc-400">
                          <span>Accumulated Mileage:</span>
                          <span className="font-extrabold text-white">{currentKm.toFixed(1)} km / {thresholdKm} km</span>
                        </div>
                        {/* PROGRESS BAR */}
                        <div className="w-full h-2 bg-zinc-800/50 border border-white/10 rounded overflow-hidden">
                          <div 
                            className="bg-[#FC5200] h-full rounded transition-all" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-sm font-sans text-zinc-400 text-right uppercase">
                          Component Wear and tear: {pct}% fatigue
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 border border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                <Database className="w-8 h-8 text-zinc-600 mb-2" />
                <span className="text-xs text-zinc-400 uppercase">No athletic footwear logged in components registry system.</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
