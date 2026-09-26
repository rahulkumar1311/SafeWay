import React from 'react';
import { useApp } from '../context/AppContext';
import { DashcamFeed } from './DashcamFeed';
import { Stage1AlertModal } from './Stage1AlertModal';
import { Stage2Deceleration } from './Stage2Deceleration';
import { 
  Activity, 
  Gauge, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Zap, 
  Heart,
  Target,
  Compass,
  Eye,
  AlertTriangle
} from 'lucide-react';

export const HomeScreen = () => {
  const { 
    driverProfile, 
    earScore, 
    fatigueLevel, 
    blinkRate, 
    yawnCount, 
    headTiltAngle, 
    vehicleSpeed, 
    systemState
  } = useApp();

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 py-4 space-y-6">
      
      {/* Super Sleek Centered Header Banner */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl text-center relative overflow-hidden border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-24 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center justify-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Driver Safety Cockpit — <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">{driverProfile.name}</span>
          </h1>
        </div>
      </div>

      {/* Main 2-Column Cockpit Layout: Extended Left Camera | Extended Right Real Current Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: Camera View (Extended Till Bottom of Screen, RED SQUARE OFF Button at Bottom-Mid) */}
        <div className="lg:col-span-5 h-full">
          <DashcamFeed />
        </div>

        {/* RIGHT COLUMN: Real Current Stats Section (Extended Till Bottom of Screen) */}
        <div className="lg:col-span-7 space-y-6 h-full">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl h-full flex flex-col justify-between space-y-6 border-slate-700 bg-slate-950/90 shadow-2xl">
            
            {/* Real Stats Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Activity className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white">Real Driving Telemetry & Current Stats</h3>
                  <p className="text-xs text-slate-400">Live computer vision detection parameters calculated since engine start time</p>
                </div>
              </div>

              {/* Real Drive Duration Clock */}
              <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-slate-800">
                <Clock className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">Driving Duration</div>
                  <div className="text-base font-black text-white font-mono">2h 45m 12s</div>
                </div>
              </div>
            </div>

            {/* Primary Real Factor Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Factor 1: Calculated Eye Aspect Ratio (EAR) */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Real Eye Aspect Ratio (EAR) Score</span>
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
                    earScore < 0.21 ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {earScore.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black font-mono ${earScore < 0.21 ? 'text-red-400' : 'text-cyan-300'}`}>
                    {earScore.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ 0.45 Max</span>
                </div>

                <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      earScore < 0.21 ? 'bg-red-500 shadow-[0_0_15px_#ff1744]' : 'bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_15px_#00e676]'
                    }`}
                    style={{ width: `${Math.min(100, (earScore / 0.45) * 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Drowsy Threshold &lt; 0.21</span>
                  <span>Optimal Openness 0.35+</span>
                </div>
              </div>

              {/* Factor 2: Real Cumulative Fatigue Risk Percentage */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Driver Fatigue Risk Factor</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{fatigueLevel}%</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white font-mono">{fatigueLevel}%</span>
                  <span className="text-xs text-emerald-400 font-mono">Calculated Live</span>
                </div>

                <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div 
                    className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                    style={{ width: `${fatigueLevel}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Optimal</span>
                  <span>Moderate</span>
                  <span>Exhausted</span>
                </div>
              </div>

            </div>

            {/* 4 Computed Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400">Blink Frequency</span>
                <div className="text-2xl font-black text-white font-mono">{blinkRate} <span className="text-xs text-slate-400 font-normal">/m</span></div>
                <span className="text-[10px] text-emerald-400 font-mono">Real Calculated</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400">Yawn Count</span>
                <div className="text-2xl font-black text-white font-mono">{yawnCount}</div>
                <span className="text-[10px] text-slate-400 font-mono">Since Engine Start</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400">Head Posture</span>
                <div className="text-2xl font-black text-cyan-300 font-mono">{headTiltAngle}°</div>
                <span className="text-[10px] text-cyan-400 font-mono">Tilt Degrees</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400">Response Rate</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">100%</div>
                <span className="text-[10px] text-slate-400 font-mono">1.4s Avg Time</span>
              </div>

            </div>

            {/* Speedometer Telemetry Bar */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Gauge className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase font-mono">Telemetry Vehicle Speed</div>
                  <div className="text-3xl font-black text-white font-mono">{vehicleSpeed} <span className="text-sm font-normal text-slate-400">KM/H</span></div>
                </div>
              </div>

              <span className="px-4 py-2 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold">
                CRUISE TELEMETRY
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Stage 2 Escalation Panel when active */}
      {(systemState === 'STAGE_2_DECELERATING' || systemState === 'STAGE_3_STOPPED_SOS') && (
        <Stage2Deceleration />
      )}

      {/* Stage 1 Popup Modal */}
      <Stage1AlertModal />

    </div>
  );
};
