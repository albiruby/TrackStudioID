'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Heart, 
  RefreshCw, 
  Database,
  Activity
} from 'lucide-react';
import { getWellnessLogs } from '../../lib/firebase/firestore';
import { DailyWellnessLog } from '../../data/types';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area
} from 'recharts';

export default function HrvLabPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [wellnessLogs, setWellnessLogs] = useState<DailyWellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const data = await getWellnessLogs(user.uid);
        // sort descending for finding latest, ascending for chart
        setWellnessLogs(data.sort((a, b) => b.date.localeCompare(a.date)));
      } catch (e) {
        console.error('Failed to load wellness logs for hrv lab:', e);
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

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <span className="text-xs uppercase tracking-wider font-bold">Loading HRV Data...</span>
      </div>
    );
  }

  const sortedLogsAsc = [...wellnessLogs].sort((a, b) => a.date.localeCompare(b.date));
  const rawLogs = sortedLogsAsc.filter(w => w.hrvRmssd !== undefined && w.hrvRmssd !== null);

  const missingData = rawLogs.length === 0;
  
  const latestHrvLog = [...rawLogs].reverse()[0];

  // 7-day and 28-day average
  let sevenDayAvg = 0;
  let twentyEightDayAvg = 0;
  let sdnnAvg = 0;

  if (rawLogs.length > 0) {
    const last7 = rawLogs.slice(-7);
    const last28 = rawLogs.slice(-28);
    sevenDayAvg = Math.round(last7.reduce((sum, curr) => sum + (curr.hrvRmssd || 0), 0) / last7.length);
    twentyEightDayAvg = Math.round(last28.reduce((sum, curr) => sum + (curr.hrvRmssd || 0), 0) / last28.length);
  }

  // Calculate standard deviation for 28 day average to form a "normal range corridor"
  let normalRangeLow = 0;
  let normalRangeHigh = 0;
  if (rawLogs.length > 0) {
    const last28 = rawLogs.slice(-28);
    const sumSq = last28.reduce((sum, curr) => sum + Math.pow((curr.hrvRmssd || 0) - twentyEightDayAvg, 2), 0);
    const variance = sumSq / last28.length;
    const stdDev = Math.sqrt(variance);
    normalRangeLow = Math.max(0, Math.round(twentyEightDayAvg - (stdDev * 0.75)));
    normalRangeHigh = Math.round(twentyEightDayAvg + (stdDev * 0.75));
  }

  // Chart data
  const chartData = rawLogs.map(log => ({
    date: log.date,
    shortDate: new Date(log.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
    rmssd: log.hrvRmssd,
    normalLow: normalRangeLow,
    normalHigh: normalRangeHigh,
    sevenDayAvg: sevenDayAvg // using static values for the corridor based on current baseline
  }));

  const latestDate = latestHrvLog ? latestHrvLog.date : '—';
  
  // Calculate missing days
  let missingDaysCount = 0;
  if (rawLogs.length > 1) {
    const firstDate = new Date(rawLogs[0].date);
    const lastDate = new Date(rawLogs[rawLogs.length - 1].date);
    const totalDays = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24)) + 1;
    missingDaysCount = totalDays - rawLogs.length;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col p-6 sm:p-8 font-sans">
      <div className="max-w-[1400px] w-full mx-auto space-y-8">

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
              <Heart className="w-5 h-5 text-[#FC5200]" />
              <h1 className="text-xl font-bold uppercase tracking-wide text-white leading-none font-mono">HRV Lab</h1>
            </div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1.5 font-bold">
              Heart Rate Variability analysis and baseline trends
            </p>
          </div>
        </div>

        {missingData ? (
          <div className="bg-[#111113] border border-white/10 rounded-lg p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-zinc-800/50 border border-white/10 flex items-center justify-center rounded mx-auto mb-6">
              <Database className="w-6 h-6 text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-white tracking-wide">Data Unavailable</h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto font-medium">
              HRV data is not available. Sync Intervals.icu wellness data.
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="mt-6 px-6 py-2.5 bg-[#FC5200] hover:bg-[#e44a00] text-black text-xs font-bold uppercase rounded transition-colors inline-block"
            >
              Go to Settings
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* 1. Today's HRV */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
              <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-6">Latest HRV Metrics</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">RMSSD</span>
                  <div className="font-mono text-3xl font-bold text-white mt-1">
                    {latestHrvLog?.hrvRmssd ? Math.round(latestHrvLog.hrvRmssd) : '—'} <span className="text-sm text-zinc-500 ml-1">ms</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">SDNN</span>
                  <div className="font-mono text-3xl font-bold text-zinc-300 mt-1">
                    {latestHrvLog?.hrvSdnn ? Math.round(latestHrvLog.hrvSdnn) : '—'} <span className="text-sm text-zinc-500 ml-1">ms</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">Resting HR</span>
                  <div className="font-mono text-3xl font-bold text-[#FC5200] mt-1">
                    {latestHrvLog?.restingHeartRate ? Math.round(latestHrvLog.restingHeartRate) : '—'} <span className="text-sm text-zinc-500 ml-1">bpm</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">Date</span>
                  <div className="font-mono text-[20px] font-bold text-white mt-2">
                    {latestHrvLog?.date}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase mt-1 block">
                    Source: {latestHrvLog?.source === 'manual' ? 'Manual' : 'Intervals.icu'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Baseline Trend */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Baseline Trend</h2>
                <div className="flex gap-6 max-w-full overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">7-Day Avg</span>
                    <span className="font-mono text-lg font-bold text-white block mt-0.5">{sevenDayAvg} ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">28-Day Avg</span>
                    <span className="font-mono text-lg font-bold text-white block mt-0.5">{twentyEightDayAvg} ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase block">Normal Range</span>
                    <span className="font-mono text-lg font-bold text-zinc-400 block mt-0.5">{normalRangeLow} - {normalRangeHigh} ms</span>
                  </div>
                </div>
              </div>

              {chartData.length > 2 ? (
                <div className="h-64 md:h-80 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis 
                        dataKey="shortDate" 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: '12px' }}
                        itemStyle={{ color: '#e4e4e7', fontWeight: 600 }}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="normalHigh" 
                        stroke="none" 
                        fill="#3f3f46" 
                        fillOpacity={0.1} 
                        activeDot={false}
                        legendType="none"
                        tooltipType="none"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="normalLow" 
                        stroke="none" 
                        fill="#111113" 
                        fillOpacity={1} 
                        activeDot={false}
                        legendType="none"
                        tooltipType="none"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rmssd" 
                        name="RMSSD"
                        stroke="#FC5200" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#111113', stroke: '#FC5200', strokeWidth: 2 }} 
                        activeDot={{ r: 5, fill: '#FC5200', stroke: '#111113' }} 
                      />
                      <Line 
                        type="stepAfter" 
                        dataKey="twentyEightDayAvg" 
                        name="Baseline (28d)"
                        stroke="#71717a" 
                        strokeWidth={1} 
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 border border-dashed border-white/10 rounded flex items-center justify-center text-zinc-500 text-sm">
                  Insufficient data points for baseline visualization.
                </div>
              )}
            </div>

            {/* 3. HRV Data Health & Summary */}
            <div className="bg-[#111113] border border-white/10 rounded-xl p-6 md:p-8">
               <h2 className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-6">HRV Data Health</h2>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <div>
                   <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">Total Records</span>
                   <span className="font-mono text-xl font-bold text-white block mt-1">{rawLogs.length}</span>
                 </div>
                 <div>
                   <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">Missing Days</span>
                   <span className="font-mono text-xl font-bold text-zinc-300 block mt-1">{missingDaysCount}</span>
                 </div>
                 <div>
                   <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">Latest Log Date</span>
                   <span className="font-mono text-xl font-bold text-white block mt-1">{latestDate}</span>
                 </div>
                 <div>
                   <span className="text-[11px] text-zinc-400 font-semibold tracking-wider uppercase block">Sync Status</span>
                   <span className="font-mono text-sm font-bold text-green-400 px-2 py-1 bg-green-400/10 rounded block mt-1 w-fit border border-green-400/20">Active</span>
                 </div>
               </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

