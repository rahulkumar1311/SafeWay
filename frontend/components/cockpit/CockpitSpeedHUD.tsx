'use client';

import React from 'react';
import { Gauge, ShieldAlert, AlertTriangle } from 'lucide-react';

interface CockpitSpeedHUDProps {
  currentSpeedKmH: number | null;
  legalLimitKmH?: number;
  advisorySpeedKmH?: number | null;
  activeHazardLabel?: string | null;
}

export const CockpitSpeedHUD: React.FC<CockpitSpeedHUDProps> = ({
  currentSpeedKmH,
  legalLimitKmH = 60,
  advisorySpeedKmH = null,
  activeHazardLabel = null
}) => {
  const effectiveAdvisory = advisorySpeedKmH !== null ? advisorySpeedKmH : legalLimitKmH;
  const isSpeeding = currentSpeedKmH !== null && currentSpeedKmH > legalLimitKmH;
  const isExceedingAdvisory = currentSpeedKmH !== null && advisorySpeedKmH !== null && currentSpeedKmH > advisorySpeedKmH;

  return (
    <div className="w-full bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Gauge className="w-4 h-4 text-sky-600" />
          <span>DYNAMIC SPEED ADVISORY HUD</span>
        </div>
        <span className="text-[10px] text-slate-500 font-bold">GPS TELEMETRY FEED</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {/* CURRENT SPEED */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-1">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">CURRENT SPEED</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl sm:text-5xl font-black font-outfit ${
              isSpeeding ? 'text-rose-600' : 'text-slate-900'
            }`}>
              {currentSpeedKmH !== null ? Math.round(currentSpeedKmH) : '—'}
            </span>
            <span className="text-xs text-slate-500 font-bold">km/h</span>
          </div>
          {currentSpeedKmH === null && (
            <span className="text-[10px] text-amber-600 font-bold">GPS UNAVAILABLE</span>
          )}
        </div>

        {/* LEGAL SPEED LIMIT */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-1">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">LEGAL SPEED LIMIT</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl sm:text-5xl font-black font-outfit text-slate-900">
              {legalLimitKmH}
            </span>
            <span className="text-xs text-slate-500 font-bold">km/h</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold">POSTED MVA ROAD LIMIT</span>
        </div>

        {/* DYNAMIC ADVISORY SPEED */}
        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-1 ${
          isExceedingAdvisory
            ? 'bg-amber-50 border-amber-300'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">ADVISORY SPEED</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl sm:text-5xl font-black font-outfit ${
              isExceedingAdvisory ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {effectiveAdvisory}
            </span>
            <span className="text-xs text-slate-500 font-bold">km/h</span>
          </div>
          <span className={`text-[10px] font-bold ${isExceedingAdvisory ? 'text-amber-700' : 'text-emerald-700'}`}>
            {activeHazardLabel ? activeHazardLabel : 'OPTIMAL ROAD SAFETY SPEED'}
          </span>
        </div>
      </div>

      {/* Speed Warning Banner */}
      {(isSpeeding || isExceedingAdvisory) && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">
              {isSpeeding ? '⚠ VEHICLE SPEED EXCEEDS LEGAL LIMIT!' : '⚠ ADVISORY SPEED REDUCTION RECOMMENDED FOR AHEAD HAZARD'}
            </span>
          </div>
          <span className="font-bold text-[10px] uppercase bg-rose-100 px-2 py-0.5 rounded text-rose-800">
            REDUCE SPEED
          </span>
        </div>
      )}
    </div>
  );
};

export default CockpitSpeedHUD;
