'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Settings, 
  RefreshCw, 
  Database,
  Calendar,
  Filter,
  Download,
  Share2,
  FileImage,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Award,
  Clock,
  Navigation,
  Activity,
  ChevronRight,
  Heart
} from 'lucide-react';
import { getActivities, getAthleteProfile, saveReportSummary } from '../../lib/firebase/firestore';
import { CanonicalActivity } from '../../data/types';
import { aggregateActivities, ReportAggregationResult } from '../../lib/analytics/reportAggregation';
import { formatDistanceKm, formatDuration } from '../../lib/data/dataLaw';
import { mapReportToPayload } from '../../lib/export/exportPayload';
import ExportCardStudio from '../../components/export/ExportCardStudio';

// Import Recharts components directly (handled correctly on client)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

type ReportType = 'monthly' | 'annual' | 'custom';

const COLORS = ['#FC5200', '#10B981', '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B', '#3B82F6'];

export default function ReportsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [athleteProfile, setAthleteProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States for report specifications / settings
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [sportFilter, setSportFilter] = useState<string>('all');
  
  // Dynamic pickers derived from real data
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // format "yyyy-mm"
  const [selectedYear, setSelectedYear] = useState<string>('');  // format "yyyy"
  const [customStart, setCustomStart] = useState<string>('');    // format "yyyy-mm-dd"
  const [customEnd, setCustomEnd] = useState<string>('');      // format "yyyy-mm-dd"

  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);

  // Load activities of connected user
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [actData, profile] = await Promise.all([
          getActivities(user.uid),
          getAthleteProfile(user.uid)
        ]);
        const loadedActivities = actData || [];
        setActivities(loadedActivities);
        setAthleteProfile(profile || null);

        // Intelligently prepopulate default selectors using actual data dates if possible
        if (loadedActivities.length > 0) {
          // Sort chronologically
          const sorted = [...loadedActivities]
            .filter(a => !!a.startDate)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
          
          if (sorted.length > 0) {
            const freshestDateStr = sorted[0].startDate.slice(0, 10); // "yyyy-mm-dd"
            const freshestMonth = sorted[0].startDate.slice(0, 7);    // "yyyy-mm"
            const freshestYear = sorted[0].startDate.slice(0, 4);     // "yyyy"
            
            setSelectedMonth(freshestMonth);
            setSelectedYear(freshestYear);

            // Default custom span to last 30 days of freshest entry
            const endDate = new Date(freshestDateStr);
            const startDate = new Date(freshestDateStr);
            startDate.setDate(endDate.getDate() - 30);

            setCustomStart(startDate.toISOString().slice(0, 10));
            setCustomEnd(freshestDateStr);
          }
        } else {
          // Fallback to current year/month
          const nowStr = new Date().toISOString();
          setSelectedMonth(nowStr.slice(0, 7));
          setSelectedYear(nowStr.slice(0, 4));
          setCustomStart(nowStr.slice(0, 10));
          setCustomEnd(nowStr.slice(0, 10));
        }
      } catch (e) {
        console.error('Failed to aggregate activities metrics:', e);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        loadData();
      }
    }
  }, [user, authLoading, router]);

  // Derive preferred user metrics unit (Metric vs Imperial)
  const isMetric = athleteProfile?.preferredUnits !== 'imperial';

  // Dynamic lists of years and months actually registered in activities to populated selectors cleanly
  const { uniqueMonths, uniqueYears } = useMemo(() => {
    const monthsSet = new Set<string>();
    const yearsSet = new Set<string>();
    activities.forEach(a => {
      if (a.startDate) {
        monthsSet.add(a.startDate.slice(0, 7));
        yearsSet.add(a.startDate.slice(0, 4));
      }
    });
    return {
      uniqueMonths: Array.from(monthsSet).sort().reverse(),
      uniqueYears: Array.from(yearsSet).sort().reverse()
    };
  }, [activities]);

  // Compute calculated start and end periods based on selected parameters
  const [periodStart, periodEnd] = useMemo(() => {
    if (reportType === 'monthly') {
      if (!selectedMonth) return ['', ''];
      const [y, m] = selectedMonth.split('-');
      const start = `${y}-${m}-01`;
      // determine end of that month
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const end = `${y}-${m}-${lastDay}`;
      return [start, end];
    } else if (reportType === 'annual') {
      if (!selectedYear) return ['', ''];
      return [`${selectedYear}-01-01`, `${selectedYear}-12-31`];
    } else {
      return [customStart, customEnd];
    }
  }, [reportType, selectedMonth, selectedYear, customStart, customEnd]);

  // Trigger aggregation calculation purely from real activities
  const reportData = useMemo<ReportAggregationResult | null>(() => {
    if (!periodStart || !periodEnd || activities.length === 0) return null;
    return aggregateActivities(activities, periodStart, periodEnd, sportFilter);
  }, [activities, periodStart, periodEnd, sportFilter]);

  const periodTitle = useMemo(() => {
    if (reportType === 'monthly' && selectedMonth) {
      try {
        return new Date(`${selectedMonth}-01`).toLocaleString('en-US', {
          month: 'long',
          year: 'numeric'
        }).toUpperCase();
      } catch {
        return `${selectedMonth.toUpperCase()} REPORT`;
      }
    } else if (reportType === 'annual' && selectedYear) {
      return `${selectedYear} TRAINING YEAR`;
    }
    return 'AGGREGATED REPORT';
  }, [reportType, selectedMonth, selectedYear]);

  const periodSubtitle = useMemo(() => {
    const sportPart = sportFilter === 'all' ? 'ALL EXERCISES' : `${sportFilter.toUpperCase()} SESSIONS`;
    return `${sportPart} • ${periodStart} TO ${periodEnd}`;
  }, [periodStart, periodEnd, sportFilter]);

  const reportPayload = useMemo(() => {
    if (!reportData) return null;
    return mapReportToPayload(
      reportData,
      periodTitle,
      periodSubtitle,
      athleteProfile?.displayName || 'Athlete'
    );
  }, [reportData, periodTitle, periodSubtitle, athleteProfile]);

  // Find longest/highest activity objects safely
  const longestActivity = useMemo(() => {
    if (!reportData?.longestActivityId) return null;
    return activities.find(a => a.id === reportData.longestActivityId) || null;
  }, [activities, reportData]);

  const highestElevationActivity = useMemo(() => {
    if (!reportData?.highestElevationActivityId) return null;
    return activities.find(a => a.id === reportData.highestElevationActivityId) || null;
  }, [activities, reportData]);

  // Local helper formatters utilizing user settings
  const renderDistance = (meters: number) => {
    if (isMetric) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${(meters / 1609.344).toFixed(2)} mi`;
  };

  const renderElevation = (meters: number) => {
    if (isMetric) {
      return `${Math.round(meters)} m`;
    }
    return `${Math.round(meters * 3.28084)} ft`;
  };

  const renderPace = (secondsPerKm: number) => {
    if (!secondsPerKm || isNaN(secondsPerKm) || secondsPerKm === Infinity) return '--:--';
    const paceSec = isMetric ? secondsPerKm : secondsPerKm * 1.609344;
    const mins = Math.floor(paceSec / 60);
    const secs = Math.round(paceSec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /${isMetric ? 'km' : 'mi'}`;
  };

  // CSV Data Sync Downloader
  const handleExportCsv = () => {
    if (!reportData || activities.length === 0) return;

    // Filter relevant activities aligned with current date range and sports filters
    const filtered = activities.filter(a => {
      if (!a.startDate) return false;
      const dStr = a.startDate.slice(0, 10);
      return dStr >= periodStart && dStr <= periodEnd && (sportFilter === 'all' || a.sportType?.toLowerCase() === sportFilter.toLowerCase() || (sportFilter === 'run' && a.sportType?.toLowerCase() === 'trailrun'));
    });

    if (filtered.length === 0) {
      setExportFeedback('No records in this span to export.');
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }

    const headers = [
      'Activity ID', 'Name', 'Sport Type', 'Date', 'Distance (m)', 
      'Duration (s)', 'Pace (s/km)', 'Average HR (bpm)', 'Elevation Gain (m)'
    ];

    const rows = filtered.map(a => [
      a.id,
      `"${a.name.replace(/"/g, '""')}"`,
      a.sportType || 'Activity',
      a.startDate || '',
      a.distanceMeters ?? 0,
      a.movingTimeSeconds ?? a.elapsedTimeSeconds ?? 0,
      a.averagePaceSecPerKm ?? '',
      a.averageHeartRate ?? '',
      a.elevationGainMeters ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `TrackStudio_Report_${reportType}_${sportFilter}_${periodStart}_to_${periodEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Provide feedback trigger
    setExportFeedback('Export completed!');
    setTimeout(() => setExportFeedback(null), 3000);
  };

  const handleShareReport = () => {
    if (!reportData) return;
    const shareText = `Track.Studio Performance Summary (${periodStart} to ${periodEnd}): Total Distance ${renderDistance(reportData.totalDistanceMeters)}, Active Days ${reportData.activeDays}, Workouts Logged ${reportData.totalActivities}. Calculated purely from real fitness records!`;
    
    try {
      navigator.clipboard.writeText(shareText);
      setShareFeedback('Report summary copied to clipboard! (Markdown format)');
      setTimeout(() => setShareFeedback(null), 3000);
    } catch (e) {
      setShareFeedback('Could not copy report link.');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleSaveReportToCloud = async () => {
    if (!reportData || !user) return;
    try {
      const reportId = `${reportType}_${periodStart}_${periodEnd}_${sportFilter}`.replace(/[^a-zA-Z0-9_\-]/g, '');
      await saveReportSummary(user.uid, reportId, reportData);
      setExportFeedback('Report summary cached securely to cloud database.');
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (e) {
      setExportFeedback('Failed to cache report to cloud.');
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  const handleExportCard = () => {
    setIsExportStudioOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold font-mono">Loading Reports metrics...</span>
      </div>
    );
  }

  // Check if there are warnings
  const dataHealthInfo = reportData?.dataHealth;
  const hasWarnings = dataHealthInfo && dataHealthInfo.warningsList.length > 0;

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col p-6 sm:p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111113] p-6 border border-white/10 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-zinc-800/50 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-xl font-bold uppercase tracking-wide text-white leading-none font-mono">Reports</h1>
              </div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
                Consolidate real training logs into periodic reports utilizing free Strava API datasets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] bg-[#FC5200]/10 text-[#FC5200] border border-[#FC5200]/20 px-2 py-1 rounded-full font-bold uppercase">
              No AI Hallucinations
            </span>
          </div>
        </div>

        {/* REPORT FILTER CONTROLS BAR */}
        <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5">
            <Filter className="w-4 h-4 text-[#FC5200]" />
            <h3 className="text-xs uppercase font-mono font-bold text-white tracking-wider">Report Generator Specifications</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* 1. Report Type Selection */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Grouping Period</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-2 text-xs text-white uppercase font-mono cursor-pointer"
              >
                <option value="monthly">Monthly Report</option>
                <option value="annual">Annual Report</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* 2. Sport Type Filtering */}
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Sport Activity</label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-2 text-xs text-white uppercase font-mono cursor-pointer"
              >
                <option value="all">All Exercises</option>
                <option value="run">Running & Trails</option>
                <option value="trail run">Trails Only</option>
                <option value="walk">Walking</option>
                <option value="ride">Cycling</option>
              </select>
            </div>

            {/* 3. Dynamic Sub-period Picker */}
            <div className="md:col-span-2">
              {reportType === 'monthly' && (
                <div className="grid grid-cols-1 gap-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Select Month</label>
                  {uniqueMonths.length === 0 ? (
                    <span className="text-xs text-zinc-500 font-mono italic">No workout dates loaded</span>
                  ) : (
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-2 text-xs text-white uppercase font-mono cursor-pointer"
                    >
                      {uniqueMonths.map(m => (
                        <option key={m} value={m}>
                          {new Date(`${m}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {reportType === 'annual' && (
                <div className="grid grid-cols-1 gap-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1.5">Select Year</label>
                  {uniqueYears.length === 0 ? (
                    <span className="text-xs text-zinc-500 font-mono italic">No workout dates loaded</span>
                  ) : (
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-2 text-xs text-white uppercase font-mono cursor-pointer"
                    >
                      {uniqueYears.map(y => (
                        <option key={y} value={y}>{y} Training Year</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {reportType === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-1.5 text-xs text-white uppercase font-mono cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-zinc-800/80 border border-white/10 rounded px-3 py-1.5 text-xs text-white uppercase font-mono cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5 bg-white/[0.01] -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <div className="text-[11px] text-zinc-400 font-mono font-bold uppercase leading-none">
              Filtered Span: <span className="text-white">{periodStart || '??'}</span> to <span className="text-white">{periodEnd || '??'}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleShareReport}
                disabled={!reportData || reportData.totalActivities === 0}
                className="px-3 py-1.5 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-bold uppercase font-mono tracking-wider rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Report</span>
              </button>

              <button
                onClick={handleSaveReportToCloud}
                disabled={!reportData || reportData.totalActivities === 0}
                className="px-3 py-1.5 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-bold uppercase font-mono tracking-wider rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Save to Cloud</span>
              </button>

              <button
                onClick={handleExportCard}
                disabled={!reportData || reportData.totalActivities === 0}
                className="px-3 py-1.5 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-bold uppercase font-mono tracking-wider rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <FileImage className="w-3.5 h-3.5" />
                <span>Export PNG Card</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={!reportData || reportData.totalActivities === 0}
                className="px-3 py-1.5 bg-[#FC5200] hover:bg-[#ff6414] text-white text-xs font-bold uppercase font-mono tracking-wider rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Data CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* ALERTS AND FEEDBACK NOTIFICATIONS */}
        {(shareFeedback || exportFeedback) && (
          <div className="bg-zinc-900 border border-[#FC5200]/30 text-[#FC5200] p-4 rounded-lg flex items-center justify-between text-xs font-mono font-bold uppercase">
            <span>{shareFeedback || exportFeedback}</span>
          </div>
        )}

        {/* MAIN BODY CONTENTS */}
        {reportData && reportData.totalActivities > 0 ? (
          <div className="space-y-6">

            {/* PERFORMANCE METRICS CARDS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Total Distance Card */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider font-mono">Total Distance</span>
                <span className="text-2xl font-black text-white font-mono mt-2 block tracking-tight">
                  {renderDistance(reportData.totalDistanceMeters)}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block mt-1.5">Cumulative mileage summary</span>
              </div>

              {/* Total Active Time Card */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider font-mono">Total Moving Duration</span>
                <span className="text-2xl font-black text-[#FC5200] font-mono mt-2 block tracking-tight">
                  {formatDuration(reportData.totalMovingTimeSeconds)}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block mt-1.5">Active hours metrics</span>
              </div>

              {/* Total Elevation Gain Card */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider font-mono">Total Vert Gain</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-2 block tracking-tight">
                  {renderElevation(reportData.totalElevationGainMeters)}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block mt-1.5">Cumulated altitude climb</span>
              </div>

              {/* Active Days Summary */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider font-mono">Active Consistency</span>
                <span className="text-2xl font-black text-cyan-400 font-mono mt-2 block tracking-tight">
                  {reportData.activeDays} Days
                </span>
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block mt-1.5">
                  Across {reportData.totalActivities} logged runs
                </span>
              </div>

            </div>

            {/* INTERACTIVE DATA CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Chart 1: Volume/Distance over time */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h4 className="text-xs uppercase font-mono font-bold text-white">Periodic Volume Profile</h4>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
                    {reportType === 'monthly' ? 'Weekly Training Volume breakdown (km/mi)' : 'Monthly totals breakdown'}
                  </p>
                </div>

                <div className="h-[260px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    {reportType === 'monthly' ? (
                      <BarChart data={reportData.charts.weeklyVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="week" stroke="#52525b" fontSize={10} fontStyle="mono" />
                        <YAxis stroke="#52525b" fontSize={10} fontStyle="mono" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px' }}
                          labelClassName="text-white text-xs font-mono font-bold uppercase"
                          formatter={(value: any) => [`${value} ${isMetric ? 'km' : 'mi'}`, 'Volume']}
                        />
                        <Bar dataKey="formattedDistance" fill="#FC5200" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    ) : (
                      <BarChart data={reportData.charts.monthlyDistance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="month" stroke="#52525b" fontSize={10} fontStyle="mono" />
                        <YAxis stroke="#52525b" fontSize={10} fontStyle="mono" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px' }}
                          labelClassName="text-white text-xs font-mono font-bold uppercase"
                          formatter={(value: any) => [`${value} ${isMetric ? 'km' : 'mi'}`, 'Distance']}
                        />
                        <Bar dataKey="formattedDistance" fill="#FC5200" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Activity Composition */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h4 className="text-xs uppercase font-mono font-bold text-white">Exercise Distribution</h4>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Exercise frequency sorted by workout categories</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportData.charts.activityComposition}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="count"
                        >
                          {reportData.charts.activityComposition.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px' }}
                          formatter={(value: any, name: any, props: any) => [`${value} workouts (${props.payload.formattedDistance} ${isMetric ? 'km' : 'mi'})`, props.payload.sport]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="space-y-2 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase leading-none font-mono">Composition List</span>
                    <div className="space-y-1.5 font-mono text-xs">
                      {reportData.charts.activityComposition.map((comp, idx) => {
                        const colorCode = COLORS[idx % COLORS.length];
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorCode }} />
                              <span className="text-zinc-300 font-bold">{comp.sport}</span>
                            </div>
                            <span className="text-zinc-500">
                              {comp.count} runs ({comp.formattedDistance} {isMetric ? 'km' : 'mi'})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 3: Elevation Trend */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 space-y-4 lg:col-span-2">
                <div className="border-b border-white/5 pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h4 className="text-xs uppercase font-mono font-bold text-white">Climb Profile (Altitude Metrics)</h4>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Elevation gains trends per recorded workout session</p>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase bg-zinc-900 border border-white/10 px-2 py-0.5 rounded">
                    Metrics unit: {isMetric ? 'Meters' : 'Feet'}
                  </span>
                </div>

                {reportData.charts.elevationTrend.length > 0 ? (
                  <div className="h-[220px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.charts.elevationTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="date" stroke="#52525b" fontSize={9} fontStyle="mono" />
                        <YAxis stroke="#52525b" fontSize={9} fontStyle="mono" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '4px' }}
                          labelClassName="text-white text-xs font-mono font-bold uppercase"
                          formatter={(value: any) => [renderElevation(value), 'Elevation']}
                        />
                        <Area type="monotone" dataKey="elevation" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-500 font-mono uppercase">
                    No explicit elevation data captured across these activities.
                  </div>
                )}
              </div>

            </div>

            {/* PERFORMANCE HIGHLIGHT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Avg Pace Card */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider font-mono">Average Pace Metric</span>
                  <span className="text-2xl font-black text-[#FC5200] font-mono mt-2 block tracking-tight">
                    {renderPace(reportData.averagePaceSecPerKm)}
                  </span>
                </div>
                <div className="border-t border-white/5 pt-3 mt-4 text-[11px] text-zinc-400 font-mono">
                  Calculated from <strong className="text-white">{renderDistance(reportData.totalDistanceMeters)}</strong> in <strong className="text-white">{formatDuration(reportData.totalMovingTimeSeconds)}</strong>
                </div>
              </div>

              {/* Avg Heart Rate Card */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider font-mono">Average Heart Rate</span>
                  <span className="text-2xl font-black text-rose-400 font-mono mt-2 block tracking-tight">
                    {reportData.averageHeartRate ? `${Math.round(reportData.averageHeartRate)} bpm` : '—'}
                  </span>
                </div>
                <div className="border-t border-white/5 pt-3 mt-4 text-[11px] text-zinc-400 font-mono">
                  {reportData.averageHeartRate ? (
                    <span>Averaged across {reportData.dataHealth.hrAvailableCount} HR-enabled activities</span>
                  ) : (
                     <span>No consistent HR datasets detected in this period</span>
                  )}
                </div>
              </div>

              {/* Longest Workout Highlight */}
              <div className="bg-[#111113] border border-white/10 rounded-lg p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider font-mono">Period Peak Mileage (Longest Run)</span>
                  <span className="text-lg font-black text-white font-mono mt-2 block truncate">
                    {longestActivity ? longestActivity.name : 'No Long Run logged'}
                  </span>
                </div>
                <div className="border-t border-white/5 pt-3 mt-4 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                  <span>Distance: <strong className="text-white font-mono">{renderDistance(reportData.longestDistanceMeters)}</strong></span>
                  {longestActivity && (
                    <button
                      onClick={() => router.push(`/activities/${longestActivity.id}`)}
                      className="text-[#FC5200] text-[10px] font-bold uppercase hover:underline font-mono"
                    >
                      View Run
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* INTEGRATED DATA HEALTH PANEL */}
            <div className="bg-[#111113] border border-white/10 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/10 bg-white/[0.01] flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <span className="text-xs uppercase font-mono font-bold text-zinc-400">Report Compilation Readiness Metrics</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Canonical Firestore Sources</span>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-black/40 border border-white/5 p-3 rounded text-center">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">Spanned Workouts</span>
                    <span className="text-base font-bold text-white font-mono mt-1 block">{reportData.totalActivities}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-3 rounded text-center">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">Valid Distance Logs</span>
                    <span className="text-base font-bold text-emerald-400 font-mono mt-1 block">{reportData.dataHealth.validDistanceCount}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-3 rounded text-center">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">HR Streams Active</span>
                    <span className="text-base font-bold text-rose-400 font-mono mt-1 block">{reportData.dataHealth.hrAvailableCount}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-3 rounded text-center">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">Elevation Data Count</span>
                    <span className="text-base font-bold text-cyan-400 font-mono mt-1 block">{reportData.dataHealth.elevationAvailableCount}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-3 rounded text-center">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase block">Excluded Activities</span>
                    <span className="text-base font-bold text-red-500 font-mono mt-1 block">{reportData.dataHealth.excludedCount}</span>
                  </div>
                </div>

                {hasWarnings && (
                  <div className="border border-yellow-950/45 bg-yellow-950/10 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-yellow-500 text-xs font-mono font-bold uppercase">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Workout Log warnings detected during periodic aggregate compile</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400 font-mono">
                      {reportData.dataHealth.warningsList.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-16 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded-full mx-auto animate-pulse">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="max-w-md mx-auto space-y-3">
              <h3 className="text-base font-bold text-white uppercase font-mono">Reports Empty</h3>
              <p className="text-xs text-zinc-400 uppercase leading-relaxed font-mono">
                Please sync workouts containing valid attributes to compile periodic graphs. No simulated values are permitted.
              </p>
            </div>
          </div>
        )}

        {/* EXPORT CARD STUDIO MODAL */}
        {reportPayload && (
          <ExportCardStudio
            payload={reportPayload}
            isOpen={isExportStudioOpen}
            onClose={() => setIsExportStudioOpen(false)}
            preferredUnits={isMetric ? 'metric' : 'imperial'}
          />
        )}

      </div>
    </div>
  );
}
