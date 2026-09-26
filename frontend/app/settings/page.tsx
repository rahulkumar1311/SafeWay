'use client';

import React, { useState } from 'react';
import { Settings as SettingsIcon, Sliders, Shield, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const [speedAlertThreshold, setSpeedAlertThreshold] = useState<number>(60);
  const [drowsinessSensitivity, setDrowsinessSensitivity] = useState<string>('HIGH');
  const [v2vRange, setV2vRange] = useState<number>(500);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <SettingsIcon className="w-4 h-4" />
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit">
            SafeWay.AI Platform Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Tune AI perception thresholds, V2V mesh radius, and driver safety alerts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 max-w-2xl font-mono text-xs">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold block">MAXIMUM SPEED ALERT THRESHOLD ({speedAlertThreshold} KM/H)</label>
            <input
              type="range"
              min="40"
              max="120"
              value={speedAlertThreshold}
              onChange={(e) => setSpeedAlertThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold block">DROWSINESS AI SENSITIVITY</label>
            <select
              value={drowsinessSensitivity}
              onChange={(e) => setDrowsinessSensitivity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none focus:bg-white focus:border-sky-500"
            >
              <option value="LOW">Low (EAR Threshold 0.14)</option>
              <option value="MEDIUM">Medium (EAR Threshold 0.18)</option>
              <option value="HIGH">High (EAR Threshold 0.22 - Recommended)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold block">V2V MESH BROADCAST RADIUS ({v2vRange} METERS)</label>
            <input
              type="range"
              min="100"
              max="1000"
              step="100"
              value={v2vRange}
              onChange={(e) => setV2vRange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>SAVE PLATFORM CONFIGURATION</span>
          </button>

          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings Saved Successfully!</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
