'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Lock, 
  MapPin, 
  Heart, 
  Zap, 
  HelpCircle, 
  Activity, 
  Calendar, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ExportCardPayload } from '../../lib/export/exportPayload';
import { EXPORT_TEMPLATES, validateTemplate } from '../../lib/export/exportValidation';
import ExportCanvas from './ExportCanvas';

interface ExportCardStudioProps {
  payload: ExportCardPayload;
  isOpen: boolean;
  onClose: () => void;
  preferredUnits?: 'metric' | 'imperial';
}

type RatioType = '1:1' | '9:16' | '4:3' | '16:9';
type CategoryFilter = 'All' | 'Minimal' | 'Editorial' | 'Consumer' | 'Brutalist' | 'Map';

export default function ExportCardStudio({
  payload,
  isOpen,
  onClose,
  preferredUnits = 'metric'
}: ExportCardStudioProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [selectedRatio, setSelectedRatio] = useState<RatioType>('1:1');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('minimal-performance');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'info'>('info');

  const isMetric = preferredUnits !== 'imperial';

  // Automatically reset template if it is not supported in the selected payload
  useEffect(() => {
    const valid = validateTemplate(selectedTemplateId, payload);
    if (!valid.allowed) {
      // Find first valid template in payload
      const firstValid = EXPORT_TEMPLATES.find(t => validateTemplate(t.id, payload).allowed);
      if (firstValid) {
        setSelectedTemplateId(firstValid.id);
      }
    }
  }, [payload, selectedTemplateId]);

  // Derived height based on selected aspect ratio
  const ratioHeight = useMemo(() => {
    switch (selectedRatio) {
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
  }, [selectedRatio]);

  // Filter templates based on selected category tab
  const filteredTemplates = useMemo(() => {
    return EXPORT_TEMPLATES.filter(t => {
      if (categoryFilter === 'All') return true;
      return t.category === categoryFilter;
    });
  }, [categoryFilter]);

  // Handle triggering dynamic saving of the high-res SVG canvas to high-quality local PNG file
  const handleSavePng = () => {
    if (!svgRef.current) {
      triggerFeedback('Could not fetch vector canvas.', 'error');
      return;
    }

    setIsExporting(true);
    triggerFeedback('Compiling graphic canvas at 1080px base...', 'info');

    try {
      const svgElement = svgRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
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
          triggerFeedback('Failed to access canvas graphics context.', 'error');
          setIsExporting(false);
          return;
        }

        // Fill background with solid black to avoid transparent artifact outlines
        ctx.fillStyle = '#111113';
        ctx.fillRect(0, 0, 1080, ratioHeight);

        // Draw image layer
        ctx.drawImage(img, 0, 0);
        
        // Export to high res PNG download trigger
        const pngUrl = canvas.toDataURL('image/png', 1.0);
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const filename = `${payload.athleteName.toLowerCase().replace(/\s+/g, '_')}_${selectedTemplateId}_${selectedRatio.replace(':', 'x')}_${timestamp}.png`;
        
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URLRef.revokeObjectURL(blobUrl);
        setIsExporting(false);
        triggerFeedback('PNG card saved successfully to downloads!', 'success');
      };

      img.onerror = () => {
        setIsExporting(false);
        triggerFeedback('Drawing error. Please secure standard browser parameters.', 'error');
      };

      img.src = blobUrl;
    } catch (err: any) {
      console.error('PNG conversion failure:', err);
      setIsExporting(false);
      triggerFeedback('Export blocked. Please retry formatting.', 'error');
    }
  };

  // Handle copying high resolution PNG directly into active system clipboard
  const handleCopyImageToClipboard = async () => {
    if (!svgRef.current) {
      triggerFeedback('Vector source canvas missing.', 'error');
      return;
    }

    // Standard check for Safari / Chromium Clipboard Item support
    if (!navigator.clipboard || !window.ClipboardItem) {
      triggerFeedback('Direct clipboard writing is not supported in this browser sequence.', 'error');
      return;
    }

    setIsExporting(true);
    triggerFeedback('Rendering layout segment to copy clipboard...', 'info');

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
          triggerFeedback('Failed context assignment.', 'error');
          setIsExporting(false);
          return;
        }

        ctx.fillStyle = '#111113';
        ctx.fillRect(0, 0, 1080, ratioHeight);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            triggerFeedback('Blob compiler fault.', 'error');
            setIsExporting(false);
            return;
          }

          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            URLRef.revokeObjectURL(blobUrl);
            setIsExporting(false);
            triggerFeedback('PNG copied directly to system clipboard!', 'success');
          } catch (clipErr: any) {
            console.error('Clipboard error:', clipErr);
            setIsExporting(false);
            triggerFeedback('Security restriction blocked direct paste. Use Save PNG instead.', 'error');
          }
        }, 'image/png', 1.0);
      };

      img.onerror = () => {
        setIsExporting(false);
        triggerFeedback('Image decoder fault.', 'error');
      };

      img.src = blobUrl;
    } catch (err: any) {
      console.error('Clipboard processing crash:', err);
      setIsExporting(false);
      triggerFeedback('Image copying process was interrupted.', 'error');
    }
  };

  const triggerFeedback = (msg: string, type: 'success' | 'error' | 'info') => {
    setFeedbackMessage(msg);
    setFeedbackType(type);
    
    // Auto clear feedback
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        id="export-card-modal"
        className="bg-[#111113] border border-white/10 rounded-xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-zinc-100 shadow-2xl"
      >
        {/* MODAL HEADER */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-[#FC5200]/10 border border-[#FC5200]/20 text-[#FC5200] rounded">
              <Activity className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide font-mono leading-none">Export Card Studio</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1 font-bold">
                Render high resolution 1080px training graphic summary cards from canonical fitness streams
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border border-white/10 hover:border-white/20 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FEEDBACK ROW */}
        {feedbackMessage && (
          <div className={`px-6 py-3 border-b text-[11px] font-mono font-bold uppercase flex items-center gap-2 items-center tracking-wide duration-200 transition-all ${
            feedbackType === 'success' ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' :
            feedbackType === 'error' ? 'bg-red-950/20 border-red-900/50 text-red-400' :
            'bg-[#FC5200]/10 border-[#FC5200]/20 text-[#FC5200]'
          }`}>
            {feedbackType === 'success' && <CheckCircle className="w-3.5 h-3.5 shrink-0" />}
            {feedbackType === 'error' && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {feedbackType === 'info' && <Activity className="w-3.5 h-3.5 shrink-0 animate-spin" />}
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* WORKSPACE VIEWPORT */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* ASPECT RATIO PREVIEW AND CANVAS COL (LEFT) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4 bg-black/40 border border-white/5 rounded-lg p-5">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono block mb-2">
                Card Vector Preview (Interactive Scaling)
              </span>
              
              {/* Responsive Container Scaling the 1080px base inside the viewport */}
              <div className="w-full flex items-center justify-center bg-zinc-950 border border-zinc-900/85 rounded-lg overflow-hidden p-6 min-h-[360px]">
                <div 
                  className="relative shadow-2xl border border-white/15 bg-zinc-900 overflow-hidden transition-all duration-300"
                  style={{
                    width: 'min(100%, 350px)',
                    aspectRatio: `1080 / ${ratioHeight}`
                  }}
                >
                  <ExportCanvas 
                    payload={payload}
                    templateId={selectedTemplateId}
                    ratio={selectedRatio}
                    isMetric={isMetric}
                    svgRef={svgRef}
                  />
                </div>
              </div>
            </div>

            {/* QUICK INFORMATION BAR */}
            <div className="grid grid-cols-2 gap-3 bg-[#111113] p-4 border border-white/5 rounded text-left font-mono text-[10px]">
              <div>
                <span className="text-zinc-500 uppercase font-bold block">Base Dimensions</span>
                <span className="text-white mt-1 block font-bold">1080 x {ratioHeight} PX</span>
              </div>
              <div>
                <span className="text-zinc-500 uppercase font-bold block">Source Method</span>
                <span className="text-[#FC5200] mt-1 block font-bold">{payload.source.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* STUDIO CONTROL AND SPECIFICATIONS CENTER COL (RIGHT) */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            
            {/* Aspect Ratio Picker selection block */}
            <div className="space-y-3">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                1. Select Ratio Format
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['1:1', '9:16', '4:3', '16:9'] as RatioType[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRatio(r)}
                    className={`py-2 px-3 border text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                      selectedRatio === r 
                        ? 'bg-[#FC5200]/10 border-[#FC5200] text-[#FC5200]' 
                        : 'border-white/10 hover:border-white/20 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <span>{r}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template filter/category selection tabs block */}
            <div className="space-y-3">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                2. Filter Category
              </span>
              <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
                {(['All', 'Minimal', 'Editorial', 'Consumer', 'Brutalist', 'Map'] as CategoryFilter[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase border-b-2 transition-all cursor-pointer ${
                      categoryFilter === cat 
                        ? 'border-[#FC5200] text-white font-black' 
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selector Grid */}
            <div className="space-y-3 flex-1 min-h-[220px] flex flex-col">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono block">
                3. Choose Card Artwork Template ({filteredTemplates.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[360px] pr-1.5 flex-1 select-none">
                {filteredTemplates.map((t) => {
                  const check = validateTemplate(t.id, payload);
                  const isSelected = selectedTemplateId === t.id;
                  
                  return (
                    <button
                      key={t.id}
                      disabled={!check.allowed}
                      onClick={() => {
                        if (check.allowed) setSelectedTemplateId(t.id);
                      }}
                      className={`p-3 border rounded text-left transition-all relative flex flex-col justify-between h-[105px] disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected 
                          ? 'border-[#FC5200] bg-[#FC5200]/5' 
                          : 'border-white/10 hover:border-white/20 hover:bg-zinc-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase font-mono ${isSelected ? 'text-[#FC5200]' : 'text-white'}`}>
                            {t.name}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase border border-white/5 bg-zinc-950 px-1.5 py-0.5 rounded leading-none font-bold">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-normal leading-relaxed font-semibold">
                          {t.description}
                        </p>
                      </div>

                      {/* Locked gate label if missing required payload values */}
                      {!check.allowed ? (
                        <div className="mt-1 flex items-center gap-1.5 text-rose-450 font-mono text-[9px] font-bold leading-none">
                          <Lock className="w-3 h-3 text-red-500" />
                          <span className="text-red-400">{check.reason?.toUpperCase()}</span>
                        </div>
                      ) : (
                        isSelected && (
                          <div className="mt-1 flex items-center gap-1.5 text-[#FC5200] font-mono text-[9px] font-bold leading-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FC5200] animate-ping" />
                            <span>ACTIVE SELECTION</span>
                          </div>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ACTION TRIGGERS SUBMISSION PANEL */}
            <div className="border-t border-white/10 pt-5 mt-auto flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyImageToClipboard}
                disabled={isExporting}
                className="flex-1 py-3 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-bold uppercase font-mono tracking-wider rounded flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Image</span>
              </button>

              <button
                onClick={handleSavePng}
                disabled={isExporting}
                className="flex-1 py-3 bg-[#FC5200] hover:bg-[#ff6414] text-white text-xs font-black uppercase font-mono tracking-wider rounded flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Save PNG Card</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
