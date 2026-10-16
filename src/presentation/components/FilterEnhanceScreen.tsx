/**
 * Presentation: FilterEnhanceScreen
 * Image enhancement filters: Magic Color, B&W, Grayscale, Lighten, Brightness/Contrast/Sharpness sliders
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Wand2,
  Sliders,
  RotateCw,
  Eye,
  Check,
  ChevronLeft,
  Sparkles,
  Sun,
  Contrast,
  Zap,
} from 'lucide-react';
import { FilterSettings, FilterType } from '../../domain/models';
import { applyImageFilters, rotateCanvas } from '../../domain/transform';

interface FilterEnhanceScreenProps {
  warpedCanvas: HTMLCanvasElement;
  onConfirm: (processedDataUrl: string, settings: FilterSettings) => void;
  onBack: () => void;
  isNewPage?: boolean;
}

interface FilterOption {
  id: FilterType;
  label: string;
  tag: string;
  iconBg: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'magic', label: 'Magic Color', tag: 'Recommended', iconBg: 'from-teal-500 to-emerald-500' },
  { id: 'bw', label: 'B&W Doc', tag: 'High Contrast', iconBg: 'from-slate-700 to-slate-900' },
  { id: 'grayscale', label: 'Grayscale', tag: 'Monochrome', iconBg: 'from-slate-400 to-slate-600' },
  { id: 'lighten', label: 'Lighten', tag: 'Shadow Removal', iconBg: 'from-amber-400 to-orange-400' },
  { id: 'blueprint', label: 'Blueprint', tag: 'Inverted', iconBg: 'from-blue-600 to-indigo-800' },
  { id: 'original', label: 'Original', tag: 'No Filter', iconBg: 'from-slate-600 to-slate-700' },
];

export const FilterEnhanceScreen: React.FC<FilterEnhanceScreenProps> = ({
  warpedCanvas,
  onConfirm,
  onBack,
  isNewPage = false,
}) => {
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentBaseCanvas, setCurrentBaseCanvas] = useState<HTMLCanvasElement>(warpedCanvas);

  const [settings, setSettings] = useState<FilterSettings>({
    filterType: 'magic',
    brightness: 0,
    contrast: 0,
    sharpness: 25,
    threshold: 135,
  });

  const [activeTab, setActiveTab] = useState<'filters' | 'adjust'>('filters');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Render processed image whenever settings or baseCanvas change
  const renderProcessed = useCallback(() => {
    if (!displayCanvasRef.current) return;

    const targetCanvas = isComparing
      ? currentBaseCanvas
      : applyImageFilters(currentBaseCanvas, settings);

    const out = displayCanvasRef.current;
    out.width = targetCanvas.width;
    out.height = targetCanvas.height;
    const ctx = out.getContext('2d');
    if (ctx) {
      ctx.drawImage(targetCanvas, 0, 0);
    }
  }, [currentBaseCanvas, settings, isComparing]);

  useEffect(() => {
    renderProcessed();
  }, [renderProcessed]);

  // Rotate canvas 90 degrees
  const handleRotate = () => {
    const rotated = rotateCanvas(currentBaseCanvas, 90);
    setCurrentBaseCanvas(rotated);
  };

  // Final confirm
  const handleFinish = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const finalCanvas = applyImageFilters(currentBaseCanvas, settings);
      const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.94);
      setIsProcessing(false);
      onConfirm(dataUrl, settings);
    }, 40);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none">
      {/* TOP BAR */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition active:scale-95 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Crop</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Compare Button (Hold to see original) */}
          <button
            onMouseDown={() => setIsComparing(true)}
            onMouseUp={() => setIsComparing(false)}
            onTouchStart={() => setIsComparing(true)}
            onTouchEnd={() => setIsComparing(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
              isComparing
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Hold to view original"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isComparing ? 'Original' : 'Compare'}</span>
          </button>

          {/* Rotate 90 Button */}
          <button
            onClick={handleRotate}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition active:scale-95"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleFinish}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 font-semibold text-white text-xs shadow-md shadow-teal-500/25 active:scale-95 transition"
        >
          {isProcessing ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>{isNewPage ? 'Add Page' : 'Save'}</span>
        </button>
      </div>

      {/* DOCUMENT PREVIEW CANVAS */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden bg-slate-950">
        <div className="relative max-w-full max-h-[66vh] flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-slate-800">
          <canvas
            ref={displayCanvasRef}
            className="max-w-full max-h-[66vh] object-contain rounded-md block bg-white"
          />

          {isComparing && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-amber-500/90 text-slate-950 text-[11px] font-bold shadow-md">
              Original Unprocessed
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CONTROLS TABS (Filters vs Manual Adjustments) */}
      <div className="relative z-20 bg-slate-900 border-t border-slate-800 flex flex-col">
        {/* Tab switch header */}
        <div className="flex border-b border-slate-800/80 px-4">
          <button
            onClick={() => setActiveTab('filters')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'filters'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Preset Filters</span>
          </button>
          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'adjust'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Fine Tune Sliders</span>
          </button>
        </div>

        {/* TAB 1: FILTERS CAROUSEL */}
        {activeTab === 'filters' && (
          <div className="p-4 flex items-center gap-3 overflow-x-auto">
            {FILTER_OPTIONS.map((f) => {
              const isSelected = settings.filterType === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSettings((prev) => ({ ...prev, filterType: f.id }))}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl min-w-[84px] transition active:scale-95 ${
                    isSelected
                      ? 'bg-teal-500/15 border-2 border-teal-400 shadow-md shadow-teal-500/10'
                      : 'bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${f.iconBg} flex items-center justify-center shadow-inner text-white`}
                  >
                    {f.id === 'magic' && <Sparkles className="w-6 h-6 text-yellow-300" />}
                    {f.id === 'bw' && <span className="font-bold text-sm tracking-tighter">B&W</span>}
                    {f.id === 'grayscale' && <span className="font-bold text-sm">GRAY</span>}
                    {f.id === 'lighten' && <Sun className="w-6 h-6 text-white" />}
                    {f.id === 'blueprint' && <span className="font-mono text-xs font-bold">BLUE</span>}
                    {f.id === 'original' && <span className="font-bold text-xs">RAW</span>}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-teal-300' : 'text-slate-300'
                    }`}
                  >
                    {f.label}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-tight">
                    {f.tag}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 2: FINE TUNE SLIDERS */}
        {activeTab === 'adjust' && (
          <div className="p-4 space-y-3.5 max-h-48 overflow-y-auto">
            {/* Brightness */}
            <div className="flex items-center gap-3">
              <div className="w-24 flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Brightness</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={settings.brightness}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, brightness: Number(e.target.value) }))
                }
                className="flex-1 accent-teal-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <span className="w-8 text-right text-xs font-mono text-slate-400">
                {settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}
              </span>
            </div>

            {/* Contrast */}
            <div className="flex items-center gap-3">
              <div className="w-24 flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <Contrast className="w-3.5 h-3.5 text-teal-400" />
                <span>Contrast</span>
              </div>
              <input
                type="range"
                min={-50}
                max={50}
                value={settings.contrast}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, contrast: Number(e.target.value) }))
                }
                className="flex-1 accent-teal-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <span className="w-8 text-right text-xs font-mono text-slate-400">
                {settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}
              </span>
            </div>

            {/* Sharpness */}
            <div className="flex items-center gap-3">
              <div className="w-24 flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>Sharpness</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.sharpness}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, sharpness: Number(e.target.value) }))
                }
                className="flex-1 accent-teal-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <span className="w-8 text-right text-xs font-mono text-slate-400">
                {settings.sharpness}%
              </span>
            </div>

            {/* B&W Threshold (when B&W filter is active) */}
            {settings.filterType === 'bw' && (
              <div className="flex items-center gap-3">
                <div className="w-24 flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>B&W Cutoff</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={settings.threshold ?? 135}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, threshold: Number(e.target.value) }))
                  }
                  className="flex-1 accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <span className="w-8 text-right text-xs font-mono text-slate-400">
                  {settings.threshold}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
