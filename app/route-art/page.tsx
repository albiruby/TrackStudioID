'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { 
  ArrowLeft, 
  Compass, 
  RefreshCw, 
  Sliders, 
  Tv, 
  Download, 
  Copy, 
  Layers, 
  Heart, 
  Zap, 
  Activity, 
  Sparkles,
  Info,
  Calendar,
  Settings,
  Shield,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  FolderLock,
  Database
} from 'lucide-react';
import { getActivities, getActivityStream } from '../../lib/firebase/firestore';
import { storage } from '../../lib/firebase/client';
import { saveExportAsset } from '../../lib/export/exportStorage';
import { decodePolyline } from '../../lib/export/exportPayload';
import { CanonicalActivity, CanonicalActivityStream } from '../../data/types';

type StyleType = 'minimal' | 'neon' | 'heatmap' | 'constellation';
type RatioType = '1:1' | '9:16' | '4:3' | '16:9';

// Theme preset options
const BACKGROUND_PRESETS = [
  { name: 'Carbon Black', value: '#08080a' },
  { name: 'Stone Grey', value: '#1c1917' },
  { name: 'Vintage Cream', value: '#fafaf9' },
  { name: 'Midnight Marine', value: '#0f172a' },
  { name: 'Nordic Blue', value: '#1e293b' },
  { name: 'Crimson Wine', value: '#4c0519' },
];

const LINE_PRESETS = [
  { name: 'Strava Orange', value: '#FC5200' },
  { name: 'Laser Pink', value: '#f43f5e' },
  { name: 'Neon Turquoise', value: '#06b6d4' },
  { name: 'Emerald Volt', value: '#10b981' },
  { name: 'Silver Light', value: '#ffffff' },
  { name: 'Cyber Indigo', value: '#8b5cf6' },
];

export default function RouteArtPage() {
  const router = useRouter();
  const { user, athleteProfile, loading: authLoading } = useAuth();

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Core component states
  const [activities, setActivities] = useState<CanonicalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedStream, setSelectedStream] = useState<CanonicalActivityStream | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);

  // Customize art state
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('minimal');
  const [selectedRatio, setSelectedRatio] = useState<RatioType>('1:1');
  const [bgColor, setBgColor] = useState<string>('#08080a');
  const [lineColor, setLineColor] = useState<string>('#FC5200');
  const [lineThickness, setLineThickness] = useState<number>(3);
  
  // Custom layout element boundaries
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [showDate, setShowDate] = useState<boolean>(true);
  const [showDistance, setShowDistance] = useState<boolean>(true);
  const [athleteName, setAthleteName] = useState<string>('');

  // UI status elements
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Synchronize initial default athlete name once auth state becomes ready
  useEffect(() => {
    if (athleteProfile?.displayName) {
      setAthleteName(athleteProfile.displayName.toUpperCase());
    }
  }, [athleteProfile]);

  // Load activities of authenticated user
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setLoading(true);
        const data = await getActivities(user.uid);
        setActivities(data);
        
        // Auto-select first GPS-enabled activity
        const gpsFiltered = data.filter(a => !!(a.hasGps || a.polyline || a.summaryPolyline));
        if (gpsFiltered.length > 0) {
          setSelectedId(gpsFiltered[0].id);
        }
      } catch (e) {
        console.error('Failed to load activity paths:', e);
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

  // Handle lazy loading of high resolution streams for selected activity
  useEffect(() => {
    if (!selectedId) {
      setSelectedStream(null);
      return;
    }
    async function loadStream() {
      setStreamLoading(true);
      try {
        const str = await getActivityStream(selectedId);
        setSelectedStream(str);
      } catch (err) {
        console.warn('Coordinates stream fetch warning (relying on polylines):', err);
        setSelectedStream(null);
      } finally {
        setStreamLoading(false);
      }
    }
    loadStream();
  }, [selectedId]);

  // Filter activities to include ONLY real GPS and outdoor route tracks
  const gpsActivities = useMemo(() => {
    return activities.filter(a => !!(a.hasGps || a.polyline || a.summaryPolyline));
  }, [activities]);

  // Active activity detail record
  const selectedActivity = useMemo(() => {
    return gpsActivities.find(a => a.id === selectedId) || null;
  }, [gpsActivities, selectedId]);

  // Preferred system measurement unit settings
  const preferredUnits = athleteProfile?.units || 'metric';
  const isMetric = preferredUnits !== 'imperial';

  // Decode points based on standard priorities: 1. high-res stream 2. Polyline 3. Summary Polyline
  const { coordinates, sourceQuality, parseErrorMsg } = useMemo(() => {
    if (!selectedActivity) {
      return { coordinates: [], sourceQuality: 'NOT_AVAILABLE', parseErrorMsg: 'No GPS activity selected.' };
    }

    // High Res Stream (latlng arrays)
    if (selectedStream && selectedStream.latlng && selectedStream.latlng.length > 0) {
      return { coordinates: selectedStream.latlng, sourceQuality: 'HIGH_RES', parseErrorMsg: null };
    }

    // Detailed Polyline
    if (selectedActivity.polyline) {
      try {
        const coords = decodePolyline(selectedActivity.polyline);
        if (coords && coords.length > 0) {
          return { coordinates: coords, sourceQuality: 'SUMMARY_ROUTE', parseErrorMsg: null };
        }
      } catch {
        // Fallback
      }
    }

    // Summary Polyline
    if (selectedActivity.summaryPolyline) {
      try {
        const coords = decodePolyline(selectedActivity.summaryPolyline);
        if (coords && coords.length > 0) {
          return { coordinates: coords, sourceQuality: 'SUMMARY_ROUTE', parseErrorMsg: null };
        }
      } catch {
        // Fallback
      }
    }

    return { 
      coordinates: [], 
      sourceQuality: 'NOT_AVAILABLE', 
      parseErrorMsg: 'GPS coordinates empty or unrenderable.' 
    };
  }, [selectedActivity, selectedStream]);

  // Aspect Ratio calculations
  const ratioHeight = useMemo(() => {
    switch (selectedRatio) {
      case '9:16': return 1920;
      case '4:3': return 810;
      case '16:9': return 608;
      case '1:1':
      default: return 1080;
    }
  }, [selectedRatio]);

  // Generate responsive coordinates path mapping fitting the exact frame safely
  const { path, viewBox } = useMemo(() => {
    if (!coordinates || coordinates.length === 0) {
      return { path: '', viewBox: `0 0 1080 ${ratioHeight}` };
    }
    
    // Balanced padding parameters (with larger lower gutter specifically for text elements)
    const padTop = 140;
    const padRight = 140;
    const padBottom = 260; // Extra room for Title, date, unit statistics
    const padLeft = 140;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    coordinates.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const rangeLat = maxLat - minLat;
    const rangeLng = maxLng - minLng;

    const drawW = 1080 - (padLeft + padRight);
    const drawH = ratioHeight - (padTop + padBottom);

    let scale = 1;
    if (rangeLng > 0 || rangeLat > 0) {
      scale = Math.min(
        rangeLng === 0 ? Infinity : drawW / rangeLng,
        rangeLat === 0 ? Infinity : drawH / rangeLat
      );
    }
    if (scale === Infinity || scale <= 0) scale = 1;

    const offsetX = padLeft + (drawW - rangeLng * scale) / 2;
    const offsetY = padTop + (drawH - rangeLat * scale) / 2;

    const points = coordinates.map(([lat, lng]) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = offsetY + (maxLat - lat) * scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      path: `M ${points.join(' L ')}`,
      viewBox: `0 0 1080 ${ratioHeight}`
    };
  }, [coordinates, ratioHeight]);

  // Projected coordinates specifically for star nodes in the constellation style
  const projectedStars = useMemo(() => {
    if (!coordinates || coordinates.length === 0 || selectedStyle !== 'constellation') {
      return [];
    }

    // Sample key points along the route trace (e.g., maximum 60 points)
    const targetCount = 60;
    const step = Math.max(1, Math.floor(coordinates.length / targetCount));
    const starPoints: [number, number][] = [];
    for (let i = 0; i < coordinates.length; i += step) {
      starPoints.push(coordinates[i]);
    }
    // Guarantee start and end are highlighted
    if (coordinates.length > 1 && starPoints[starPoints.length - 1] !== coordinates[coordinates.length - 1]) {
      starPoints.push(coordinates[coordinates.length - 1]);
    }

    const padTop = 140;
    const padRight = 140;
    const padBottom = 260;
    const padLeft = 140;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    coordinates.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const rangeLat = maxLat - minLat;
    const rangeLng = maxLng - minLng;

    const drawW = 1080 - (padLeft + padRight);
    const drawH = ratioHeight - (padTop + padBottom);

    let scale = 1;
    if (rangeLng > 0 || rangeLat > 0) {
      scale = Math.min(
        rangeLng === 0 ? Infinity : drawW / rangeLng,
        rangeLat === 0 ? Infinity : drawH / rangeLat
      );
    }
    if (scale === Infinity || scale <= 0) scale = 1;

    const offsetX = padLeft + (drawW - rangeLng * scale) / 2;
    const offsetY = padTop + (drawH - rangeLat * scale) / 2;

    return starPoints.map(([lat, lng]) => {
      const x = offsetX + (lng - minLng) * scale;
      const y = offsetY + (maxLat - lat) * scale;
      return { x, y };
    });
  }, [coordinates, ratioHeight, selectedStyle]);

  // Determine light/dark background state for appropriate label rendering contrasts
  const isBgLight = useMemo(() => {
    const hex = bgColor.toLowerCase().replace('#', '');
    if (['ffffff', 'fafaf9', 'fafafa', 'f5f5f4', 'e7e5e4'].includes(hex)) {
      return true;
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 140;
    }
    return false;
  }, [bgColor]);

  const textFill = isBgLight ? '#1c1917' : '#ffffff';
  const textMutedFill = isBgLight ? '#78716c' : '#71717a';

  // Date and Distance format labels
  const formattedDistance = useMemo(() => {
    if (!selectedActivity) return '';
    const meters = selectedActivity.distanceMeters || 0;
    if (isMetric) {
      return `${(meters / 1000).toFixed(2)} KM`;
    } else {
      return `${(meters * 0.000621371).toFixed(2)} MI`;
    }
  }, [selectedActivity, isMetric]);

  const formattedDate = useMemo(() => {
    if (!selectedActivity || !selectedActivity.startDate) return '';
    try {
      return new Date(selectedActivity.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).toUpperCase();
    } catch {
      return selectedActivity.startDate.slice(0, 10);
    }
  }, [selectedActivity]);

  // Data Health calculations (#8)
  const healthDashboardMetrics = useMemo(() => {
    const totalGps = activities.filter(a => !!(a.hasGps || a.polyline || a.summaryPolyline)).length;
    
    let renderableCount = 0;
    let parsingErrors = 0;
    let highResCount = 0;
    let summaryRouteCount = 0;

    activities.forEach(a => {
      const hasRouteSource = !!(a.hasGps || a.polyline || a.summaryPolyline);
      if (!hasRouteSource) return;

      const syncedStreamKeys = a.streamKeysAvailable || [];
      const hasStreamWithCoords = !!(a.streamsSyncedAt && (a.hasStreams || syncedStreamKeys.includes('latlng')));
      
      if (hasStreamWithCoords) {
        highResCount++;
      } else {
        summaryRouteCount++;
      }

      // Test parsing validity
      const poly = a.polyline || a.summaryPolyline;
      if (poly) {
        try {
          const testCoords = decodePolyline(poly);
          if (testCoords && testCoords.length > 0) {
            renderableCount++;
          } else {
            parsingErrors++;
          }
        } catch {
          parsingErrors++;
        }
      } else if (hasStreamWithCoords) {
        renderableCount++;
      } else {
        parsingErrors++;
      }
    });

    return {
      gpsCount: totalGps,
      renderable: renderableCount,
      errors: parsingErrors,
      highRes: highResCount,
      summary: summaryRouteCount
    };
  }, [activities]);

  const triggerFeedback = (msg: string, type: 'success' | 'error' | 'info') => {
    setFeedback({ msg, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Export 1. PNG Image Compilation
  const handleSavePng = () => {
    if (!svgRef.current) {
      triggerFeedback('Vector viewport unavailable.', 'error');
      return;
    }

    setIsExporting(true);
    triggerFeedback('Rendering high-fidelity artwork compilation...', 'info');

    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      const URLRef = window.URL || window.webkitURL || window;
      const blobUrl = URLRef.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = ratioHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          triggerFeedback('Failed to mount 2D graphic compilation stream.', 'error');
          setIsExporting(false);
          return;
        }

        // Fill background color directly
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 1080, ratioHeight);

        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL('image/png', 1.0);
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const filename = `track_studio_route_${selectedId}_${selectedStyle}_${timestamp}.png`;
        
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URLRef.revokeObjectURL(blobUrl);
        setIsExporting(false);
        triggerFeedback('Route poster saved successfully to downloads!', 'success');
      };

      img.onerror = () => {
        setIsExporting(false);
        triggerFeedback('Raster image draw failure.', 'error');
      };

      img.src = blobUrl;
    } catch (err) {
      console.error('Rasterization failure:', err);
      setIsExporting(false);
      triggerFeedback('Export failed. Please check route coordinates layout.', 'error');
    }
  };

  // Export 2. Clipboard integration
  const handleCopyClipboard = async () => {
    if (!svgRef.current) {
      triggerFeedback('Vector source canvas missing.', 'error');
      return;
    }

    if (!navigator.clipboard || !window.ClipboardItem) {
      triggerFeedback('Direct clipboard operations are not fully supported on this viewport sequence.', 'error');
      return;
    }

    setIsExporting(true);
    triggerFeedback('Compiling raster layout segment onto active system clipboard...', 'info');

    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      const URLRef = window.URL || window.webkitURL || window;
      const blobUrl = URLRef.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = ratioHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          triggerFeedback('Graphics driver stream failure.', 'error');
          setIsExporting(false);
          return;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 1080, ratioHeight);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            triggerFeedback('Blob serialization fault.', 'error');
            setIsExporting(false);
            return;
          }

          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            URLRef.revokeObjectURL(blobUrl);
            setIsExporting(false);
            triggerFeedback('Poster graphic copied directly to clipboard!', 'success');
          } catch (clipErr) {
            console.error('Clipboard fault:', clipErr);
            setIsExporting(false);
            triggerFeedback('Direct workspace security restricted copying here. Try Save PNG instead.', 'error');
          }
        }, 'image/png', 1.0);
      };

      img.onerror = () => {
        setIsExporting(false);
        triggerFeedback('Decoding process interrupted.', 'error');
      };

      img.src = blobUrl;
    } catch (err) {
      console.error('Clipboard action failure:', err);
      setIsExporting(false);
      triggerFeedback('Drawing coordinate sequence failed.', 'error');
    }
  };

  const hasStorage = !!storage;

  const handleSaveToLibrary = async () => {
    if (!svgRef.current || !user || !hasStorage || !selectedActivity) {
      triggerFeedback('Cannot save to library: storage offline or missing data.', 'error');
      return;
    }

    setIsExporting(true);
    triggerFeedback('Rendering vectors for cloud library...', 'info');

    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      const URLRef = window.URL || window.webkitURL || window;
      const blobUrl = URLRef.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = ratioHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          triggerFeedback('Graphics driver stream failure.', 'error');
          setIsExporting(false);
          return;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 1080, ratioHeight);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            triggerFeedback('Blob serialization fault.', 'error');
            setIsExporting(false);
            return;
          }

          try {
            await saveExportAsset(
              user.uid,
              'route_art',
              selectedActivity.id,
              'system', // using system or strava
              selectedStyle,
              selectedRatio,
              blob
            );
            
            URLRef.revokeObjectURL(blobUrl);
            setIsExporting(false);
            triggerFeedback('Poster saved to cloud library successfully!', 'success');
          } catch (storageErr) {
            console.error('Storage saving fault:', storageErr);
            setIsExporting(false);
            triggerFeedback('Failed to save to cloud library.', 'error');
          }
        }, 'image/png', 1.0);
      };

      img.onerror = () => {
        setIsExporting(false);
        triggerFeedback('Decoding process interrupted.', 'error');
      };

      img.src = blobUrl;
    } catch (err) {
      console.error('Library saving action failure:', err);
      setIsExporting(false);
      triggerFeedback('Image creation failed.', 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-[#FC5200]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#FC5200]" />
        <span className="text-xs font-mono uppercase tracking-wider font-extrabold text-[#FC5200]">Loading Route Art Engine...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 sm:p-6 md:p-8">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">

        {/* TOP COMPACT BRAND HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#111113] p-5 border border-white/5 rounded-xl">
          <div className="flex items-center gap-4">
            <button
              id="back-btn"
              onClick={() => router.push('/')}
              className="p-2 border border-white/10 hover:border-white/20 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#FC5200]" />
                <h1 className="text-base font-extrabold uppercase tracking-wide font-mono text-white">Route Art</h1>
              </div>
              <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-black text-xs font-mono mt-0.5">
                Create visual posters from GPS activity routes.
              </p>
            </div>
          </div>
          
          {/* QUALITY ROUTE INDICATOR LABEL */}
          {selectedActivity && (
            <div className="flex items-center gap-2 font-mono text-[10px] self-start sm:self-center">
              <span className="text-zinc-500 font-bold uppercase">TRAIL INTEGRITY:</span>
              {sourceQuality === 'HIGH_RES' ? (
                <span className="px-2.5 py-1 bg-emerald-900/25 border border-emerald-500/30 text-emerald-400 font-extrabold rounded leading-none">
                  HIGH RESOLUTION
                </span>
              ) : sourceQuality === 'SUMMARY_ROUTE' ? (
                <span className="px-2.5 py-1 bg-amber-900/25 border border-amber-500/30 text-amber-400 font-extrabold rounded leading-none">
                  SUMMARY ROUTE
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-900/25 border border-rose-500/30 text-rose-400 font-extrabold rounded leading-none">
                  NOT AVAILABLE
                </span>
              )}
            </div>
          )}
        </div>

        {/* FEEDBACK STATUS ROW */}
        {feedback && (
          <div className={`px-5 py-3 border text-[11px] font-mono rounded-lg flex items-center gap-2 font-bold tracking-wide transition-all ${
            feedback.type === 'success' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' :
            feedback.type === 'error' ? 'bg-rose-900/20 border-rose-500/30 text-rose-400' :
            'bg-[#FC5200]/10 border-[#FC5200]/30 text-[#FC5200]'
          }`}>
            {feedback.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            {feedback.type === 'info' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
            <span className="uppercase">{feedback.msg}</span>
          </div>
        )}

        {/* WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: LIVE CARD CANVAS DRAWING DISPLAY */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            <div className="bg-[#111113]/90 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center min-h-[500px]">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono self-start mb-4">
                Dynamic Graphic Poster Viewport (Interactive Aspect Scalar)
              </span>

              {/* Responsive Container keeping 1080px ratio scaled within limits */}
              {parseErrorMsg ? (
                <div className="w-full max-w-[420px] aspect-square flex flex-col items-center justify-center text-center p-8 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-md text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-mono font-black text-rose-400 uppercase">Route data could not be rendered.</h3>
                  <p className="text-[10px] uppercase font-mono text-zinc-500 leading-relaxed font-bold">
                    {parseErrorMsg}
                  </p>
                </div>
              ) : streamLoading ? (
                <div className="w-full max-w-[420px] aspect-square flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#FC5200]" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest">
                    SYNCING REAL STREAM COORDINATES...
                  </span>
                </div>
              ) : selectedActivity ? (
                <div 
                  className="relative shadow-[0_24px_50px_rgba(0,0,0,0.85)] border border-white/10 rounded overflow-hidden max-w-full duration-300 transition-all bg-zinc-900 flex items-center justify-center"
                  style={{
                    width: 'min(100%, 360px)',
                    aspectRatio: `1080 / ${ratioHeight}`
                  }}
                >
                  <svg
                    ref={svgRef}
                    viewBox={viewBox}
                    className="w-full h-full block"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* SVG Filters for Neon glow effect */}
                    <defs>
                      <filter id="neon-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <linearGradient id="heatmap-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fc5200" />
                        <stop offset="50%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>

                    {/* Background Pattern specifically for styles */}
                    {selectedStyle === 'constellation' && (
                      <g opacity="0.12" stroke="#ffffff" strokeWidth="0.5">
                        <line x1="10%" y1="0%" x2="10%" y2="100%" strokeDasharray="2 4" />
                        <line x1="30%" y1="0%" x2="30%" y2="100%" strokeDasharray="2 4" />
                        <line x1="50%" y1="0%" x2="50%" y2="100%" strokeDasharray="2 4" />
                        <line x1="70%" y1="0%" x2="70%" y2="100%" strokeDasharray="2 4" />
                        <line x1="90%" y1="0%" x2="90%" y2="100%" strokeDasharray="2 4" />

                        <line x1="0%" y1="15%" x2="100%" y2="15%" strokeDasharray="2 4" />
                        <line x1="0%" y1="35%" x2="100%" y2="35%" strokeDasharray="2 4" />
                        <line x1="0%" y1="55%" x2="100%" y2="55%" strokeDasharray="2 4" />
                        <line x1="0%" y1="75%" x2="100%" y2="75%" strokeDasharray="2 4" />
                        <line x1="0%" y1="90%" x2="100%" y2="90%" strokeDasharray="2 4" />
                      </g>
                    )}

                    {/* Rendering the primary path depending on the selected style theme */}
                    {selectedStyle === 'minimal' && (
                      <path
                        d={path}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth={lineThickness}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {selectedStyle === 'neon' && (
                      <>
                        {/* Outer Glow */}
                        <path
                          d={path}
                          fill="none"
                          stroke={lineColor}
                          strokeWidth={lineThickness * 2.8}
                          opacity="0.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#neon-glow-filter)"
                        />
                        {/* Core beam */}
                        <path
                          d={path}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={lineThickness * 0.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    {selectedStyle === 'heatmap' && (
                      <>
                        <path
                          d={path}
                          fill="none"
                          stroke="url(#heatmap-gradient)"
                          strokeWidth={lineThickness * 3.5}
                          opacity="0.18"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke="url(#heatmap-gradient)"
                          strokeWidth={lineThickness * 2}
                          opacity="0.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={path}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={lineThickness}
                          opacity="0.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    {selectedStyle === 'constellation' && (
                      <>
                        {/* Star pathway link */}
                        <path
                          d={path}
                          fill="none"
                          stroke={lineColor}
                          strokeWidth={Math.max(1, lineThickness * 0.5)}
                          strokeDasharray="4 6"
                          opacity="0.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Stellar nodes at specific coordinate points along route */}
                        {projectedStars.map((star, idx) => {
                          const isBoundary = idx === 0 || idx === projectedStars.length - 1;
                          return (
                            <g key={idx}>
                              <circle
                                cx={star.x}
                                cy={star.y}
                                r={isBoundary ? 7 : 3.5}
                                fill={isBoundary ? '#ffffff' : lineColor}
                                opacity="0.9"
                              />
                              {isBoundary && (
                                <circle
                                  cx={star.x}
                                  cy={star.y}
                                  r="13"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="1"
                                  opacity="0.3"
                                />
                              )}
                            </g>
                          );
                        })}
                      </>
                    )}

                    {/* STATS AND TEXT SUMMARY LABELS OVERLAY */}
                    <g fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                      {/* Athlete Signature credit */}
                      {athleteName && (
                        <text
                          x="540"
                          y={ratioHeight - 110}
                          fill={textMutedFill}
                          fontSize="18"
                          letterSpacing="6"
                        >
                          {athleteName.toUpperCase()}
                        </text>
                      )}

                      {/* Primary Title activity label */}
                      {showTitle && (
                        <text
                          x="540"
                          y={ratioHeight - 70}
                          fill={textFill}
                          fontSize="25"
                          letterSpacing="4"
                          fontWeight="900"
                        >
                          {selectedActivity.name.toUpperCase()}
                        </text>
                      )}

                      {/* Metadata row: Distance + Date */}
                      {(showDate || showDistance) && (
                        <text
                          x="540"
                          y={ratioHeight - 35}
                          fill={textMutedFill}
                          fontSize="15"
                          letterSpacing="2"
                        >
                          {showDistance && formattedDistance}
                          {showDistance && showDate && '  •  '}
                          {showDate && formattedDate}
                        </text>
                      )}
                    </g>
                  </svg>
                </div>
              ) : (
                <div className="w-full max-w-[420px] aspect-square flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 text-zinc-500">
                  <Compass className="w-8 h-8 animate-pulse text-zinc-600" />
                  <span className="text-xs uppercase font-mono tracking-widest font-black">
                    No active GPS activity selected
                  </span>
                </div>
              )}
            </div>

            {/* LOWER PORTION: DETAILED DATA HEALTH SIDEBAR AUDIT (Reqs #7, #8) */}
            <div className="bg-[#111113]/90 border border-white/5 rounded-xl p-5 space-y-4 text-left">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Shield className="w-4 h-4 text-[#FC5200]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  GPS Data Health & Stream Integrity Audit
                </h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-zinc-950 p-2.5 border border-white/5 rounded">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold font-mono block">GPS Workouts</span>
                  <span className="text-sm font-mono font-black text-white mt-0.5 block">
                    {healthDashboardMetrics.gpsCount}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-white/5 rounded">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold font-mono block">Renderable</span>
                  <span className="text-sm font-mono font-black text-[#FC5200] mt-0.5 block">
                    {healthDashboardMetrics.renderable}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-white/5 rounded">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold font-mono block">Parse Errors</span>
                  <span className="text-sm font-mono font-black text-rose-450 text-red-400 mt-0.5 block">
                    {healthDashboardMetrics.errors}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-white/5 rounded">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold font-mono block">High-Res Docs</span>
                  <span className="text-sm font-mono font-black text-emerald-400 mt-0.5 block">
                    {healthDashboardMetrics.highRes}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 border border-white/5 rounded">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold font-mono block">Summary Docs</span>
                  <span className="text-sm font-mono font-black text-amber-400 mt-0.5 block">
                    {healthDashboardMetrics.summary}
                  </span>
                </div>
              </div>

              <div className="text-[10px] uppercase font-mono text-zinc-500 leading-relaxed space-y-1 bg-black/40 p-3 rounded border border-white/[0.03]">
                <p>• Stream coordinates are mapped with server-authoritative coordinate arrays synced from Strava.</p>
                <p>• Summary routes decode static encoded polyline sequences via direct mathematical decoders in local cache.</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PRECISE CONTROL PLATFORM */}
          <div className="lg:col-span-6 flex flex-col space-y-5">
            
            {/* 1. SELECT GPS ACTIVITY */}
            <div className="bg-[#111113] border border-white/5 rounded-xl p-5 space-y-3 text-left">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                1. Select GPS-Enabled Activity
              </span>
              
              {gpsActivities.length > 0 ? (
                <div className="space-y-2">
                  <select
                    id="route-activity-selector"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 hover:border-white/20 text-zinc-200 text-xs font-mono py-2.5 px-3 rounded-lg focus:outline-none focus:border-[#FC5200] transition-colors uppercase cursor-pointer"
                  >
                    {gpsActivities.map((act) => {
                      const distLabel = isMetric 
                        ? `${((act.distanceMeters || 0) / 1000).toFixed(1)} KM` 
                        : `${((act.distanceMeters || 0) * 0.000621371).toFixed(1)} MI`;
                      const qualityLabel = act.hasStreams ? ' (HIGH)' : ' (SUMM)';
                      return (
                        <option key={act.id} value={act.id}>
                          {act.name} - {distLabel}{qualityLabel}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-[9px] text-zinc-500 uppercase font-mono block mt-1 font-bold">
                    Note: Activities with no GPS or coordinates logs are excluded.
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-zinc-950/80 border border-dashed border-red-500/20 text-zinc-400 rounded-lg text-center font-mono">
                  <FolderLock className="w-5 h-5 mx-auto text-zinc-650 text-red-400 mb-2" />
                  <p className="text-[10.5px] uppercase text-red-400 font-extrabold max-w-sm mx-auto leading-relaxed">
                    No GPS route data found. Sync outdoor Strava activities to create route art.
                  </p>
                </div>
              )}
            </div>

            {/* 2. ART STYLE THEME */}
            <div className="bg-[#111113] border border-white/5 rounded-xl p-5 space-y-3 text-left">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                2. Select Art Preset Style
              </span>

              <div className="grid grid-cols-2 gap-3 select-none">
                {([
                  { id: 'minimal', label: 'MINIMAL', icon: Compass, desc: 'Clean, solid outline gallery look' },
                  { id: 'neon', label: 'NEON', icon: Zap, desc: 'Lasered double glow vector beam' },
                  { id: 'heatmap', label: 'HEATMAP', icon: Activity, desc: 'Gradient thermal scale layout' },
                  { id: 'constellation', label: 'CONSTELLATION', icon: Sparkles, desc: 'Star starry-night coordinate dots' },
                ] as const).map((sty) => {
                  const Icon = sty.icon;
                  return (
                    <button
                      key={sty.id}
                      onClick={() => setSelectedStyle(sty.id as StyleType)}
                      className={`p-3 border rounded-lg text-left transition-all flex flex-col justify-between h-[90px] cursor-pointer ${
                        selectedStyle === sty.id 
                          ? 'border-[#FC5200] bg-[#FC5200]/5' 
                          : 'border-white/10 hover:border-white/20 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold font-mono uppercase text-white">{sty.label}</span>
                        <Icon className={`w-4 h-4 ${selectedStyle === sty.id ? 'text-[#FC5200]' : 'text-zinc-500'}`} />
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-normal leading-normal mt-1 leading-relaxed">
                        {sty.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. ASPECT RATIO */}
            <div className="bg-[#111113] border border-white/5 rounded-xl p-5 space-y-3 text-left">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                3. Select Ratio Format
              </span>
              <div className="grid grid-cols-4 gap-2.5">
                {(['1:1', '9:16', '4:3', '16:9'] as RatioType[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setSelectedRatio(ratio)}
                    className={`py-2 px-3 border text-[11px] font-mono font-bold rounded transition-all cursor-pointer ${
                      selectedRatio === ratio 
                        ? 'bg-[#FC5200]/10 border-[#FC5200] text-[#FC5200]' 
                        : 'border-white/10 hover:border-white/20 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <span>{ratio}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. VISUAL CONFIGURATORS (COLORS AND THICKNESS) */}
            <div className="bg-[#111113] border border-white/5 rounded-xl p-5 space-y-4 text-left">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                4. Fine-Tune Palette & Stroke Options
              </span>

              {/* BACKGROUND COLOR */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10.5px] text-zinc-400 font-mono font-extrabold uppercase">Background Hex</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-5 h-5 rounded overflow-hidden cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={bgColor.toUpperCase()}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="bg-zinc-950 border border-white/10 text-zinc-300 rounded px-2 py-0.5 text-[10px] font-mono tracking-wider w-20 uppercase font-black"
                    />
                  </div>
                </div>
                
                {/* Background color chip options */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {BACKGROUND_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setBgColor(p.value)}
                      className="w-5 h-5 rounded-full border border-white/20 relative cursor-pointer"
                      style={{ backgroundColor: p.value }}
                      title={p.name}
                    >
                      {bgColor === p.value && (
                        <span className="absolute inset-0 bg-white/25 rounded-full block animate-ping" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ROUTE LINE COLOR */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10.5px] text-zinc-400 font-mono font-extrabold uppercase">Route Line Hex</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="w-5 h-5 rounded overflow-hidden cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={lineColor.toUpperCase()}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="bg-zinc-950 border border-white/10 text-zinc-300 rounded px-2 py-0.5 text-[10px] font-mono tracking-wider w-20 uppercase font-black"
                    />
                  </div>
                </div>

                {/* Line color presets */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {LINE_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setLineColor(p.value)}
                      className="w-5 h-5 rounded-full border border-white/20 relative cursor-pointer"
                      style={{ backgroundColor: p.value }}
                      title={p.name}
                    >
                      {lineColor === p.value && (
                        <span className="absolute inset-0 bg-white/25 rounded-full block animate-ping" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* LINE THICKNESS SLIDER */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase font-bold">
                  <span>Stroke Line Weight</span>
                  <span className="text-white font-black">{lineThickness} PX</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="0.5"
                  value={lineThickness}
                  onChange={(e) => setLineThickness(parseFloat(e.target.value))}
                  className="w-full accent-[#FC5200] cursor-ew-resize bg-zinc-850 h-1.5 rounded-lg"
                />
              </div>
            </div>

            {/* 5. DATA DISPLAY OVERLAYS */}
            <div className="bg-[#111113] border border-white/5 rounded-xl p-5 space-y-3.5 text-left">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                5. Configure Overlaid Text Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2.5 font-mono text-[10.5px] text-zinc-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTitle}
                    onChange={(e) => setShowTitle(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-800 text-[#FC5200] bg-zinc-950 focus:ring-0 cursor-pointer"
                  />
                  <span>Show Activity Title</span>
                </label>

                <label className="flex items-center gap-2.5 font-mono text-[10.5px] text-zinc-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(e) => setShowDate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-800 text-[#FC5200] bg-zinc-950 focus:ring-0 cursor-pointer"
                  />
                  <span>Show Start Date</span>
                </label>

                <label className="flex items-center gap-2.5 font-mono text-[10.5px] text-zinc-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDistance}
                    onChange={(e) => setShowDistance(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-800 text-[#FC5200] bg-zinc-950 focus:ring-0 cursor-pointer"
                  />
                  <span>Show Distance Stat</span>
                </label>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <span className="text-[9.5px] text-zinc-500 font-mono font-bold uppercase">Athlete Credit Sig</span>
                <input
                  type="text"
                  maxLength={32}
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value.toUpperCase())}
                  placeholder="ATHLETE NAME SIGNATURE"
                  className="w-full bg-zinc-950 border border-white/10 text-zinc-300 text-[10.5px] font-mono p-2 rounded focus:outline-none focus:border-[#FC5200] uppercase font-bold"
                />
              </div>
            </div>

            {/* 6. INSTANT DRAWER TRIGGERS */}
            <div className="bg-[#111113] border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row gap-3">
              <button
                id="copy-img-btn"
                onClick={handleCopyClipboard}
                disabled={isExporting || parseErrorMsg !== null || !selectedActivity}
                className="flex-1 py-3 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-bold uppercase font-mono tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Image</span>
              </button>

              {hasStorage && (
                <button
                  onClick={handleSaveToLibrary}
                  disabled={isExporting || parseErrorMsg !== null || !selectedActivity}
                  className="flex-1 py-3 border border-[#FC5200]/20 hover:border-[#FC5200]/50 text-[#FC5200] hover:text-white hover:bg-[#FC5200]/10 text-xs font-bold uppercase font-mono tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Database className="w-4 h-4" />
                  <span>Save to Library</span>
                </button>
              )}

              <button
                id="save-png-btn"
                onClick={handleSavePng}
                disabled={isExporting || parseErrorMsg !== null || !selectedActivity}
                className="flex-1 py-3 bg-[#FC5200] hover:bg-[#ff6414] text-white text-xs font-black uppercase font-mono tracking-wider rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Save PNG Poster</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
