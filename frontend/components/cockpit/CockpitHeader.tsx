'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Camera, MapPin, Radio, PhoneCall, Activity } from 'lucide-react';

interface CockpitHeaderProps {
  aiOnline: boolean;
  gpsStatus: 'LIVE' | 'SIGNAL_WEAK' | 'UNAVAILABLE' | 'PERMISSION_DENIED' | 'OFFLINE' | 'SEARCHING';
  cameraActive: boolean;
  v2vConnected: boolean;
  emergencyReady: boolean;
  cameraSourceLabel?: string;
  driverRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
}

export const CockpitHeader: React.FC<CockpitHeaderProps> = ({
  aiOnline,
  gpsStatus,
  cameraActive,
  v2vConnected,
  emergencyReady,
  cameraSourceLabel = 'USB PHONE'
}) => {
  const isGpsActive = gpsStatus === 'LIVE' || gpsStatus === 'SIGNAL_WEAK';

  return (
    <header className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-sky-600 p-0.5 shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-sky-600 rounded-[10px] flex items-center justify-center text-white">
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900 tracking-wider font-outfit uppercase">
                  SAFEWAY<span className="text-sky-600">.AI</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-50 border border-sky-200 text-sky-700">
                  COCKPIT HMI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">INTELLIGENT DRIVER ASSISTANCE PLATFORM</p>
            </div>
          </Link>
        </div>

        {/* Live System Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
            <span className="text-slate-800 font-bold uppercase">LIVE DRIVE</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all ${
              aiOnline
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${aiOnline ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{aiOnline ? '● AI ONLINE' : '○ AI OFFLINE'}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
              isGpsActive
                ? 'bg-sky-50 border-sky-200 text-sky-800 font-bold'
                : 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-sky-600" />
            <span>{isGpsActive ? '● GPS LOCKED' : '○ GPS SEARCHING'}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
              cameraActive
                ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>{cameraActive ? `● CAM ACTIVE (${cameraSourceLabel})` : '○ CAM OFFLINE'}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
              v2vConnected
                ? 'bg-teal-50 border-teal-200 text-teal-800 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-teal-600" />
            <span>{v2vConnected ? '● V2V MESH ACTIVE' : '○ V2V OFFLINE'}</span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
              emergencyReady
                ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
            <span>{emergencyReady ? '● SOS READY' : '○ SOS OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CockpitHeader;
