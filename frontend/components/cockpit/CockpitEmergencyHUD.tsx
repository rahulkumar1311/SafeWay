'use client';

import React from 'react';
import { AlertOctagon, PhoneCall, X, Send } from 'lucide-react';

interface CockpitEmergencyHUDProps {
  isEmergencyActive: boolean;
  countdownSeconds: number;
  latitude?: number | null;
  longitude?: number | null;
  onCancel?: () => void;
  onSendNow?: () => void;
}

export const CockpitEmergencyHUD: React.FC<CockpitEmergencyHUDProps> = ({
  isEmergencyActive,
  countdownSeconds,
  latitude = 25.5941,
  longitude = 85.1376,
  onCancel,
  onSendNow
}) => {
  if (!isEmergencyActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-mono">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-rose-200 shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto animate-bounce">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            CRASH IMPACT DETECTED
          </span>
          <h2 className="text-2xl font-black text-slate-900 font-outfit uppercase">
            EMERGENCY SOS COUNTDOWN
          </h2>
          <p className="text-xs text-slate-600 font-sans">
            High G-force impact detected. Dispatching live location & telemetry to emergency services and contacts.
          </p>
        </div>

        <div className="text-6xl font-black text-rose-600 font-outfit">
          {countdownSeconds}s
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 text-left space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">GPS LATITUDE:</span>
            <span className="font-bold font-mono">{latitude ? latitude.toFixed(4) : '25.5941'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">GPS LONGITUDE:</span>
            <span className="font-bold font-mono">{longitude ? longitude.toFixed(4) : '85.1376'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>FALSE ALARM</span>
            </button>
          )}

          {onSendNow && (
            <button
              onClick={onSendNow}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 transition-transform hover:scale-105 cursor-pointer"
            >
              <Send className="w-4 h-4 fill-white" />
              <span>SEND NOW</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CockpitEmergencyHUD;
