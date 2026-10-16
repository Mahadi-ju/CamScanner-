/**
 * Presentation: CropPerspectiveScreen
 * Interactive 4-corner quad crop, auto edge detection, magnifier loupe, and perspective warp confirm
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  Sparkles,
  Maximize2,
  Check,
  ChevronLeft,
  Move,
  ScanLine,
} from 'lucide-react';
import { Point2D, QuadCorners } from '../../domain/models';
import {
  detectDocumentCorners,
  warpPerspective,
  rotateCanvas,
} from '../../domain/transform';

interface CropPerspectiveScreenProps {
  imageSrc: string;
  onConfirm: (warpedCanvas: HTMLCanvasElement, corners: QuadCorners) => void;
  onRetake: () => void;
}

export const CropPerspectiveScreen: React.FC<CropPerspectiveScreenProps> = ({
  imageSrc,
  onConfirm,
  onRetake,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [corners, setCorners] = useState<QuadCorners | null>(null);
  const [activeHandle, setActiveHandle] = useState<'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft' | null>(null);
  const [isWarping, setIsWarping] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);

  // Loupe magnifier state
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);

  // Load natural dimensions & run auto edge detection
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    setNaturalSize({ width: nw, height: nh });

    // Run auto edge detection
    const detected = detectDocumentCorners(img);
    setCorners(detected);
  };

  // Rotate source image 90 degrees
  const handleRotate = () => {
    if (!imageRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = imageRef.current.naturalWidth;
    canvas.height = imageRef.current.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(imageRef.current, 0, 0);

    const rotated = rotateCanvas(canvas, 90);
    const newSrc = rotated.toDataURL('image/jpeg', 0.95);

    setRotation((prev) => (prev + 90) % 360);
    if (imageRef.current) {
      imageRef.current.src = newSrc;
    }
  };

  // Reset to full bounds
  const handleExpandToFull = () => {
    if (!naturalSize.width || !naturalSize.height) return;
    setCorners({
      topLeft: { x: 0, y: 0 },
      topRight: { x: naturalSize.width, y: 0 },
      bottomRight: { x: naturalSize.width, y: naturalSize.height },
      bottomLeft: { x: 0, y: naturalSize.height },
    });
  };

  // Re-run auto edge detection
  const handleAutoDetect = () => {
    if (!imageRef.current) return;
    const detected = detectDocumentCorners(imageRef.current);
    setCorners(detected);
  };

  // Confirm and apply perspective warp
  const handleConfirmWarp = () => {
    if (!imageRef.current || !corners) return;
    setIsWarping(true);

    // Run in requestAnimationFrame or slight timeout for UI responsiveness
    setTimeout(() => {
      try {
        const warped = warpPerspective(imageRef.current!, corners);
        setIsWarping(false);
        onConfirm(warped, corners);
      } catch (err) {
        console.error('Perspective warp failed:', err);
        setIsWarping(false);
      }
    }, 50);
  };

  // Calculate screen-to-image coordinate mapping
  const getDisplayMetrics = useCallback(() => {
    if (!imageRef.current || !containerRef.current || !naturalSize.width) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / naturalSize.width;
    const scaleY = rect.height / naturalSize.height;

    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      scaleX,
      scaleY,
    };
  }, [naturalSize]);

  // Pointer drag handling for handles with Magnifier Loupe
  const handlePointerDown = (
    handle: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);

    const metrics = getDisplayMetrics();
    if (metrics) {
      setLoupePos({ x: e.clientX, y: e.clientY });
      updateLoupe(handle, e.clientX, e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !corners || !naturalSize.width) return;
    e.preventDefault();

    const metrics = getDisplayMetrics();
    if (!metrics) return;

    // Constrain to image bounds
    const screenX = e.clientX;
    const screenY = e.clientY;

    const imgX = Math.max(0, Math.min(naturalSize.width, Math.round((screenX - metrics.left) / metrics.scaleX)));
    const imgY = Math.max(0, Math.min(naturalSize.height, Math.round((screenY - metrics.top) / metrics.scaleY)));

    setCorners((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [activeHandle]: { x: imgX, y: imgY },
      };
    });

    setLoupePos({ x: screenX, y: screenY });
    updateLoupe(activeHandle, screenX, screenY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setActiveHandle(null);
      setLoupePos(null);
    }
  };

  // Update high-res loupe magnifier canvas
  const updateLoupe = (
    handle: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft',
    pointerScreenX: number,
    pointerScreenY: number
  ) => {
    if (!imageRef.current || !loupeCanvasRef.current || !corners) return;

    const loupeCanvas = loupeCanvasRef.current;
    const ctx = loupeCanvas.getContext('2d');
    if (!ctx) return;

    const cornerPoint = corners[handle];
    const zoom = 2.5;
    const loupeRadius = loupeCanvas.width / 2;

    ctx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);

    // Save for circular clipping
    ctx.save();
    ctx.beginPath();
    ctx.arc(loupeRadius, loupeRadius, loupeRadius, 0, Math.PI * 2);
    ctx.clip();

    // Draw zoomed portion
    const sx = cornerPoint.x - loupeRadius / zoom;
    const sy = cornerPoint.y - loupeRadius / zoom;
    const sw = loupeCanvas.width / zoom;
    const sh = loupeCanvas.height / zoom;

    ctx.drawImage(
      imageRef.current,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      loupeCanvas.width,
      loupeCanvas.height
    );

    // Draw Crosshairs
    ctx.strokeStyle = '#10b981'; // Emerald
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(loupeRadius, 0);
    ctx.lineTo(loupeRadius, loupeCanvas.height);
    ctx.moveTo(0, loupeRadius);
    ctx.lineTo(loupeCanvas.width, loupeRadius);
    ctx.stroke();

    // Center targeting ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(loupeRadius, loupeRadius, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  // Convert image coord to percentage string for CSS positioning
  const getPercentPos = (p: Point2D) => {
    if (!naturalSize.width || !naturalSize.height) return { left: '0%', top: '0%' };
    return {
      left: `${(p.x / naturalSize.width) * 100}%`,
      top: `${(p.y / naturalSize.height) * 100}%`,
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* TOP HEADER */}
      <div className="relative z-30 flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <button
          onClick={onRetake}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition active:scale-95 text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Retake</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5 text-teal-400" />
            <span>Perspective Crop</span>
          </div>
          <span className="text-[10px] text-slate-400">Drag 4 corners to fit document</span>
        </div>

        <button
          onClick={handleConfirmWarp}
          disabled={isWarping}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 font-semibold text-white text-xs shadow-md shadow-teal-500/25 active:scale-95 transition"
        >
          {isWarping ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>Confirm</span>
        </button>
      </div>

      {/* INTERACTIVE CROP CANVAS AREA */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden">
        <div className="relative max-w-full max-h-[72vh] flex items-center justify-center shadow-2xl rounded-lg">
          {/* Base image */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Scanned Document"
            onLoad={handleImageLoad}
            className="max-w-full max-h-[72vh] object-contain rounded-md block pointer-events-none select-none"
          />

          {/* SVG QUAD OVERLAY AND CORNER HANDLES */}
          {corners && naturalSize.width > 0 && (
            <div
              className="absolute inset-0 pointer-events-auto"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* SVG Polygon connecting the 4 corners */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                preserveAspectRatio="none"
              >
                {/* Translucent document area */}
                <polygon
                  points={`${corners.topLeft.x},${corners.topLeft.y} ${corners.topRight.x},${corners.topRight.y} ${corners.bottomRight.x},${corners.bottomRight.y} ${corners.bottomLeft.x},${corners.bottomLeft.y}`}
                  fill="rgba(20, 184, 166, 0.18)"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray="6,4"
                  className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />

                {/* Internal alignment cross */}
                <line
                  x1={(corners.topLeft.x + corners.bottomLeft.x) / 2}
                  y1={(corners.topLeft.y + corners.bottomLeft.y) / 2}
                  x2={(corners.topRight.x + corners.bottomRight.x) / 2}
                  y2={(corners.topRight.y + corners.bottomRight.y) / 2}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
                <line
                  x1={(corners.topLeft.x + corners.topRight.x) / 2}
                  y1={(corners.topLeft.y + corners.topRight.y) / 2}
                  x2={(corners.bottomLeft.x + corners.bottomRight.x) / 2}
                  y2={(corners.bottomLeft.y + corners.bottomRight.y) / 2}
                  stroke="rgba(255, 255, 255, 0.25)"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
              </svg>

              {/* 4 DRAGGABLE CORNER HANDLES */}
              {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((handle) => {
                const pos = getPercentPos(corners[handle]);
                const isActive = activeHandle === handle;

                return (
                  <div
                    key={handle}
                    style={{ left: pos.left, top: pos.top }}
                    onPointerDown={(e) => handlePointerDown(handle, e)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center cursor-move touch-none z-30 transition-transform ${
                      isActive ? 'scale-125' : 'hover:scale-110 active:scale-125'
                    }`}
                  >
                    {/* Outer glow ring */}
                    <div
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-500 text-white shadow-emerald-500/50'
                          : 'border-white bg-teal-600 text-white shadow-black/60'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FLOATING MAGNIFIER LOUPE */}
        {activeHandle && loupePos && (
          <div
            className="fixed pointer-events-none z-50 flex flex-col items-center transition-all duration-75"
            style={{
              left: `${loupePos.x}px`,
              top: `${Math.max(20, loupePos.y - 120)}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative w-28 h-28 rounded-full border-3 border-emerald-400 bg-slate-900 shadow-2xl overflow-hidden ring-4 ring-black/40">
              <canvas
                ref={loupeCanvasRef}
                width={112}
                height={112}
                className="w-full h-full block"
              />
            </div>
            <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400 -mt-0.5" />
          </div>
        )}
      </div>

      {/* BOTTOM TOOLBAR: Auto-Detect, Full Bounds, Rotate */}
      <div className="relative z-30 px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-around">
        <button
          onClick={handleAutoDetect}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition active:scale-95"
        >
          <div className="p-2 rounded-xl bg-slate-800 text-teal-400 hover:bg-slate-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Auto Detect</span>
        </button>

        <button
          onClick={handleExpandToFull}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition active:scale-95"
        >
          <div className="p-2 rounded-xl bg-slate-800 text-teal-400 hover:bg-slate-700">
            <Maximize2 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Full Image</span>
        </button>

        <button
          onClick={handleRotate}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition active:scale-95"
        >
          <div className="p-2 rounded-xl bg-slate-800 text-teal-400 hover:bg-slate-700">
            <RotateCw className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium">Rotate 90°</span>
        </button>
      </div>
    </div>
  );
};
