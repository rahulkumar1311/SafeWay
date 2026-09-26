import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldAlert, 
  Car, 
  MapPin, 
  CheckCircle2, 
  AlertOctagon, 
  Radio, 
  Gauge,
  Navigation
} from 'lucide-react';

export const Stage2Deceleration = () => {
  const { systemState, vehicleSpeed, sosSent, resetSystem } = useApp();

  if (systemState !== 'STAGE_2_DECELERATING' && systemState !== 'STAGE_3_STOPPED_SOS') {
    return null;
  }

  const isStopped = systemState === 'STAGE_3_STOPPED_SOS';

  return (
    <div className="glass-panel p-7 rounded-3xl space-y-6 relative overflow-hidden border-red-500/50 shadow-2xl">
      
      {/* Top Banner Alert */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-red-950/40 border border-red-500/60 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs font-black text-red-400 uppercase tracking-wider font-mono">
              {isStopped ? 'STAGE 3: CONTROLLED STOP COMPLETE' : 'STAGE 2: AUTONOMOUS ESCALATION ACTIVE'}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
              {isStopped ? 'Vehicle Safely Parked on Shoulder' : 'Gradual Deceleration & Safe Lane Pull-Over'}
            </h3>
          </div>
        </div>

        {isStopped && (
          <button
            onClick={resetSystem}
            className="glass-button glass-button-success text-xs py-3 px-5 whitespace-nowrap shadow-lg shadow-emerald-500/20"
          >
            <span>RESET SYSTEM TO NORMAL</span>
          </button>
        )}
      </div>

      {/* Animated Highway Deceleration View */}
      <div className="relative w-full h-60 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl">
        
        {/* Highway Lanes Motion Lines */}
        <div className="absolute inset-0 bg-slate-950 flex justify-around">
          <div className="w-2 h-full bg-slate-800"></div>
          <div className="w-2 h-full border-r-2 border-dashed border-cyan-500/40"></div>
          <div className="w-2 h-full border-r-2 border-dashed border-amber-500/40"></div>
          <div className="w-2 h-full bg-emerald-950/80 border-l-2 border-emerald-500 shadow-[0_0_15px_#00e676]"></div>
        </div>

        {/* Hazard Flasher Overlay */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-950/90 px-3.5 py-2 rounded-xl border border-amber-500/50 text-amber-300 text-xs font-mono font-bold animate-pulse shadow">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          <span>EMERGENCY HAZARD LIGHTS: ACTIVE</span>
        </div>

        {/* Safe Spot Badge */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-950/90 px-3.5 py-2 rounded-xl border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold shadow">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>SAFE SHOULDER LANE DETECTED</span>
        </div>

        {/* Vehicle Icon Visualizer Navigating to Shoulder */}
        <div 
          className="relative z-10 transition-all duration-700 flex flex-col items-center gap-2.5"
          style={{
            transform: isStopped ? 'translateX(140px)' : `translateX(${Math.min(140, (85 - vehicleSpeed) * 1.6)}px)`
          }}
        >
          <div className="p-4 rounded-2xl bg-slate-900 border-2 border-red-500 shadow-[0_0_40px_rgba(255,23,68,0.6)] relative">
            <Car className="w-11 h-11 text-white" />
            
            {/* Blinking Hazard Lights */}
            <div className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping"></div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping"></div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-slate-950/95 text-cyan-300 px-2.5 py-1 rounded-md border border-slate-700 shadow">
            DRIVE SAFE VEHICLE
          </span>
        </div>

        {/* Speedometer Telemetry */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-slate-950/95 p-3.5 rounded-2xl border border-slate-800 shadow-2xl">
          <Gauge className="w-7 h-7 text-cyan-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-mono font-bold">TELEMETRY SPEED</div>
            <div className="text-3xl font-black text-white font-mono">
              {vehicleSpeed} <span className="text-xs text-slate-400 font-normal">KM/H</span>
            </div>
          </div>
        </div>

      </div>

      {/* Progress Telemetry Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className={`p-4 rounded-2xl border transition-all ${
          vehicleSpeed < 85 ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10' : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="text-xs font-black font-mono">01. LANE POSITIONING</div>
          <div className="text-sm font-bold mt-1">Autonomous Safe Shoulder Alignment</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          vehicleSpeed < 40 ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10' : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="text-xs font-black font-mono">02. DECELERATION</div>
          <div className="text-sm font-bold mt-1">Regenerative Smooth Braking</div>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${
          isStopped ? 'bg-red-950/40 border-red-500/60 text-red-200 shadow-md shadow-red-500/10' : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <div className="text-xs font-black font-mono">03. CONTROLLED STOP & SOS</div>
          <div className="text-sm font-bold mt-1">Parking Brake & Emergency SOS</div>
        </div>

      </div>

    </div>
  );
};

