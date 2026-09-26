'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import safetyApi from '@/services/safetyApi';
import { SafetyAnalysisResult } from '@/types';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';

export default function SafetyPage() {
  const [drowsinessScore, setDrowsinessScore] = useState<number>(15);
  const [speed, setSpeed] = useState<number>(55);
  const [speedLimit, setSpeedLimit] = useState<number>(60);
  const [harshBraking, setHarshBraking] = useState<number>(0);
  const [roadHazard, setRoadHazard] = useState<boolean>(false);

  const [analysisResult, setAnalysisResult] = useState<SafetyAnalysisResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const runSafetyEvaluation = async () => {
    try {
      setIsEvaluating(true);
      setErrorMsg('');

      const response = await safetyApi.analyzeSafety({
        drowsinessScore: Number(drowsinessScore),
        speed: Number(speed),
        speedLimit: Number(speedLimit),
        harshBraking: Number(harshBraking),
        roadHazard: Boolean(roadHazard)
      });

      if (response && response.data) {
        setAnalysisResult(response.data);
      }
    } catch (err: any) {
      console.error('Safety evaluation error:', err);
      setErrorMsg(err.message || 'Failed to execute safety risk evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    runSafetyEvaluation();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Composite Driving Telemetry Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
            Safety Risk & Telemetry Evaluator
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time multi-signal safety analysis integrating driver fatigue, speed compliance, and road hazards.
          </p>
        </div>

        <button
          onClick={runSafetyEvaluation}
          disabled={isEvaluating}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-600/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>Re-Evaluate Risk</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-slate-800 bg-slate-900/80 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Telemetry Signals</h3>
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-mono">Input Tuning</span>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Driver Fatigue (Drowsiness)</span>
                <span className="font-mono text-cyan-400 font-bold">{drowsinessScore}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={drowsinessScore}
                onChange={(e) => setDrowsinessScore(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Vehicle Speed</span>
                <span className="font-mono text-cyan-400 font-bold">{speed} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="160"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Posted Speed Limit</span>
                <span className="font-mono text-cyan-400 font-bold">{speedLimit} km/h</span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                value={speedLimit}
                onChange={(e) => setSpeedLimit(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-semibold">Harsh Braking Events</span>
                <span className="font-mono text-cyan-400 font-bold">{harshBraking}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={harshBraking}
                onChange={(e) => setHarshBraking(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Road Hazard Nearby</span>
              <input
                type="checkbox"
                checked={roadHazard}
                onChange={(e) => setRoadHazard(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={runSafetyEvaluation}
            disabled={isEvaluating}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <span>Run Backend Safety Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="lg:col-span-2 glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 bg-slate-900/80 space-y-6 flex flex-col justify-between">
          {isEvaluating && <LoadingState message="Evaluating composite safety risk scores..." />}

          {!isEvaluating && errorMsg && <ErrorState message={errorMsg} onRetry={runSafetyEvaluation} />}

          {!isEvaluating && !errorMsg && analysisResult && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Calculated Safety Score</span>
                  <div className="text-4xl sm:text-5xl font-extrabold text-white font-outfit">
                    {Math.max(0, 100 - (analysisResult.riskScore || 0))} <span className="text-slate-500 text-base font-normal">/ 100</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`px-5 py-2.5 rounded-2xl text-base font-black tracking-wide border ${
                    analysisResult.riskLevel === 'HIGH'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : analysisResult.riskLevel === 'MEDIUM'
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  }`}>
                    {analysisResult.riskLevel} RISK LEVEL
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Risk Analysis Factors ({analysisResult.reasons?.length || 0})</span>
                </h4>

                <div className="space-y-2">
                  {(analysisResult.reasons || []).map((reason, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Recommended Driver Actions</span>
                </h4>

                <div className="space-y-2">
                  {(analysisResult.recommendations || []).map((rec, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
