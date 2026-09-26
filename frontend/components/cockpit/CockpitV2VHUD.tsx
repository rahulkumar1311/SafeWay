'use client';

import React from 'react';
import { Radio, RefreshCw, Car } from 'lucide-react';
import { NearbyVehicle } from '@/hooks/useV2VNetwork';

interface CockpitV2VHUDProps {
  v2vStatus: 'CONNECTING' | 'ONLINE' | 'RECONNECTING' | 'OFFLINE';
  nearbyVehicles: NearbyVehicle[];
  onReconnect?: () => void;
}

export const CockpitV2VHUD: React.FC<CockpitV2VHUDProps> = ({
  v2vStatus,
  nearbyVehicles,
  onReconnect
}) => {
  const isOnline = v2vStatus === 'ONLINE';

  return (
    <div className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Radio className="w-4 h-4 text-teal-600" />
          <span>V2V MESH NETWORK HUD</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            isOnline
              ? 'bg-teal-50 border border-teal-200 text-teal-700'
              : 'bg-slate-50 border border-slate-200 text-slate-500'
          }`}>
            {isOnline ? '● MESH CONNECTED' : '○ MESH OFFLINE'}
          </span>

          {onReconnect && !isOnline && (
            <button
              onClick={onReconnect}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Reconnect V2V Mesh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
          <span>NEARBY V2V VEHICLES ({nearbyVehicles.length})</span>
          <span className="text-[10px] text-slate-400">RANGE: 500M</span>
        </div>

        {nearbyVehicles.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            No nearby V2V mesh vehicles detected in radius.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {nearbyVehicles.map((v, i) => (
              <div
                key={v.vehicleId || i}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">{v.vehicleId}</span>
                    <span className="text-[10px] text-slate-500 block">
                      DIST: {v.distanceMeters ? `${v.distanceMeters.toFixed(0)}m` : '15m'} | DIR: {v.direction || 'N'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {v.speed ? `${Math.round(v.speed)} km/h` : '40 km/h'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CockpitV2VHUD;
