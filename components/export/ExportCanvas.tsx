'use client';

import React, { useMemo } from 'react';
import { ExportCardPayload } from '../../lib/export/exportPayload';

interface ExportCanvasProps {
  payload: ExportCardPayload;
  templateId: string;
  ratio: '1:1' | '9:16' | '4:3' | '16:9';
  isMetric: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export default function ExportCanvas({
  payload,
  templateId,
  ratio,
  isMetric,
  svgRef
}: ExportCanvasProps) {
  const width = 1080;
  
  const height = useMemo(() => {
    switch (ratio) {
      case '9:16':
        return 1920;
      case '4:3':
        return 810;
      case '16:9':
        return 608;
      case '1:1':
      default:
        return 1080;
    }
  }, [ratio]);

  // Metric calculation helpers
  const displayDistance = useMemo(() => {
    const val = payload.distanceKm;
    if (isMetric) {
      return `${val.toFixed(2)} KM`;
    }
    return `${(val * 0.621371).toFixed(2)} MI`;
  }, [payload.distanceKm, isMetric]);

  const displayPace = useMemo(() => {
    const secondsPerKm = payload.pace;
    if (!secondsPerKm || isNaN(secondsPerKm) || secondsPerKm === Infinity) return '--:--';
    const paceSeconds = isMetric ? secondsPerKm : secondsPerKm * 1.609344;
    const m = Math.floor(paceSeconds / 60);
    const s = Math.round(paceSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')} /${isMetric ? 'KM' : 'MI'}`;
  }, [payload.pace, isMetric]);

  const displayElevation = useMemo(() => {
    if (payload.elevationMeters === undefined || payload.elevationMeters === null) return '—';
    const meters = payload.elevationMeters;
    if (isMetric) {
      return `${Math.round(meters)} M`;
    }
    return `${Math.round(meters * 3.28084)} FT`;
  }, [payload.elevationMeters, isMetric]);

  const displayDuration = useMemo(() => {
    const secs = payload.duration;
    if (secs === undefined || secs === null || isNaN(secs)) return '—';
    if (secs <= 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.round(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [payload.duration]);

  // Render barcode generator SVG styling for consumer templates
  const renderBarcodeLines = (xStart: number, yStart: number, w: number, h: number) => {
    // Generate a beautiful, pseudo barcode using alternating thin/thick SVGs
    const lines: React.ReactNode[] = [];
    let currentX = xStart;
    const patterns = [2, 4, 1, 6, 2, 8, 3, 2, 5, 1, 7, 2, 9, 3, 4, 2, 1, 6, 3, 5, 2, 8];
    let i = 0;
    while (currentX < xStart + w && i < 120) {
      const widthOfLine = patterns[i % patterns.length];
      lines.push(
        <rect
          key={i}
          x={currentX}
          y={yStart}
          width={widthOfLine}
          height={h}
          fill="currentColor"
        />
      );
      currentX += widthOfLine + 3;
      i++;
    }
    return <g className="opacity-90">{lines}</g>;
  };

  // Setup specific design renders
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{
        backgroundColor: '#111113', // default backplane
        maxWidth: '100%',
        aspectRatio: `${width} / ${height}`
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Import Inter, Space Grotesk and beautiful Serif Google fonts inside SVG definitions */}
      <defs>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700;800&family=Space+Grotesk:wght@500;700&display=swap');
            
            .font-sans { font-family: 'Inter', -apple-system, sans-serif; }
            .font-serif { font-family: 'Instrument Serif', Georgia, serif; }
            .font-mono { font-family: 'JetBrains Mono', monospace; }
            .font-display { font-family: 'Space Grotesk', sans-serif; }
          `}
        </style>
      </defs>

      {/* ==================== 1. MINIMAL PERFORMANCE CARD ==================== */}
      {templateId === 'minimal-performance' && (
        <g>
          {/* Base canvas background (rich charcoal/dark carbon) */}
          <rect width={width} height={height} fill="#111113" />
          
          {/* Outer elegant bordering margins */}
          <rect x="40" y="40" width={width - 80} height={height - 80} fill="none" stroke="#222226" strokeWidth="2" />

          {/* Subtitle / Header info */}
          <text x="80" y="110" className="font-mono" fontSize="18" fontWeight="700" fill="#FC5200" letterSpacing="3">
            {payload.type === 'report' ? 'WORKOUT CONSOLIDATED REPORT' : 'TRACK.STUDIO ACTIVITY ANALYSIS'}
          </text>
          
          <text x="80" y="150" className="font-display" fontSize="26" fontWeight="700" fill="#ffffff" letterSpacing="0.5">
            {payload.title}
          </text>

          {/* Large dominant distance stat */}
          <g transform={`translate(80, ${height / 2 - 30})`}>
            <text x="0" y="0" className="font-sans" fontSize={ratio === '16:9' ? '120' : '150'} fontWeight="900" fill="#ffffff" letterSpacing="-4">
              {displayDistance}
            </text>
            <text x="0" y="50" className="font-mono" fontSize="14" fontWeight="700" fill="#71717a" letterSpacing="4">
              {payload.type === 'report' ? 'AGGREGATE PERIODIC VOLUME' : 'TOTAL TRACKED DISTANCE'}
            </text>
          </g>

          {/* Grid of details aligned neat */}
          <g transform={`translate(80, ${height - 240})`}>
            {/* Divider line */}
            <line x1="0" y1="-40" x2={width - 160} y2="-40" stroke="#222226" strokeWidth="2" />

            {/* Stat Row 1 */}
            <g transform="translate(0, 0)">
              <text x="0" y="0" className="font-mono" fontSize="13" fill="#71717a" letterSpacing="2">DURATION</text>
              <text x="0" y="38" className="font-display" fontSize="28" fontWeight="700" fill="#ffffff">{displayDuration}</text>
            </g>

            <g transform="translate(240, 0)">
              <text x="0" y="0" className="font-mono" fontSize="13" fill="#71717a" letterSpacing="2">AVERAGE PACE</text>
              <text x="0" y="38" className="font-display" fontSize="28" fontWeight="700" fill="#FC5200">{displayPace}</text>
            </g>

            {payload.elevationMeters !== undefined && (
              <g transform="translate(480, 0)">
                <text x="0" y="0" className="font-mono" fontSize="13" fill="#71717a" letterSpacing="2">ELEV GAIN</text>
                <text x="0" y="38" className="font-display" fontSize="28" fontWeight="700" fill="#10B981">{displayElevation}</text>
              </g>
            )}

            {payload.averageHeartRate !== undefined && payload.averageHeartRate !== null && (
              <g transform="translate(720, 0)">
                <text x="0" y="0" className="font-mono" fontSize="13" fill="#71717a" letterSpacing="2">HEART RATE</text>
                <text x="0" y="38" className="font-display" fontSize="28" fontWeight="700" fill="#EF4444">{Math.round(payload.averageHeartRate)} BPM</text>
              </g>
            )}

            {/* If report, count of activities */}
            {payload.type === 'report' && payload.activityCount !== undefined && (
              <g transform="translate(720, 0)">
                <text x="0" y="0" className="font-mono" fontSize="13" fill="#71717a" letterSpacing="2">WORKOUTS</text>
                <text x="0" y="38" className="font-display" fontSize="28" fontWeight="700" fill="#3B82F6">{payload.activityCount} SESSIONS</text>
              </g>
            )}
          </g>

          {/* Footer branding */}
          <text x="80" y={height - 70} className="font-mono" fontSize="12" fontWeight="700" fill="#52525b" letterSpacing="5">
            ATHLETE: {payload.athleteName.toUpperCase()} / SYNC: {payload.source.toUpperCase()}
          </text>
        </g>
      )}

      {/* ==================== 2. EDITORIAL SUMMARY ==================== */}
      {templateId === 'editorial-summary' && (
        <g>
          {/* Base canvas background (Warm magazine premium beige cream) */}
          <rect width={width} height={height} fill="#F4F1EA" />
          
          <rect x="40" y="40" width={width - 80} height={height - 80} fill="none" stroke="#2D2A26" strokeWidth="1" />
          <rect x="50" y="50" width={width - 100} height={height - 100} fill="none" stroke="#2D2A26" strokeWidth="1" />

          {/* Header branding */}
          <g transform="translate(100, 120)">
            <text x="0" y="0" className="font-mono" fontSize="13" fontWeight="700" fill="#2D2A26" letterSpacing="4">
              THE RUNNING JOURNAL / COMPILATION
            </text>
            <text x="0" y="25" className="font-mono" fontSize="10" fill="#8C847A" letterSpacing="2">
              VOL. IV • ISSUE XII • {payload.date.toUpperCase()}
            </text>
            <line x1="0" y1="45" x2={width - 200} y2="45" stroke="#2D2A26" strokeWidth="1.5" />
          </g>

          {/* Stately Editorial Heading */}
          <g transform="translate(100, 240)">
            <text x="0" y="0" className="font-serif" fontSize="56" fontWeight="500" fontStyle="italic" fill="#1E1C1A">
              {payload.title}
            </text>
            <text x="0" y="40" className="font-sans" fontSize="14" fontWeight="700" fill="#5A534C" letterSpacing="2">
              {payload.subtitle.toUpperCase()}
            </text>
          </g>

          {/* Dominant Editorial metrics bento */}
          <g transform={`translate(100, ${ratio === '16:9' ? 380 : 440})`}>
            {/* 1. Distance column */}
            <g transform="translate(0, 0)">
              <text x="0" y="0" className="font-serif" fontSize="24" fontStyle="italic" fill="#8C847A">Total Distance</text>
              <text x="0" y="80" className="font-sans" fontSize="72" fontWeight="900" fill="#1E1C1A" letterSpacing="-2">
                {displayDistance.split(' ')[0]}
              </text>
              <text x="140" y="80" className="font-mono" fontSize="14" fontWeight="700" fill="#1E1C1A">
                {displayDistance.split(' ')[1]}
              </text>
            </g>

            {/* 2. Duration column */}
            <g transform={`translate(${ratio === '16:9' ? 240 : 280}, 0)`}>
              <text x="0" y="0" className="font-serif" fontSize="24" fontStyle="italic" fill="#8C847A">Duration Time</text>
              <text x="0" y="80" className="font-sans" fontSize="64" fontWeight="900" fill="#1E1C1A">
                {displayDuration}
              </text>
            </g>

            {/* 3. Pace column */}
            <g transform={`translate(${ratio === '16:9' ? 520 : 600}, 0)`}>
              <text x="0" y="0" className="font-serif" fontSize="24" fontStyle="italic" fill="#8C847A">Computed Pace</text>
              <text x="0" y="80" className="font-sans" fontSize="64" fontWeight="900" fill="#FC5200">
                {displayPace.split(' ')[0]}
              </text>
              <text x="170" y="80" className="font-mono" fontSize="12" fontWeight="700" fill="#1E1C1A">
                {displayPace.split(' ')[1]}
              </text>
            </g>
          </g>

          <g transform={`translate(100, ${height - 240})`}>
            <line x1="0" y1="0" x2={width - 200} y2="0" stroke="#2D2A26" strokeWidth="1" />
            
            {/* Secondary stats grids */}
            <g transform="translate(0, 40)">
              <text x="0" y="0" className="font-mono" fontSize="12" fill="#8C847A" letterSpacing="2">ELEVATION PROFILE</text>
              <text x="0" y="30" className="font-sans" fontSize="20" fontWeight="700" fill="#1E1C1A">{displayElevation}</text>
            </g>

            <g transform="translate(280, 40)">
              <text x="0" y="0" className="font-mono" fontSize="12" fill="#8C847A" letterSpacing="2">HEART METRIC</text>
              <text x="0" y="30" className="font-sans" fontSize="20" fontWeight="700" fill="#1E1C1A">
                {payload.averageHeartRate ? `${Math.round(payload.averageHeartRate)} BPM` : 'NOT AVAILABLE'}
              </text>
            </g>

            <g transform="translate(560, 40)">
              <text x="0" y="0" className="font-mono" fontSize="12" fill="#8C847A" letterSpacing="2">ATHLETE RECORD</text>
              <text x="0" y="30" className="font-sans" fontSize="20" fontWeight="700" fill="#1E1C1A">{payload.athleteName}</text>
            </g>
          </g>

          {/* Elegant footer statement */}
          <g transform={`translate(100, ${height - 90})`}>
            <line x1="0" y1="0" x2={width - 200} y2="0" stroke="#2D2A26" strokeWidth="1" />
            <text x="0" y="30" className="font-serif" fontSize="18" fontStyle="italic" fill="#5A534C">
              Track.Studio Performance Review • Verified canonical source {payload.source.toUpperCase()}
            </text>
          </g>
        </g>
      )}

      {/* ==================== 3. TRAINING RECEIPT ==================== */}
      {templateId === 'training-receipt' && (
        <g>
          {/* Thermal receipt paper background */}
          <rect width={width} height={height} fill="#FDFDFB" />
          
          {/* Subtle thermal paper side borders */}
          <path d={`M 30,0 L 30,${height}`} stroke="#E8E8E0" strokeWidth="1" strokeDasharray="5,10" />
          <path d={`M ${width - 30},0 L ${width - 30},${height}`} stroke="#E8E8E0" strokeWidth="1" strokeDasharray="5,10" />

          {/* Point of sale layout */}
          <g transform="translate(80, 100)" className="font-mono" fill="#111111">
            <text x="0" y="0" fontSize="34" fontWeight="800" letterSpacing="1">TRACK.STUDIO OUTDOORS INC.</text>
            <text x="0" y="35" fontSize="16" fill="#666666">STORE #4020 - PACIFIC COAST RUNNING</text>
            <text x="0" y="55" fontSize="16" fill="#666666">PHONE: (555) 723-7869</text>
            <text x="0" y="85" fontSize="18" fontWeight="700">STATION ID: {payload.athleteName.toUpperCase()}</text>
            
            <text x="0" y="130" fontSize="20" fontWeight="700">DATE: {payload.date.toUpperCase()}</text>
            <text x="0" y="155" fontSize="20" fontWeight="700">SOURCE: {payload.source.toUpperCase()}</text>

            <line x1="0" y1="180" x2={width - 160} y2="180" stroke="#111111" strokeWidth="4" strokeDasharray="10,6" />

            {/* Transaction headers */}
            <text x="0" y="220" fontSize="20" fontWeight="800">QTY/DESCRIPTION</text>
            <text x={width - 160} y="220" fontSize="20" fontWeight="800" textAnchor="end">TOTAL VALUE</text>
            
            <line x1="0" y1="240" x2={width - 160} y2="240" stroke="#111111" strokeWidth="2" />

            {/* Workout item lines */}
            <g transform="translate(0, 280)">
              <text x="0" y="0" fontSize="24" fontWeight="700">01  DISTANCE (KM/MI)</text>
              <text x={width - 160} y="0" fontSize="26" fontWeight="800" textAnchor="end">{displayDistance}</text>

              <text x="0" y="60" fontSize="24" fontWeight="700">02  DURATION (TIME)</text>
              <text x={width - 160} y="0" fontSize="26" fontWeight="800" textAnchor="end">{displayDuration}</text>

              <text x="0" y="120" fontSize="24" fontWeight="700">03  AVERAGE SPEED (PACE)</text>
              <text x={width - 160} y="0" fontSize="26" fontWeight="800" textAnchor="end">{displayPace}</text>

              <text x="0" y="180" fontSize="24" fontWeight="700">04  ELEVATION VERT REACHED</text>
              <text x={width - 160} y="0" fontSize="26" fontWeight="800" textAnchor="end">{displayElevation}</text>

              {payload.type === 'report' && payload.activityCount && (
                <g transform="translate(0, 240)">
                  <text x="0" y="0" fontSize="24" fontWeight="700">05  LOGGED SESSIONS COUNT</text>
                  <text x={width - 160} y="0" fontSize="26" fontWeight="800" textAnchor="end">{payload.activityCount}</text>
                </g>
              )}

              {payload.averageHeartRate ? (
                <g transform={`translate(0, ${payload.type === 'report' ? 300 : 240})`}>
                  <text x="0" y="0" fontSize="24" fontWeight="700">06  AVG HR SENSOR READ</text>
                  <text x={width - 160} y="0" fontSize="26" fontWeight="800" textAnchor="end">{Math.round(payload.averageHeartRate)} BPM</text>
                </g>
              ) : null}
            </g>

            <line x1="0" y1="620" x2={width - 160} y2="620" stroke="#111111" strokeWidth="2" />

            {/* Grand summary total lines */}
            <g transform="translate(0, 660)">
              <text x="0" y="0" fontSize="28" fontWeight="800">TOTAL EFFORT SUMMARY</text>
              <text x={width - 160} y="0" fontSize="34" fontWeight="900" textAnchor="end">APPROVED</text>
              
              <text x="0" y="40" fontSize="16" fill="#444444">FEE REF: NO INTEREST ACCRUED OVER TIME</text>
              <text x="0" y="60" fontSize="16" fill="#444444">CREDIT METHOD: REAL CONSTITUENT SWEAT</text>
            </g>

            <line x1="0" y1="760" x2={width - 160} y2="760" stroke="#111111" strokeWidth="4" strokeDasharray="14,8" />

            {/* Barcode block */}
            <g transform={`translate(${(width - 160) / 2 - 200}, ${height - 230})`}>
              {renderBarcodeLines(0, 0, 400, 70)}
              <text x="200" y="100" fontSize="15" textAnchor="middle" letterSpacing="4">*TRACKSTUDIO-{payload.type.toUpperCase()}-{payload.date.slice(0, 10).replace(/[^0-9]/g, '')}*</text>
            </g>
          </g>

          {/* Subtext greetings */}
          <text x={width / 2} y={height - 50} className="font-mono" fontSize="15" fontWeight="700" fill="#222222" textAnchor="middle">
            THANK YOU FOR RUNNING WITH US!
          </text>
        </g>
      )}

      {/* ==================== 4. NUTRITION FACTS STYLE ==================== */}
      {templateId === 'nutrition-facts' && (
        <g>
          {/* Classic food packaging label background */}
          <rect width={width} height={height} fill="#FFFFFF" />
          
          <g transform="translate(80, 70)" fill="#000000">
            {/* Box frame outlining everything */}
            <rect x="-10" y="-10" width={width - 140} height={height - 120} fill="none" stroke="#000000" strokeWidth="4" />

            <text x="0" y="32" className="font-sans" fontSize="64" fontWeight="900" letterSpacing="-1">Nutrition Facts</text>
            <text x="0" y="62" className="font-sans" fontSize="16">Workout Performance Serving Sizes & Volume Metrics</text>

            {/* Thick black line */}
            <rect x="0" y="75" width={width - 160} height="12" fill="#000000" />

            <text x="0" y="112" className="font-sans" fontSize="18" fontWeight="800">Serving Size 1 Workout Segment</text>
            <text x="0" y="138" className="font-sans" fontSize="18" fontWeight="800">Servings Per Period: {payload.activityCount || 1}</text>

            {/* Medium line */}
            <rect x="0" y="148" width={width - 160} height="5" fill="#000000" />

            <text x="0" y="174" className="font-sans" fontSize="17" fontWeight="900" letterSpacing="1">Amount Per Serving</text>
            
            <g transform="translate(0, 210)">
              <text x="0" y="0" className="font-sans" fontSize="40" fontWeight="900">Calculated Volume</text>
              <text x={width - 160} y="0" className="font-sans" fontSize="40" fontWeight="900" textAnchor="end">{displayDistance}</text>
            </g>

            {/* Standard double rules */}
            <rect x="0" y="234" width={width - 160} height="3" fill="#000000" />

            <text x={width - 160} y="258" className="font-sans" fontSize="14" fontWeight="800" textAnchor="end">% Daily Value*</text>
            <line x1="0" y1="266" x2={width - 160} y2="266" stroke="#000000" strokeWidth="1" />

            {/* Facts rows */}
            <g transform="translate(0, 290)">
              <text x="0" y="0" className="font-sans" fontSize="18" fontWeight="800">Duration Endurance (Time)</text>
              <text x="180" y="0" className="font-mono" fontSize="18">{displayDuration}</text>
              <text x={width - 160} y="0" className="font-sans" fontSize="18" fontWeight="800" textAnchor="end">100%</text>
              <line x1="0" y1="12" x2={width - 160} y2="12" stroke="#000000" strokeWidth="1" />
            </g>

            <g transform="translate(0, 335)">
              <text x="0" y="0" className="font-sans" fontSize="18" fontWeight="800">Average Pace Intensity</text>
              <text x="180" y="0" className="font-mono" fontSize="18">{displayPace}</text>
              <text x={width - 160} y="0" className="font-sans" fontSize="18" fontWeight="800" textAnchor="end">88%</text>
              <line x1="0" y1="12" x2={width - 160} y2="12" stroke="#000000" strokeWidth="1" />
            </g>

            <g transform="translate(0, 380)">
              <text x="0" y="0" className="font-sans" fontSize="18" fontWeight="800">Vertical Climbing Gain</text>
              <text x="180" y="0" className="font-mono" fontSize="18">{displayElevation}</text>
              <text x={width - 160} y="0" className="font-sans" fontSize="18" fontWeight="800" textAnchor="end">65%</text>
              <line x1="0" y1="12" x2={width - 160} y2="12" stroke="#000000" strokeWidth="1" />
            </g>

            <g transform="translate(0, 425)">
              <text x="0" y="0" className="font-sans" fontSize="18" fontWeight="800">Heart Rate Zone Cardiovascular</text>
              <text x="210" y="0" className="font-mono" fontSize="18">
                {payload.averageHeartRate ? `${Math.round(payload.averageHeartRate)} BPM` : '0 BPM'}
              </text>
              <text x={width - 160} y="0" className="font-sans" fontSize="18" fontWeight="800" textAnchor="end">
                {payload.averageHeartRate ? '74%' : '0%'}
              </text>
              <line x1="0" y1="12" x2={width - 160} y2="12" stroke="#000000" strokeWidth="1" />
            </g>

            {payload.type === 'report' && (
              <g transform="translate(0, 470)">
                <text x="0" y="0" className="font-sans" fontSize="18" fontWeight="800">Active Workout Consistency (Days)</text>
                <text x="250" y="0" className="font-mono" fontSize="18">{payload.activeDays || 0} Days</text>
                <text x={width - 160} y="0" className="font-sans" fontSize="18" fontWeight="800" textAnchor="end">94%</text>
                <line x1="0" y1="12" x2={width - 160} y2="12" stroke="#000000" strokeWidth="1" />
              </g>
            )}

            {/* Footnotes block */}
            <g transform={`translate(0, ${height - 430})`}>
              <text x="0" y="0" className="font-sans" fontSize="14" fontWeight="800">* Percent Daily Values are based on user preset fitness parameters.</text>
              <text x="0" y="20" className="font-sans" fontSize="14" fill="#444444">Your daily values may be higher or lower depending on threshold zones.</text>
              
              <rect x="0" y="32" width={width - 160} height="5" fill="#000000" />

              <g transform="translate(0, 60)" className="font-mono" fontSize="13">
                <text x="0" y="0">ATHLETE PROFILE: {payload.athleteName.toUpperCase()}</text>
                <text x="0" y="20">RECORD SYSTEM CALIBRATION: ONLINE</text>
                <text x="0" y="40">SOURCE CHRONOLOGY: {payload.source.toUpperCase()}</text>
                <text x="0" y="60">REGULATORY VERDICT: UNCOMPROMISING REALITY</text>
              </g>
            </g>
          </g>
        </g>
      )}

      {/* ==================== 5. SHIPPING LABEL STYLE ==================== */}
      {templateId === 'shipping-label' && (
        <g>
          {/* Packaging Box Cardboard / Adhesive label color */}
          <rect width={width} height={height} fill="#ECE9E2" />

          <g transform="translate(80, 70)" fill="#111111">
            {/* Outlined label frame */}
            <rect x="-10" y="-10" width={width - 140} height={height - 130} fill="none" stroke="#111111" strokeWidth="3" />

            {/* Block grid division lines */}
            <line x1="-10" y1="130" x2={width - 70} y2="130" stroke="#111111" strokeWidth="2" />
            <line x1="-10" y1="310" x2={width - 70} y2="310" stroke="#111111" strokeWidth="2" />
            <line x1="-10" y1="620" x2={width - 70} y2="620" stroke="#111111" strokeWidth="2" />
            <line x1="450" y1="130" x2="450" y2="310" stroke="#111111" strokeWidth="2" />

            {/* Section 1: Top Brand info */}
            <text x="20" y="45" className="font-display" fontSize="38" fontWeight="800" letterSpacing="-1">TRACK.STUDIO EXPRESS</text>
            <text x="20" y="80" className="font-mono" fontSize="14" fontWeight="700">DESPATCH STATION ROUTING NUMBER: #A82-99F</text>
            <text x="20" y="100" className="font-mono" fontSize="14">ATHLETE REGISTRY HUB: {payload.athleteName.toUpperCase()}</text>

            {/* Box 2a: SHIP FROM */}
            <text x="20" y="160" className="font-sans" fontSize="13" fontWeight="800" fill="#666666">FROM (SOURCE RECORD)</text>
            <text x="20" y="190" className="font-mono" fontSize="20" fontWeight="800">STRAVA CLOUD FREE API</text>
            <text x="20" y="220" className="font-mono" fontSize="14">DATE LOGGED: {payload.date.toUpperCase()}</text>
            <text x="20" y="240" className="font-mono" fontSize="14">TRACKING SECURE: FIREBASE</text>

            {/* Box 2b: SHIP TO */}
            <text x="480" y="160" className="font-sans" fontSize="13" fontWeight="800" fill="#666666">TO (ATHLETE RECIPIENT)</text>
            <text x="480" y="190" className="font-mono" fontSize="24" fontWeight="800" fill="#000000">{payload.athleteName.toUpperCase()}</text>
            <text x="480" y="220" className="font-mono" fontSize="15">LEVEL: REGULAR PHYSICAL ENDURANCE</text>
            <text x="480" y="240" className="font-mono" fontSize="15">DESTINATION UNIT: {isMetric ? 'METRIC' : 'IMPERIAL'}</text>

            {/* Section 3: METRICS DISPATCH SUMMARY */}
            <text x="20" y="345" className="font-sans" fontSize="13" fontWeight="800" fill="#666666">ACTUAL WEIGHT (TRACKED DISTANCE & QUANTITIES)</text>
            
            <g transform="translate(20, 420)">
              <text x="0" y="0" className="font-display" fontSize="64" fontWeight="800">{displayDistance}</text>
              <text x="0" y="35" className="font-mono" fontSize="13" fill="#666666">DECLARED PHYSICAL GROUND COVERAGE</text>
            </g>

            <g transform="translate(480, 420)">
              <text x="0" y="0" className="font-display" fontSize="64" fontWeight="800" fill="#FC5200">{displayDuration}</text>
              <text x="0" y="35" className="font-mono" fontSize="13" fill="#666666">DECLARED ELAPSED MOVEMENT TIMEFRAME</text>
            </g>

            <g transform="translate(20, 530)">
              <text x="0" y="0" className="font-display" fontSize="32" fontWeight="800">{displayPace}</text>
              <text x="0" y="25" className="font-mono" fontSize="12" fill="#666666">ESTIMATED RUN PACING</text>
            </g>

            <g transform="translate(480, 530)">
              <text x="0" y="0" className="font-display" fontSize="32" fontWeight="800">{displayElevation}</text>
              <text x="0" y="25" className="font-mono" fontSize="12" fill="#666666">CUMULATIVE ELEVATION CLIMB</text>
            </g>

            {/* Section 4: Barcode / Postal scan box */}
            <g transform={`translate(${(width - 140) / 2 - 250}, ${height - 350})`}>
              {renderBarcodeLines(0, 0, 500, 110)}
              <text x="250" y="145" className="font-mono" fontSize="14" fontWeight="700" textAnchor="middle" letterSpacing="6">
                *TRACK-RX-COURIER-SYSTEM-E19*
              </text>
            </g>

            {/* Postal Sector box stamp */}
            <g transform={`translate(${width - 250}, ${height - 230})`}>
              <rect x="0" y="0" width="80" height="80" fill="none" stroke="#111111" strokeWidth="5" />
              <text x="40" y="55" className="font-mono" fontSize="48" fontWeight="800" textAnchor="middle">Z2</text>
              <text x="40" y="100" className="font-mono" fontSize="11" textAnchor="middle">AEROBIC</text>
            </g>
          </g>
        </g>
      )}

      {/* ==================== 6. PHARMACY/RX STYLE ==================== */}
      {templateId === 'pharmacy-rx' && (
        <g>
          {/* Pristine clean pharmacy white medical canvas overlay */}
          <rect width={width} height={height} fill="#F9FAFC" />
          
          <rect x="40" y="40" width={width - 80} height={height - 80} fill="none" stroke="#E2E8F0" strokeWidth="2" />
          <rect x="50" y="50" width={width - 100} height={height - 100} fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="6,4" />

          {/* Apothecary Clinical Rx Title */}
          <g transform="translate(100, 110)">
            <text x="0" y="0" className="font-display" fontSize="32" fontWeight="800" fill="#0F172A" letterSpacing="-0.5">HEALTH APOTHECARY INC.</text>
            <text x="0" y="25" className="font-mono" fontSize="13" fill="#64748B" letterSpacing="2">DISPENSING CUSTOM MEDICINAL LABS</text>
            
            {/* Pharmacy Rx medical symbol icon green */}
            <g transform="translate(740, -30)">
              <rect x="0" y="10" width="30" height="10" fill="#10B981" />
              <rect x="10" y="0" width="10" height="30" fill="#10B981" />
            </g>
            <line x1="0" y1="45" x2={width - 200} y2="45" stroke="#E2E8F0" strokeWidth="2" />
          </g>

          {/* Rx Symbol */}
          <g transform="translate(100, 240)">
            <text x="0" y="0" className="font-serif" fontSize="120" fontStyle="italic" fontWeight="800" fill="#EF4444">Rx</text>
            
            <g transform="translate(150, -40)">
              <text x="0" y="0" className="font-mono" fontSize="12" fill="#64748B">DOCTOR ORDER PRESCRIBED FOR:</text>
              <text x="0" y="25" className="font-sans" fontSize="28" fontWeight="800" fill="#0F172A">{payload.athleteName.toUpperCase()}</text>
              <text x="0" y="48" className="font-mono" fontSize="12" fill="#64748B">RX REGISTRATION PREPARATORY: #T-{payload.date.slice(0, 4)}</text>
            </g>
          </g>

          {/* Dosage metrics panel */}
          <g transform={`translate(100, ${ratio === '16:9' ? 320 : 380})`}>
            {/* Distance active component */}
            <g transform="translate(0, 0)">
              <text x="0" y="0" className="font-mono" fontSize="13" fill="#64748B" letterSpacing="1">ACTIVE INGREDIENT CONTENT (STRENGTH)</text>
              <text x="0" y="45" className="font-display" fontSize="48" fontWeight="800" fill="#0F172A">{displayDistance}</text>
              <text x="0" y="70" className="font-mono" fontSize="12" fill="#64748B">CUMULATIVE DOSE INTRODUCED</text>
            </g>

            {/* Heart rate dose trigger */}
            <g transform="translate(480, 0)">
              <text x="0" y="0" className="font-mono" fontSize="13" fill="#EF4444" letterSpacing="1">CARDIOVASCULAR INTENSITY DOSE</text>
              <text x="0" y="45" className="font-display" fontSize="48" fontWeight="800" fill="#EF4444">
                {payload.averageHeartRate ? `${Math.round(payload.averageHeartRate)} BPM` : 'GATED'}
              </text>
              <text x="0" y="70" className="font-mono" fontSize="12" fill="#64748B">VERIFIED BY PULSE SENSOR ARTIFACTS</text>
            </g>
          </g>

          <g transform={`translate(100, ${height - 350})`}>
            <rect x="0" y="0" width={width - 200} height="130" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
            
            <text x="25" y="40" className="font-mono" fontSize="13" fontWeight="800" fill="#EF4444">RECOMMENDED METHOD OF USE (DIRECTIONS):</text>
            <text x="25" y="70" className="font-sans" fontSize="16" fontWeight="700" fill="#334155">
              Administer {displayDuration} of physical exertion pacing at {displayPace}.
            </text>
            <text x="25" y="94" className="font-sans" fontSize="16" fontWeight="700" fill="#334155">
              Ascend {displayElevation} of elevation. Repeats indicated for consistent wellness recovery.
            </text>
          </g>

          {/* Warnings clinical barcode stamp */}
          <g transform={`translate(100, ${height - 180})`}>
            <text x="0" y="0" className="font-mono" fontSize="11" fill="#94A3B8" letterSpacing="1">WARNING: CONSISTENCE IS ADDICTIVE. KEEP OUT OF SEDENTARY LIFESTYLES.</text>
            <line x1="0" y1="15" x2={width - 200} y2="15" stroke="#E2E8F0" strokeWidth="1" />
            
            <g transform={`translate(0, 30)`}>
              {renderBarcodeLines(0, 0, 320, 40)}
              <text x="350" y="25" className="font-mono" fontSize="11" fill="#64748B">COPIES DISPENSES: 01 OF {payload.activityCount || 1}</text>
            </g>
          </g>
        </g>
      )}

      {/* ==================== 7. BRUTALIST METRICS ==================== */}
      {templateId === 'brutalist-metrics' && (
        <g>
          {/* Aggressive Solid Black Background */}
          <rect width={width} height={height} fill="#0d0d0f" />
          
          {/* Aggressive brutal offset frame */}
          <rect x="35" y="35" width={width - 70} height={height - 70} fill="none" stroke="#FC5200" strokeWidth="4" />
          <rect x="40" y="40" width={width - 80} height={height - 80} fill="none" stroke="#ffffff" strokeWidth="2" />

          {/* Brutalist diagonal markings */}
          <line x1="40" y1="120" x2={width - 40} y2="120" stroke="#ffffff" strokeWidth="2" />
          <line x1="40" y1="260" x2={width - 40} y2="260" stroke="#ffffff" strokeWidth="3" />

          {/* Neon orange background badge for headers */}
          <g transform="translate(60, 65)">
            <rect x="0" y="0" width="180" height="35" fill="#FC5200" />
            <text x="90" y="24" className="font-mono" fontSize="15" fontWeight="900" fill="#ffffff" textAnchor="middle">BRUTALIST V4</text>
            <text x="200" y="23" className="font-mono" fontSize="16" fontWeight="800" fill="#ffffff">LOCK: ONLINE</text>
          </g>

          {/* Big Title */}
          <text x="60" y="195" className="font-display" fontSize="38" fontWeight="900" fill="#ffffff" letterSpacing="-1">
            {payload.title.toUpperCase()}
          </text>
          <text x="60" y="235" className="font-mono" fontSize="14" fill="#a1a1aa" letterSpacing="1">
            LOG PERIOD: {payload.subtitle.toUpperCase()}
          </text>

          {/* Big grid blocks */}
          <g transform={`translate(40, 260)`}>
            {/* Division columns lines */}
            <line x1="500" y1="0" x2="500" y2="400" stroke="#ffffff" strokeWidth="2" />
            <line x1="0" y1="200" x2={width - 80} y2="200" stroke="#ffffff" strokeWidth="2" />

            {/* Block 1: Distance */}
            <g transform="translate(40, 40)">
              <rect x="-10" y="-10" width="160" height="30" fill="#ffffff" />
              <text x="70" y="11" className="font-mono" fontSize="14" fontWeight="900" fill="#000000" textAnchor="middle">METRIC VALUE</text>
              
              <text x="0" y="90" className="font-display" fontSize="64" fontWeight="900" fill="#ffffff" letterSpacing="-2">{displayDistance}</text>
              <text x="0" y="125" className="font-mono" fontSize="13" fill="#a1a1aa">CUMULATED TRAINED KILOMETERS</text>
            </g>

            {/* Block 2: Duration */}
            <g transform="translate(540, 40)">
              <rect x="-10" y="-10" width="160" height="30" fill="#FC5200" />
              <text x="70" y="11" className="font-mono" fontSize="14" fontWeight="900" fill="#ffffff" textAnchor="middle">ELAPSED TIME</text>
              
              <text x="0" y="90" className="font-display" fontSize="64" fontWeight="900" fill="#FC5200" letterSpacing="-2">{displayDuration}</text>
              <text x="0" y="125" className="font-mono" fontSize="13" fill="#a1a1aa">TOTAL TRAINING TIME LAPSE</text>
            </g>

            {/* Block 3: Pace */}
            <g transform="translate(40, 240)">
              <text x="0" y="10" className="font-mono" fontSize="13" fill="#ffffff">PACING SPECS:</text>
              <text x="0" y="65" className="font-mono" fontSize="48" fontWeight="900" fill="#ffffff">{displayPace}</text>
              <text x="0" y="100" className="font-mono" fontSize="12" fill="#a1a1aa">ESTIMATED COMPILATION PACINGS</text>
            </g>

            {/* Block 4: Elevation & HR */}
            <g transform="translate(540, 240)">
              <text x="0" y="10" className="font-mono" fontSize="13" fill="#ffffff">ELEVATION/VERT:</text>
              <text x="0" y="65" className="font-mono" fontSize="48" fontWeight="900" fill="#10B981">{displayElevation}</text>
              <text x="0" y="100" className="font-mono" fontSize="12" fill="#a1a1aa">CLIMB GAIN ACCORDING TO GPS STREAM</text>
            </g>
          </g>

          {/* Aggressive brutalist footer */}
          <g transform={`translate(60, ${height - 110})`}>
            <line x1="-20" y1="-20" x2={width - 80} y2="-20" stroke="#ffffff" strokeWidth="2" />
            <text x="0" y="20" className="font-mono" fontSize="15" fontWeight="900" fill="#ffffff">USER ACCOUNT SIGNED: {payload.athleteName.toUpperCase()}</text>
            <text x="0" y="45" className="font-mono" fontSize="12" fill="#71717a">VERIFICATION STATUS: 100% CANONICAL HISTORIES • FREE API TIER</text>
          </g>
        </g>
      )}

      {/* ==================== 8. POWER INTERVALS LAB ==================== */}
      {templateId === 'power-intervals' && (
        <g>
          {/* Aesthetic brutal space graphite backdrop */}
          <rect width={width} height={height} fill="#0d0e12" />
          
          {/* Neon cyan border frames */}
          <rect x="40" y="40" width={width - 80} height={height - 80} fill="none" stroke="#06B6D4" strokeWidth="2" />
          <rect x="45" y="45" width={width - 90} height={height - 90} fill="none" stroke="#334155" strokeWidth="1" />

          {/* Grid backgrounds */}
          <line x1="40" y1="200" x2={width - 40} y2="200" stroke="#1e293b" strokeWidth="1" />
          <line x1="40" y1={height - 200} x2={width - 40} y2={height - 200} stroke="#1e293b" strokeWidth="1" />

          {/* Topic bar */}
          <text x="80" y="110" className="font-mono" fontSize="13" fontWeight="900" fill="#06B6D4" letterSpacing="4">
            METABOLIC POWER INTERVAL INTEGRITY
          </text>
          <text x="80" y="155" className="font-display" fontSize="32" fontWeight="700" fill="#ffffff">
            {payload.title.toUpperCase()}
          </text>

          {/* Subtitle / date details */}
          <text x={width - 80} y="110" className="font-mono" fontSize="11" fill="#64748b" textAnchor="end" letterSpacing="1">
            LAB ID: WATT-V4.5 / {payload.subtitle.toUpperCase()}
          </text>

          {/* Large Power display */}
          <g transform={`translate(80, ${height / 2 - 80})`}>
            <text x="0" y="10" className="font-sans" fontSize="14" fontWeight="800" fill="#64748b" letterSpacing="2">AVERAGE ENGINE CAPABILITY</text>
            <text x="0" y="140" className="font-display" fontSize="140" fontWeight="900" fill="#ffffff" letterSpacing="-4">
              {payload.averageWatts || 0}
            </text>
            <text x="320" y="140" className="font-mono" fontSize="32" fontWeight="900" fill="#06B6D4">WATTS</text>
            
            {/* Visual energy gauge */}
            <rect x="0" y="180" width={width - 160} height="8" fill="#1e293b" rx="4" />
            <rect x="0" y="180" width={Math.min(width - 160, Math.round(((payload.averageWatts || 200) / 450) * (width - 160)))} height="8" fill="#06B6D4" rx="4" />
          </g>

          {/* Dynamic properties grid inside lower shelf */}
          <g transform={`translate(80, ${height - 150})`}>
            <g transform="translate(0, 0)">
              <text x="0" y="0" className="font-mono" fontSize="12" fill="#64748b" letterSpacing="2">DISTANCE</text>
              <text x="0" y="32" className="font-display" fontSize="24" fontWeight="700" fill="#ffffff">{displayDistance}</text>
            </g>

            <g transform="translate(240, 0)">
              <text x="0" y="0" className="font-mono" fontSize="12" fill="#64748b" letterSpacing="2">DURATION</text>
              <text x="0" y="32" className="font-display" fontSize="24" fontWeight="700" fill="#ffffff">{displayDuration}</text>
            </g>

            <g transform="translate(480, 0)">
              <text x="0" y="0" className="font-mono" fontSize="12" fill="#64748b" letterSpacing="2">AVG PACE</text>
              <text x="0" y="32" className="font-display" fontSize="24" fontWeight="700" fill="#FC5200">{displayPace}</text>
            </g>

            {payload.averageHeartRate && (
              <g transform="translate(720, 0)">
                <text x="0" y="0" className="font-mono" fontSize="12" fill="#64748b" letterSpacing="2">HEART rate</text>
                <text x="0" y="32" className="font-display" fontSize="24" fontWeight="700" fill="#EF4444">{Math.round(payload.averageHeartRate)} BPM</text>
              </g>
            )}
          </g>

          {/* Footer credentials */}
          <text x="80" y={height - 70} className="font-mono" fontSize="11" fill="#475569" letterSpacing="4">
            VERIFIED DETERMINISTIC WATTAGE • SIGNED: {payload.athleteName.toUpperCase()}
          </text>
        </g>
      )}

      {/* ==================== 9. ROUTE POSTER ==================== */}
      {templateId === 'route-poster' && (
        <g>
          {/* Aesthetic Dark Cinematic poster backdrop */}
          <rect width={width} height={height} fill="#09090b" />
          
          {/* Frame grids decorative background */}
          <line x1="120" y1="0" x2="120" y2={height} stroke="#18181b" strokeWidth="1" />
          <line x1={width - 120} y1="0" x2={width - 120} y2={height} stroke="#18181b" strokeWidth="1" />
          <line x1="0" y1="120" x2={width} y2="120" stroke="#18181b" strokeWidth="1" />
          <line x1="0" y1={height - 180} x2={width} y2={height - 180} stroke="#18181b" strokeWidth="1" />

          {/* High-fidelity GPS route Path trail render */}
          {payload.routeSvgPath ? (
            <g transform={`translate(0, ${ratio === '9:16' ? 240 : 80})`}>
              {/* Outer glow aura path */}
              <path
                d={payload.routeSvgPath}
                fill="none"
                stroke="#FC5200"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.15"
              />
              {/* Core main path */}
              <path
                d={payload.routeSvgPath}
                fill="none"
                stroke="#FC5200"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : (
            <g transform={`translate(${width / 2}, ${height / 2})`}>
              <circle cx="0" cy="0" r="120" fill="none" stroke="#222" strokeWidth="2" strokeDasharray="5,10" />
              <text x="0" y="10" className="font-mono" fontSize="14" fill="#444" textAnchor="middle">ROUTE DECRYPTION GATED</text>
            </g>
          )}

          {/* Small modern minimalist footer text details */}
          <g transform={`translate(120, ${height - 120})`}>
            <text x="0" y="0" className="font-sans" fontSize="24" fontWeight="800" fill="#ffffff" letterSpacing="-0.5">
              {payload.title}
            </text>
            <text x="0" y="24" className="font-mono" fontSize="12" fill="#71717a" letterSpacing="2">
              GPS SATELLITE PLOT • {payload.subtitle.toUpperCase()}
            </text>

            {/* Performance tags in bottom corner */}
            <g transform={`translate(${width - 440}, -10)`} className="font-mono" fontSize="14">
              <text x="0" y="0" fontWeight="700" fill="#ffffff">{displayDistance}</text>
              <text x="0" y="20" fill="#71717a">DISTANCE</text>

              <text x="140" y="0" fontWeight="700" fill="#ffffff">{displayDuration}</text>
              <text x="140" y="20" fill="#71717a">DURATION</text>

              <text x="260" y="0" fontWeight="700" fill="#FC5200">{displayPace}</text>
              <text x="260" y="20" fill="#71717a">PACE</text>
            </g>
          </g>

          {/* Delicate Top header details */}
          <g transform="translate(120, 80)">
            <text x="0" y="0" className="font-mono" fontSize="12" fontWeight="700" fill="#FC5200" letterSpacing="4">
              GEOGRAPHIC COORDINATES TRAIL RECORD
            </text>
            <text x={width - 240} y="0" className="font-mono" fontSize="10" fill="#71717a" textAnchor="end" letterSpacing="1">
              ATHLETE: {payload.athleteName.toUpperCase()} / CALIBRA: SECURE
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
