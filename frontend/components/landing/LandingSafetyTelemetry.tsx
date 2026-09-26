'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Eye,
  Activity,
  ShieldCheck,
  PhoneCall,
  ArrowRight,
  User,
  Zap,
  MapPin,
  CloudSun,
  AlertTriangle,
  Radio,
  Car
} from 'lucide-react';
import { useDrowsinessContext } from '@/context/DrowsinessContext';

export const LandingSafetyTelemetry: React.FC = () => {
  const { metrics, isMonitoringActive } = useDrowsinessContext();
  const [safetyScore, setSafetyScore] = useState<number>(98);
  const [speedLimit, setSpeedLimit] = useState<number>(50);

  return (
    <div className="space-y-4 font-sans h-full flex flex-col justify-between">
      {/* 1. AI Driver Monitoring Live Telemetry Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-outfit uppercase">
                AI DRIVER MONITOR
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Landmark & EAR Perception
              </p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
              isMonitoringActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isMonitoringActive ? '● MONITORING' : '○ STANDBY'}
          </span>
        </div>

        {/* Telemetry Metrics Strip */}
        <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
            <span className="text-[9px] text-slate-500 uppercase block font-bold">EYE EAR</span>
            <div className="text-sm font-black text-sky-700 font-outfit">
              {metrics.ear !== null ? `${metrics.ear.toFixed(2)}` : '0.28 (OPEN)'}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
            <span className="text-[9px] text-slate-500 uppercase block font-bold">FATIGUE SCORE</span>
            <div
              className={`text-sm font-black font-outfit ${
                metrics.drowsinessScore > 40 ? 'text-amber-600' : 'text-emerald-700'
              }`}
            >
              {metrics.drowsinessScore || 8}% LOW
            </div>
          </div>
        </div>

        <Link
          href="/drowsiness"
          className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-between transition-all group font-mono shadow-2xs"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Launch Driver Monitor</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* 2. Safety Telemetry & Driver Score Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-outfit uppercase">
                SAFETY SCORE & RADAR
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">
                Real-Time Driving Index
              </p>
            </div>
          </div>

          <span className="text-xs font-black font-outfit text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
            {safetyScore}/100
          </span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-600 text-[11px]">Speed Advisory</span>
            <span className="font-bold text-slate-900">{speedLimit} km/h (Optimal)</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-600 text-[11px]">GPS Region</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-sky-600" />
              <span>Patna, Bihar</span>
            </span>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="w-full py-2.5 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-between transition-all group font-mono shadow-md shadow-sky-600/20"
        >
          <span className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" />
            <span>Launch Operations Cockpit</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* 3. Emergency SOS & Collision Readiness Card */}
      <div className="bg-white rounded-3xl p-5 border border-rose-200/80 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between border-b border-rose-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 font-outfit uppercase">
                EMERGENCY SOS
              </h3>
              <p className="text-[10px] text-rose-600 font-mono font-bold">
                15s Automated Crash Dispatch
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <Radio className="w-3 h-3 text-rose-600" />
            <span>ARMED</span>
          </span>
        </div>

        <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
          Front camera obstruction and severe deceleration automatically dispatch GPS coordinates to emergency contacts.
        </p>

        <Link
          href="/emergency"
          className="w-full py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs flex items-center justify-between transition-all group font-mono shadow-2xs"
        >
          <span>Configure Emergency SOS</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default LandingSafetyTelemetry;
