'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { SyncRequiredState } from '../../components/common/SyncRequiredState';
import { 
  ArrowLeft, 
  Settings, 
  Check, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Database,
  Sliders,
  AlertCircle,
  Eye,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import { CanonicalGear, CanonicalActivity } from '../../data/types';
import { getGearList, saveGear, deleteGear, getActivities } from '../../lib/firebase/firestore';

export default function GearTrackerPage() {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();
  
  // Real datasets
  const [gear, setGear] = useState<CanonicalGear[]>([]);
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // New manual shoe inputs
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'shoes' | 'bike' | 'other'>('shoes');
  const [startingKm, setStartingKm] = useState('0');
  const [thresholdKm, setThresholdKm] = useState('800');
  const [notes, setNotes] = useState('');

  // Editing component states
  const [editingGear, setEditingGear] = useState<CanonicalGear | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editThreshold, setEditThreshold] = useState('800');
  const [editNotes, setEditNotes] = useState('');
  const [editRetired, setEditRetired] = useState(false);
  const [editManualDistance, setEditManualDistance] = useState('0');

  // Interactive UI states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function loadGearAndActivities() {
    if (!user) return;
    try {
      setLoading(true);
      
      // Load current gear & activities
      const loadedGearList = await getGearList(user.uid) || [];
      const loadedActivities = await getActivities(user.uid) || [];
      setActivities(loadedActivities);

      // Auto-import gear from Strava activities if gearId is present and not yet registered
      const stravaGearToAutoRegister: Partial<CanonicalGear>[] = [];
      for (const act of loadedActivities) {
        if (act.gearId) {
          const alreadyExists = loadedGearList.some(g => g.externalId === act.gearId || g.id === act.gearId);
          const alreadyStaged = stravaGearToAutoRegister.some(g => g.externalId === act.gearId);
          
          if (!alreadyExists && !alreadyStaged) {
            const gearObj = act.raw?.gear;
            const gearName = gearObj?.name || act.raw?.gear_name || `Strava Shoe (${act.gearId})`;
            const gearBrand = gearObj?.brand_name || '';
            const gearModel = gearObj?.model_name || '';
            const gearDistance = gearObj?.distance !== undefined ? gearObj.distance : 0;
            
            const newStravaGear: Partial<CanonicalGear> = {
              userId: user.uid,
              source: 'strava',
              externalId: act.gearId,
              name: gearName,
              brand: gearBrand || undefined,
              model: gearModel || undefined,
              type: 'shoes',
              distanceMeters: gearDistance,
              manualDistanceMeters: 0,
              replacementThresholdKm: 800,
              retired: gearObj?.retired || false,
              notes: gearObj?.notes || `Imported automatically from activities listing`,
              raw: gearObj || null
            };
            stravaGearToAutoRegister.push(newStravaGear);
          }
        }
      }

      if (stravaGearToAutoRegister.length > 0) {
        for (const newG of stravaGearToAutoRegister) {
          await saveGear(user.uid, newG);
        }
        const refreshedGearList = await getGearList(user.uid) || [];
        setGear(refreshedGearList);
      } else {
        setGear(loadedGearList);
      }
    } catch (e) {
      console.warn('Gear and Activity datasets load error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadGearAndActivities();
      }
    }
  }, [user, authLoading, router]);

  // Handle Add Gear manually
  const handleAddGear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const isMetricVal = athleteProfile?.preferredUnits !== 'imperial';
      const inputStartDist = parseFloat(startingKm) || 0;
      const inputThreshold = parseFloat(thresholdKm) || 800;

      // distanceMeters & manualDistanceMeters are in meters.
      // replacementThresholdKm is in kilometers.
      const startDistMeters = isMetricVal ? inputStartDist * 1000 : inputStartDist * 1609.344;
      const parsedThresholdKm = isMetricVal ? inputThreshold : inputThreshold * 1.609344;
      
      const newGearPayload: Partial<CanonicalGear> = {
        userId: user.uid,
        source: 'manual',
        name: name.trim(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        type: type,
        distanceMeters: startDistMeters,
        manualDistanceMeters: startDistMeters,
        replacementThresholdKm: parsedThresholdKm,
        retired: false,
        notes: notes.trim() || undefined
      };

      await saveGear(user.uid, newGearPayload);
      
      // Clear inputs
      setName('');
      setBrand('');
      setModel('');
      setStartingKm('0');
      setThresholdKm('800');
      setNotes('');
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      await loadGearAndActivities();
    } catch (err) {
      console.error('[Add Gear Custom Error]:', err);
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Pane
  const handleStartEdit = (g: CanonicalGear) => {
    const isMetricVal = athleteProfile?.preferredUnits !== 'imperial';
    setEditingGear(g);
    setEditName(g.name);
    setEditBrand(g.brand || '');
    setEditModel(g.model || '');
    
    // Threshold is stored in km
    const thresholdKmVal = g.replacementThresholdKm || 800;
    const thresholdDisplay = isMetricVal ? thresholdKmVal : Math.round(thresholdKmVal * 0.621371);
    setEditThreshold(thresholdDisplay.toString());
    
    setEditNotes(g.notes || '');
    setEditRetired(g.retired || false);
    
    // Manual base distance is stored in meters
    const currentMetersVal = g.manualDistanceMeters || g.distanceMeters || 0;
    const distanceDisplay = isMetricVal ? (currentMetersVal / 1000) : (currentMetersVal / 1609.344);
    setEditManualDistance(distanceDisplay.toFixed(1));
  };

  // Save Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingGear) return;
    setSaving(true);
    try {
      const isMetricVal = athleteProfile?.preferredUnits !== 'imperial';
      const inputThresholdVal = parseFloat(editThreshold) || 800;
      const parsedThresholdKmVal = isMetricVal ? inputThresholdVal : inputThresholdVal * 1.609344;

      const updated: Partial<CanonicalGear> = {
        ...editingGear,
        name: editName.trim(),
        brand: editBrand.trim() || undefined,
        model: editModel.trim() || undefined,
        replacementThresholdKm: parsedThresholdKmVal,
        notes: editNotes.trim() || undefined,
        retired: editRetired,
        retiredAt: editRetired ? (editingGear.retiredAt || new Date().toISOString()) : undefined
      };

      if (editingGear.source === 'manual') {
        const inputDistVal = parseFloat(editManualDistance) || 0;
        const manualMeters = isMetricVal ? inputDistVal * 1000 : inputDistVal * 1609.344;
        updated.manualDistanceMeters = manualMeters;
        updated.distanceMeters = manualMeters;
      }

      await saveGear(user.uid, updated);
      setEditingGear(null);
      await loadGearAndActivities();
    } catch (err) {
      console.error('Failed to update gear element:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    if (!user) return;
    if (!confirm('Are you absolutely sure you want to discard this item from your equipment list?')) return;
    try {
      await deleteGear(user.uid, gearId);
      await loadGearAndActivities();
    } catch (e) {
      console.error('Delete gear failed:', e);
    }
  };

  // Preference details
  const isMetric = athleteProfile?.preferredUnits !== 'imperial';

  // Distance calculator metrics
  const getGearDistanceMeters = (g: CanonicalGear) => {
    if (g.source === 'manual') {
      return g.manualDistanceMeters || g.distanceMeters || 0;
    }
    // For Strava gear, use sync distance. Default to accumulated activities if 0 or unavailable
    if (g.distanceMeters && g.distanceMeters > 0) {
      return g.distanceMeters;
    }
    const matching = activities.filter(act => act.gearId === g.externalId || act.gearId === g.id);
    return matching.reduce((sum, act) => sum + (act.distanceMeters || 0), 0);
  };

  // Data diagnostics calculations
  const activitiesWithGearIdCount = activities.filter(a => !!a.gearId).length;
  const gearCount = gear.length;
  const retiredGearCount = gear.filter(g => g.retired).length;
  const gearWithoutMileageCount = gear.filter(g => getGearDistanceMeters(g) === 0).length;
  const manualGearCount = gear.filter(g => g.source === 'manual').length;
  const stravaGearCount = gear.filter(g => g.source === 'strava').length;

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Querying Active Gear Shed...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-4 sm:p-8">
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
              <h1 className="text-lg font-bold uppercase tracking-wide text-white leading-none">Gear Tracker</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Monitor accumulated mechanical workloads on footwear components and gear elements
            </p>
          </div>
        </div>

        {/* DATA DIAGNOSTICS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Total Gear Count</span>
            <span className="text-xl font-bold text-white font-mono mt-1 block">{gearCount} Units</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Activities with Gear</span>
            <span className="text-xl font-bold text-white font-mono mt-1 block">{activitiesWithGearIdCount} Logs</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Zero Mileage Shoes</span>
            <span className="text-xl font-bold text-yellow-500 font-mono mt-1 block">{gearWithoutMileageCount} Items</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Retired Gear Count</span>
            <span className="text-xl font-bold text-zinc-400 font-mono mt-1 block">{retiredGearCount} Items</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Manual Gear Count</span>
            <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">{manualGearCount} Items</span>
          </div>
          <div className="bg-[#111113] border border-white/10 p-4 rounded-lg">
            <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider">Strava Gear Syncs</span>
            <span className="text-xl font-bold text-[#FC5200] font-mono mt-1 block">{stravaGearCount} items</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* EDIT AND ADD SECTION (LEFT COL / FORM) */}
          <div className="space-y-6">

            {editingGear ? (
              /* EDIT FORM */
              <form onSubmit={handleSaveEdit} className="bg-[#111113] border border-[#FC5200]/30 rounded-lg p-6 space-y-4 h-fit">
                <div>
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase font-mono">EDIT COMPONENT</span>
                  <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Configure Gear Item</h2>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <span className="text-zinc-400 uppercase font-bold block">Gear Name</span>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-zinc-400 uppercase font-bold block">Brand</span>
                      <input
                        type="text"
                        value={editBrand}
                        onChange={(e) => setEditBrand(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-400 uppercase font-bold block">Model</span>
                      <input
                        type="text"
                        value={editModel}
                        onChange={(e) => setEditModel(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded"
                      />
                    </div>
                  </div>

                  {editingGear.source === 'manual' && (
                    <div className="space-y-1">
                      <span className="text-zinc-400 uppercase font-bold block">Manual Base Distance ({isMetric ? 'km' : 'mi'})</span>
                      <input
                        type="number"
                        step="any"
                        value={editManualDistance}
                        onChange={(e) => setEditManualDistance(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded font-mono text-center"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-zinc-400 uppercase font-bold block">Fatigue Threshold ({isMetric ? 'km' : 'mi'})</span>
                    <input
                      type="number"
                      required
                      value={editThreshold}
                      onChange={(e) => setEditThreshold(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-400 uppercase font-bold block">Notes / Description</span>
                    <textarea
                      value={editNotes}
                      rows={2}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="editRetired"
                      checked={editRetired}
                      onChange={(e) => setEditRetired(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-[#FC5200]"
                    />
                    <label htmlFor="editRetired" className="text-zinc-300 uppercase font-bold cursor-pointer select-none">
                      Mark This Gear As Retired
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingGear(null)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2.5 rounded uppercase tracking-wider cursor-pointer font-mono"
                    >
                      Cancel Edit
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800 text-black font-extrabold text-xs py-2.5 rounded uppercase tracking-wider cursor-pointer font-mono"
                    >
                      {saving ? 'SAVING...' : 'UPDATE ITEM'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* ADD NEW FORM */
              <form onSubmit={handleAddGear} className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 h-fit">
                <div>
                  <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase font-mono">REGISTRY SETUP</span>
                  <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Register Footwear / Component</h2>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <span className="text-zinc-400 uppercase font-bold block">Gear Item Name</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vaporfly Next% 3"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-transparent border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-zinc-400 uppercase font-bold block">Brand</span>
                      <input
                        type="text"
                        placeholder="e.g. Nike"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full bg-transparent border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-400 uppercase font-bold block">ModelName / Accent</span>
                      <input
                        type="text"
                        placeholder="e.g. Neon Pink"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-transparent border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-400 uppercase font-bold block">Equipment Type</span>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded cursor-pointer"
                    >
                      <option value="shoes">Shoes / Footwear</option>
                      <option value="bike">Bike / Frame</option>
                      <option value="other">Other Components</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-zinc-400 uppercase font-bold block">Base Mil ({isMetric ? 'km' : 'mi'})</span>
                      <input
                        type="number"
                        value={startingKm}
                        onChange={(e) => setStartingKm(e.target.value)}
                        className="w-full bg-transparent border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-center text-zinc-200 rounded font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-zinc-400 uppercase font-bold block">Threshold ({isMetric ? 'km' : 'mi'})</span>
                      <input
                        type="number"
                        value={thresholdKm}
                        onChange={(e) => setThresholdKm(e.target.value)}
                        className="w-full bg-transparent border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-center text-zinc-200 rounded font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-zinc-400 uppercase font-bold block">Item Description / Notes</span>
                    <textarea
                      placeholder="Specify size or structural notes about the physical condition of this product"
                      value={notes}
                      rows={2}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-transparent border border-white/10 p-2.5 outline-none focus:border-[#FC5200] text-zinc-200 rounded resize-none"
                    />
                  </div>

                  {saveSuccess && (
                    <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 text-center text-emerald-400 text-xs rounded uppercase font-bold flex items-center justify-center gap-1.5 font-mono">
                      <Check className="w-4 h-4" /> COMPONENT LOGGED IN SHED
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#FC5200] hover:bg-[#e44a00] disabled:bg-zinc-800 text-black font-extrabold text-xs py-2.5 rounded uppercase tracking-wider cursor-pointer font-mono"
                  >
                    {saving ? 'DEPOSITING...' : 'REGISTER GEAR SHORE'}
                  </button>
                </div>
              </form>
            )}

            {/* SYNC DISCLOSURE BANNER */}
            <div className="bg-[#111113]/40 border border-white/10 p-4 rounded-lg flex gap-3 text-xs leading-relaxed text-zinc-400">
              <AlertCircle className="w-5 h-5 text-[#FC5200] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-300 uppercase tracking-widest font-mono text-[10px]">Real Synchronizations Only</p>
                <p className="mt-1">
                  Track.Studio integrates with connected Strava activities to calculate absolute shoe distances deterministically. Mileage claims represent pure factual sync transactions.
                </p>
              </div>
            </div>

          </div>

          {/* TOTAL ACTIVE GEAR SHELF (RIGHT 2 COLS) */}
          <div className="lg:col-span-2 bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
            <div>
              <span className="text-xs text-[#FC5200] font-semibold tracking-wider uppercase font-mono">ACTIVE SHED</span>
              <h2 className="font-sans text-base font-semibold text-white tracking-wide mt-1">Equipment Integrity Shelf</h2>
            </div>

            {gear.length > 0 ? (
              <div className="space-y-4">
                {gear.map((g) => {
                  const currentMeters = getGearDistanceMeters(g);
                  const currentKm = currentMeters / 1000;
                  const threshold = g.replacementThresholdKm || 800;
                  
                  // Wear progress
                  const pct = Math.min(100, Math.round((currentKm / threshold) * 100));

                  // Format displays
                  const displayDistance = isMetric ? `${currentKm.toFixed(1)} km` : `${(currentKm * 0.621371).toFixed(1)} mi`;
                  const displayThreshold = isMetric ? `${threshold} km` : `${Math.round(threshold * 0.621371)} mi`;

                  // Calculate Status
                  let statusLabel = 'Active';
                  let statusColor = 'text-green-400 bg-green-950/30 border-green-900/45';
                  if (g.retired) {
                    statusLabel = 'Retired';
                    statusColor = 'text-zinc-400 bg-zinc-800/40 border-zinc-700/50';
                  } else if (pct >= 90) {
                    statusLabel = 'Replace Soon';
                    statusColor = 'text-red-400 bg-red-950/30 border-red-900/45';
                  } else if (pct >= 75) {
                    statusLabel = 'Near Replacement';
                    statusColor = 'text-yellow-400 bg-yellow-950/30 border-yellow-900/45';
                  }

                  return (
                    <div key={g.id} className="border border-white/10 hover:border-white/20 bg-zinc-950/40 p-5 rounded-lg space-y-4 relative transition">
                      
                      {/* ACTION CONTROLS */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(g)}
                          className="p-1 text-zinc-450 hover:text-white rounded transition-colors cursor-pointer"
                          title="Modify gear constraints"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGear(g.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Discard gear record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* INFO WRAP */}
                      <div className="space-y-1 pr-14">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Sourcing Badge */}
                          {g.source === 'strava' ? (
                            <span className="text-[9px] font-extrabold uppercase font-mono tracking-widest bg-[#FC5200]/10 border border-[#FC5200]/30 text-[#FC5200] px-1.5 py-0.5 rounded leading-none">
                              Strava Sync
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold uppercase font-mono tracking-widest bg-cyan-950 border border-cyan-800 text-cyan-450 px-1.5 py-0.5 rounded leading-none">
                              Manual
                            </span>
                          )}

                          {/* Status rating pill */}
                          <span className={`text-[9px] font-extrabold uppercase font-mono tracking-widest border px-1.5 py-0.5 rounded leading-none ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="pt-1 select-none">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                            {g.brand || 'Custom'} {g.model || ''}
                          </span>
                          <h3 className="text-sm font-bold text-white uppercase">{g.name}</h3>
                        </div>

                        {g.notes && (
                          <p className="text-[11px] text-zinc-400 font-sans italic leading-tight pt-1">
                            “{g.notes}”
                          </p>
                        )}
                      </div>

                      {/* PROGRESS BAR BAR */}
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between items-end uppercase">
                          <span className="text-zinc-500 text-[10px] font-bold">ACCUMULATED RECORDED DISTANCE:</span>
                          <span className="font-extrabold text-white text-[11px]">{displayDistance} / {displayThreshold} limit</span>
                        </div>

                        <div className="w-full h-1.5 bg-zinc-900 border border-white/5 rounded overflow-hidden">
                          <div 
                            className={`h-full rounded transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-[#FC5200]'}`} 
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase pt-0.5">
                          <span>
                            {g.retiredAt ? `Retired on: ${g.retiredAt.substring(0, 10)}` : 'Component Fatigue Index:'}
                          </span>
                          <span className="text-zinc-400 font-extrabold">
                            {pct}% fatigue
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 border-white/10 rounded-lg flex flex-col items-center justify-center p-4">
                <SyncRequiredState requirementId="STRAVA_ACTIVITY_SYNC_REQUIRED" customDescription="Gear data is not available. Add shoes manually or sync activities with gear information." />
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
