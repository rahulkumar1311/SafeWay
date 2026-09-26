'use client';

import React from 'react';

interface CockpitBottomRailProps {
  speedKmH: number | null;
  heading?: number;
  gpsStatus: 'LIVE' | 'SIGNAL_WEAK' | 'UNAVAILABLE' | 'PERMISSION_DENIED' | 'OFFLINE' | 'SEARCHING';
  roadName?: string;
  speedLimitKmH?: number;
  advisorySpeedKmH?: number | null;
  aiOnline: boolean;
  v2vConnected: boolean;
}

export const CockpitBottomRail: React.FC<CockpitBottomRailProps> = ({
  speedKmH,
  heading = 0,
  gpsStatus,
  roadName = 'NH-30 (Patna Expressway)',
  speedLimitKmH = 60,
  advisorySpeedKmH = null,
  aiOnline,
  v2vConnected
}) => {
  const isGpsActive = gpsStatus === 'LIVE' || gpsStatus === 'SIGNAL_WEAK';

  return (
    <footer className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm font-mono text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">SPEED</span>
          <span className="text-sm font-extrabold text-sky-700">
            {speedKmH !== null ? `${Math.round(speedKmH)} km/h` : '—'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">HEADING</span>
          <span className="text-sm font-extrabold text-amber-700">{heading}°</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">GPS</span>
          <span className={`text-sm font-extrabold ${isGpsActive ? 'text-emerald-700' : 'text-amber-700'}`}>
            {isGpsActive ? 'LOCKED' : 'SEARCHING'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5 col-span-2 sm:col-span-1 truncate">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">ROAD</span>
          <span className="text-xs font-bold text-slate-800 truncate block">{roadName}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">LIMIT</span>
          <span className="text-sm font-extrabold text-slate-900">{speedLimitKmH} km/h</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">ADVISORY</span>
          <span className="text-sm font-extrabold text-emerald-700">
            {advisorySpeedKmH !== null ? `${advisorySpeedKmH} km/h` : `${speedLimitKmH} km/h`}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">AI VISION</span>
          <span className={`text-sm font-extrabold ${aiOnline ? 'text-emerald-700' : 'text-slate-500'}`}>
            {aiOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">V2V MESH</span>
          <span className={`text-sm font-extrabold ${v2vConnected ? 'text-teal-700' : 'text-slate-500'}`}>
            {v2vConnected ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default CockpitBottomRail;
