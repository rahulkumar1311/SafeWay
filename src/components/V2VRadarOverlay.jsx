import React from 'react';
import { useApp } from '../context/AppContext';
import { Radio, AlertTriangle, ShieldCheck, Car, Truck, Wifi, CheckCircle2 } from 'lucide-react';

export const V2VRadarOverlay = () => {
  const { nearbyVehicles, setNearbyVehicles, systemState, sosSent } = useApp();

  const handleBroadcastV2V = () => {
    setNearbyVehicles(prev => prev.map(v => ({ ...v, alerted: true })));
  };

  const isAlertingActive = systemState === 'STAGE_3_STOPPED_SOS' || sosSent;

  return (
    <div className="glass-panel p-7 rounded-3xl space-y-6 shadow-2xl">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`p-3.5 rounded-2xl border transition-all duration-300 ${
            isAlertingActive 
              ? 'bg-red-500/25 text-red-400 border-red-500/60 animate-pulse shadow-[0_0_20px_rgba(255,23,68,0.4)]' 
              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
          }`}>
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <span>200m Radius V2V Radar Broadcast</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800 font-mono font-bold">
                DSRC / C-V2X
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vehicle-to-Vehicle hazard warning transmission alerting nearby drivers to decelerate & avoid stopped vehicle.
            </p>
          </div>
        </div>

        <button
          onClick={handleBroadcastV2V}
          className={`glass-button text-xs py-3 px-5 shadow-lg ${
            isAlertingActive ? 'glass-button-danger' : ''
          }`}
        >
          <Wifi className="w-4 h-4 text-purple-300" />
          <span>MANUAL 200M BROADCAST TEST</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: 360-Degree Radar Visualizer Canvas */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-slate-950 border-2 border-purple-500/40 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            
            {/* Concentric Distance Rings */}
            <div className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-purple-500/25"></div>
            <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full border border-purple-500/25"></div>
            <div className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-purple-500/35"></div>

            {/* Radar Sweep Line */}
            <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-[radar-sweep_3.5s_linear_infinite] origin-center bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(168,85,247,0.3)_360deg)]"></div>

            {/* Emergency Broadcast Red Wave Ring when active */}
            {isAlertingActive && (
              <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-70"></div>
            )}

            {/* Center Driver Vehicle */}
            <div className="relative z-20 p-3 rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_25px_#00f2fe]">
              <Car className="w-5 h-5" />
            </div>

            {/* Nearby Vehicles Plotted on Radar Radius */}
            {/* Vehicle 1: 42m Behind */}
            <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 z-20 p-2 rounded-full border text-xs transition-all ${
              nearbyVehicles[0]?.alerted ? 'bg-red-950 border-red-500 text-red-300 animate-bounce shadow-[0_0_15px_#ff1744]' : 'bg-slate-900 border-purple-500/50 text-slate-300'
            }`} title="Vehicle 102 (42m Behind)">
              <Truck className="w-4 h-4" />
            </div>

            {/* Vehicle 2: 88m Behind */}
            <div className={`absolute bottom-6 left-1/3 z-20 p-2 rounded-full border text-xs transition-all ${
              nearbyVehicles[1]?.alerted ? 'bg-red-950 border-red-500 text-red-300 shadow-[0_0_15px_#ff1744]' : 'bg-slate-900 border-purple-500/50 text-slate-300'
            }`} title="Freight Truck (88m)">
              <Truck className="w-4 h-4" />
            </div>

            {/* Vehicle 3: 135m Ahead */}
            <div className={`absolute top-10 right-1/3 z-20 p-2 rounded-full border text-xs transition-all ${
              nearbyVehicles[2]?.alerted ? 'bg-red-950 border-red-500 text-red-300 shadow-[0_0_15px_#ff1744]' : 'bg-slate-900 border-purple-500/50 text-slate-300'
            }`} title="SUV Ahead (135m)">
              <Car className="w-4 h-4" />
            </div>

            {/* Vehicle 4: 180m Left */}
            <div className={`absolute top-1/2 left-6 -translate-y-1/2 z-20 p-2 rounded-full border text-xs transition-all ${
              nearbyVehicles[3]?.alerted ? 'bg-red-950 border-red-500 text-red-300 shadow-[0_0_15px_#ff1744]' : 'bg-slate-900 border-purple-500/50 text-slate-300'
            }`} title="EV Coupe Left (180m)">
              <Car className="w-4 h-4" />
            </div>

            {/* Outer Radius Marker Labels */}
            <span className="absolute top-2 text-[9px] font-mono font-bold text-purple-400">200m NORTH</span>
            <span className="absolute bottom-2 text-[9px] font-mono font-bold text-purple-400">200m SOUTH</span>
          </div>

          <div className="text-xs text-slate-400 font-mono mt-3.5 font-semibold">
            Active Signal Range: <span className="text-purple-300 font-bold">200 Meters (360°)</span>
          </div>
        </div>

        {/* Right: Surrounding Vehicles Alert Matrix */}
        <div className="lg:col-span-6 space-y-3.5">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider font-mono">
            Surrounding Vehicles Status (V2V Mesh)
          </label>

          <div className="space-y-2.5">
            {nearbyVehicles.map((vehicle) => (
              <div 
                key={vehicle.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-300 ${
                  vehicle.alerted 
                    ? 'bg-red-950/40 border-red-500/70 text-red-200 shadow-lg shadow-red-500/15' 
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${vehicle.alerted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                      <span>{vehicle.id} ({vehicle.type})</span>
                      <span className="text-[10px] font-mono text-slate-400 font-normal">{vehicle.distance}m • {vehicle.direction}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Speed: {vehicle.speed} km/h
                    </div>
                  </div>
                </div>

                <div>
                  {vehicle.alerted ? (
                    <span className="px-3 py-1 rounded-md bg-red-500/20 border border-red-500/50 text-red-300 text-[10px] font-black flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      HAZARD ALERTED
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-400 text-[10px] font-mono font-bold">
                      MONITORING
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};

