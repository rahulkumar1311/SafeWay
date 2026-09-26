import React from 'react';
import { useApp } from '../context/AppContext';
import { DashcamFeed } from './DashcamFeed';
import { Stage1AlertModal } from './Stage1AlertModal';
import { Stage2Deceleration } from './Stage2Deceleration';
import { Bell, RefreshCw } from 'lucide-react';

export const SafetyDashboardScreen = () => {
  const { earScore, fatigueLevel, vehicleSpeed, blinkRate, triggerStage1, resetSystem } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
      
      {/* Alert Overlays */}
      <Stage1AlertModal />
      <Stage2Deceleration />

      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            AI Computer Vision Safety Telemetry
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time Eye Aspect Ratio (EAR) & Fatigue Risk Tracker
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerStage1}
            className="glass-button glass-button-danger text-xs py-2.5 px-4"
          >
            <Bell className="w-4 h-4 text-red-300" />
            <span>TEST ALARM (5S)</span>
          </button>
          
          <button
            onClick={resetSystem}
            className="glass-button text-xs py-2.5 px-3.5 bg-slate-900 border-slate-700 text-slate-300"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Main Grid: AI Feed (Left) & Real-time Telemetry Gauges (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dashcam Feed View */}
        <div className="lg:col-span-7">
          <DashcamFeed />
        </div>

        {/* Telemetry Gauge Panel */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* EAR Gauge */}
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 font-mono">EYE ASPECT RATIO (EAR)</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                earScore < 0.20 ? 'bg-red-950 text-red-400 border border-red-500 animate-pulse' : 'bg-emerald-950 text-emerald-400 border border-emerald-500'
              }`}>
                {earScore < 0.20 ? 'DROWSY (< 0.20)' : 'AWAKE'}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className={`text-4xl font-black font-mono ${earScore < 0.20 ? 'text-red-400' : 'text-cyan-300'}`}>
                {earScore.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-mono">Threshold: 0.20</span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  earScore < 0.20 ? 'bg-red-500 shadow-[0_0_12px_#ff1744]' : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, earScore * 250)}%` }}
              ></div>
            </div>
          </div>

          {/* Fatigue Level Gauge */}
          <div className="glass-panel p-5 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 font-mono">FATIGUE THREAT RISK</span>
              <span className="text-xs text-slate-400 font-mono font-bold">{fatigueLevel}%</span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  fatigueLevel > 60 ? 'bg-red-500 shadow-[0_0_12px_#ff1744]' : fatigueLevel > 30 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${fatigueLevel}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Blink Rate: <strong className="text-white">{blinkRate}/min</strong></span>
              <span className="text-slate-400">Speed: <strong className="text-white">{vehicleSpeed} km/h</strong></span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
