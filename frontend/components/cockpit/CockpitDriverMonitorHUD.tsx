'use client';

import React from 'react';
import { Eye, User, AlertTriangle, CheckCircle2, Volume2, Sparkles, Play, Square } from 'lucide-react';

interface CockpitDriverMonitorHUDProps {
  isFaceDetected?: boolean;
  faceDetected?: boolean;
  isEyesOpen?: boolean;
  earValue?: number | null;
  ear?: number | null;
  eyeClosureDurationSeconds?: number;
  closureDurationMs?: number;
  drowsinessScore?: number | null;
  score?: number | null;
  isDrowsy?: boolean;
  alertState?: 'NORMAL' | 'WARNING' | 'DROWSY' | 'ALERT';
  isSimulating?: boolean;
  onToggleSimulation?: () => void;
  onTestBuzzer?: () => void;
}

export const CockpitDriverMonitorHUD: React.FC<CockpitDriverMonitorHUDProps> = ({
  isFaceDetected,
  faceDetected,
  isEyesOpen,
  earValue,
  ear,
  eyeClosureDurationSeconds,
  closureDurationMs,
  drowsinessScore,
  score,
  isDrowsy: isDrowsyProp,
  alertState = 'NORMAL',
  isSimulating = false,
  onToggleSimulation,
  onTestBuzzer
}) => {
  const activeFace = faceDetected !== undefined ? faceDetected : (isFaceDetected !== undefined ? isFaceDetected : true);
  const activeEar = ear !== undefined ? ear : (earValue !== undefined ? earValue : 0.28);
  const activeDurationSec = closureDurationMs !== undefined ? (closureDurationMs / 1000) : (eyeClosureDurationSeconds !== undefined ? eyeClosureDurationSeconds : 0.0);
  const activeScore = score !== undefined ? score : (drowsinessScore !== undefined ? drowsinessScore : 12);
  const isDrowsy = Boolean(
    isDrowsyProp ||
    isSimulating ||
    alertState === 'DROWSY' ||
    alertState === 'ALERT' ||
    (activeScore !== null && activeScore >= 70) ||
    activeDurationSec >= 3.0
  );

  return (
    <div className={`w-full bg-white rounded-2xl p-5 border shadow-sm space-y-4 font-mono transition-all ${
      isDrowsy ? 'border-rose-300 ring-2 ring-rose-500/20 shadow-rose-500/10' : 'border-slate-200'
    }`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Eye className="w-4 h-4 text-sky-600" />
          <span>AI DRIVER ATTENTIVENESS MONITOR</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
          isDrowsy
            ? 'bg-rose-50 border border-rose-200 text-rose-700 animate-pulse'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          {isDrowsy ? '● DROWSINESS ALERT' : '● DRIVER ATTENTIVE'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>FACE TRACKING</span>
          </div>
          <span className={`text-xs font-extrabold block ${activeFace ? 'text-emerald-700' : 'text-slate-400'}`}>
            {activeFace ? '● FACE DETECTED' : '○ NO FACE'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>EYE ASPECT RATIO (EAR)</span>
          </div>
          <span className={`text-xs font-extrabold block ${isDrowsy ? 'text-rose-700' : 'text-slate-900'}`}>
            {activeEar !== null ? activeEar.toFixed(2) : '0.28'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <span>EYE CLOSURE TIME</span>
          </div>
          <span className={`text-xs font-extrabold block ${activeDurationSec > 1.5 || isDrowsy ? 'text-rose-700' : 'text-slate-900'}`}>
            {activeDurationSec.toFixed(1)}s
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase">
            <span>FATIGUE SCORE</span>
          </div>
          <span className={`text-xs font-extrabold block ${isDrowsy ? 'text-rose-700 font-black' : 'text-emerald-700'}`}>
            {activeScore !== null ? `${activeScore}%` : '12%'}
          </span>
        </div>
      </div>

      {/* Interactive Quick Simulation & Alarm Actions */}
      <div className="flex items-center gap-2 pt-1">
        {onToggleSimulation && (
          <button
            type="button"
            onClick={onToggleSimulation}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isSimulating
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
            }`}
          >
            {isSimulating ? (
              <>
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>STOP SIMULATION</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>SIMULATE DROWSINESS</span>
              </>
            )}
          </button>
        )}

        {onTestBuzzer && (
          <button
            type="button"
            onClick={onTestBuzzer}
            title="Test audio buzzer alarm"
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Volume2 className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">TEST BUZZER</span>
          </button>
        )}
      </div>

      {isDrowsy && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-bounce duration-1000">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-bold">DRIVER FATIGUE DETECTED: TAKE A BREAK IMMEDIATELY!</span>
        </div>
      )}
    </div>
  );
};

export default CockpitDriverMonitorHUD;
