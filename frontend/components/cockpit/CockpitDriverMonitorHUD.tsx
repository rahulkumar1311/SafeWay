'use client';

import React from 'react';
import { Eye, User, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CockpitDriverMonitorHUDProps {
  isFaceDetected?: boolean;
  isEyesOpen?: boolean;
  earValue?: number | null;
  eyeClosureDurationSeconds?: number;
  drowsinessScore?: number | null;
  alertState?: 'NORMAL' | 'WARNING' | 'DROWSY' | 'ALERT';
}

export const CockpitDriverMonitorHUD: React.FC<CockpitDriverMonitorHUDProps> = ({
  isFaceDetected = true,
  isEyesOpen = true,
  earValue = 0.28,
  eyeClosureDurationSeconds = 0.0,
  drowsinessScore = 12,
  alertState = 'NORMAL'
}) => {
  const isDrowsy = alertState === 'DROWSY' || alertState === 'ALERT' || (drowsinessScore !== null && drowsinessScore > 50);

  return (
    <div className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Eye className="w-4 h-4 text-sky-600" />
          <span>AI DRIVER ATTENTIVENESS MONITOR</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          isDrowsy
            ? 'bg-rose-50 border border-rose-200 text-rose-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {isDrowsy ? 'DROWSINESS ALERT' : 'DRIVER ATTENTIVE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>FACE TRACKING</span>
          </div>
          <span className={`text-xs font-extrabold block ${isFaceDetected ? 'text-emerald-700' : 'text-slate-400'}`}>
            {isFaceDetected ? '● FACE DETECTED' : '○ NO FACE'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>EYE ASPECT RATIO (EAR)</span>
          </div>
          <span className="text-xs font-extrabold text-slate-900 block">
            {earValue !== null ? earValue.toFixed(2) : '0.28'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <span>EYE CLOSURE TIME</span>
          </div>
          <span className={`text-xs font-extrabold block ${eyeClosureDurationSeconds > 1.5 ? 'text-amber-700' : 'text-slate-900'}`}>
            {eyeClosureDurationSeconds.toFixed(1)}s
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <span>FATIGUE SCORE</span>
          </div>
          <span className={`text-xs font-extrabold block ${isDrowsy ? 'text-rose-700' : 'text-emerald-700'}`}>
            {drowsinessScore !== null ? `${drowsinessScore}%` : '12%'}
          </span>
        </div>
      </div>

      {isDrowsy && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-bold">DRIVER FATIGUE DETECTED: TAKE A BREAK IMMEDIATELY!</span>
        </div>
      )}
    </div>
  );
};

export default CockpitDriverMonitorHUD;
