/**
 * Presentation: MobileFrame
 * Device shell with simulated mobile status bar, dynamic island, and view mode toggle (Mobile Frame vs Fullscreen)
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 md:p-6 overflow-hidden">
      {/* DESKTOP TOP BAR (Only visible on wide screens) */}
      <div className="hidden md:flex items-center justify-between w-full max-w-md mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">
            CamScan Mobile Simulator
          </span>
        </div>

        <button
          onClick={() => setIsPhoneFrame(!isPhoneFrame)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition"
        >
          {isPhoneFrame ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-teal-400" />
              <span>Fullscreen Mode</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-teal-400" />
              <span>Mobile Phone Frame</span>
            </>
          )}
        </button>
      </div>

      {/* CONTAINER */}
      <div
        className={`relative w-full h-[100dvh] transition-all duration-300 flex flex-col overflow-hidden ${
          isPhoneFrame
            ? 'md:max-w-[430px] md:h-[890px] md:rounded-[48px] md:border-[10px] md:border-slate-800/90 md:shadow-[0_25px_70px_rgba(0,0,0,0.85)] md:ring-1 md:ring-white/10'
            : 'max-w-4xl h-[100dvh] md:h-[90vh] md:rounded-3xl md:border md:border-slate-800 md:shadow-2xl'
        }`}
      >
        {/* MOBILE SIMULATED STATUS BAR (Always visible or in mobile frame) */}
        <div className="relative z-40 w-full px-7 pt-2.5 pb-1 bg-black text-white flex items-center justify-between text-xs select-none">
          <span className="font-semibold text-[13px] tracking-tight">{currentTime}</span>

          {/* Dynamic Island Pill (iPhone style) */}
          <div className="w-24 h-5 bg-black rounded-full border border-slate-900 flex items-center justify-center gap-2 px-2 shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
            <div className="w-2 h-2 rounded-full bg-teal-500/80 animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center">
              <span className="text-[10px] mr-0.5 font-mono">100%</span>
              <Battery className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            </div>
          </div>
        </div>

        {/* APP CORE CONTENT */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-slate-950">
          {children}
        </div>

        {/* MOBILE HOME INDICATOR BAR */}
        <div className="relative z-40 w-full py-1.5 bg-black flex items-center justify-center pointer-events-none select-none">
          <div className="w-32 h-1 bg-white/40 rounded-full" />
        </div>
      </div>
    </div>
  );
};
