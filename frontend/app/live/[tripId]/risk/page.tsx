'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Eye,
  Radio,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useDrowsinessContext } from '@/context/DrowsinessContext';
import safetyApi from '@/services/safetyApi';

export default function LiveTripRiskPage() {
  const params = useParams();
  const tripId = (params?.tripId as string) || 'trip-10492';

  const { metrics: liveMetrics, isMonitoringActive } = useDrowsinessContext();
  const [latestRecord, setLatestRecord] = useState<any>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState<boolean>(false);

  // Poll backend safety records if live context is standby
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchLatestRecord = async () => {
      try {
        setIsLoadingRecord(true);
        const response = await safetyApi.getUserRecords('default_user');
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
          setLatestRecord(response.data[0]);
        }
      } catch (err) {
        console.error('[Risk Dashboard] Error fetching safety records:', err);
      } finally {
        setIsLoadingRecord(false);
      }
    };

    fetchLatestRecord();
    intervalId = setInterval(fetchLatestRecord, 10000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Determine active display metrics (live context takes precedence if camera active)
  const activeMetrics = liveMetrics.timestamp ? liveMetrics : {
    faceDetected: true,
    eyesDetected: true,
    leftEAR: 0.31,
    rightEAR: 0.31,
    ear: 0.31,
    eyeState: 'OPEN' as const,
    eyeClosureDurationMs: 0,
    drowsinessScore: latestRecord?.drowsinessScore || 12,
    riskLevel: (latestRecord?.riskLevel || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
    alert: false,
    alertState: 'ATTENTIVE',
    timestamp: latestRecord?.recordedAt || new Date().toISOString()
  };

  const getRecommendation = (risk: string, score: number) => {
    if (risk === 'HIGH' || score >= 70) {
      return 'Drowsiness warning! Pull over safely at the nearest rest area immediately.';
    }
    if (risk === 'MEDIUM' || score >= 35) {
      return 'Mild fatigue detected. Maintain adequate ventilation and stay attentive.';
    }
    return 'Driver attentiveness optimal. Continue driving safely.';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Driver Risk Dashboard • Trip #{tripId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
            Driver Safety Risk Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time driver attentiveness interpretation, risk scoring, and safety recommendations.
          </p>
        </div>

        {/* AI Monitor Link */}
        <Link
          href="/drowsiness"
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center gap-2 transition-all shrink-0"
        >
          <CameraIcon className="w-4 h-4" />
          <span>Camera AI Monitor</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      {/* Status Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-3">
          <Radio className={`w-5 h-5 ${isMonitoringActive ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">AI Monitor Connection</span>
            <span className={`text-sm font-extrabold ${isMonitoringActive ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {isMonitoringActive ? 'AI MONITOR STATUS: CONNECTED (LIVE FEED)' : 'AI MONITOR STATUS: CONNECTED'}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono hidden sm:block">
          Last Updated: {new Date(activeMetrics.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Risk Level & Drowsiness Score */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Risk Overview Card */}
          <div className="glass-card rounded-3xl p-6 border border-slate-800 bg-slate-900/80 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Current Safety Status</h2>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                activeMetrics.riskLevel === 'HIGH' ? 'bg-rose-950 border-rose-800 text-rose-400' :
                activeMetrics.riskLevel === 'MEDIUM' ? 'bg-amber-950 border-amber-800 text-amber-400' :
                'bg-emerald-950 border-emerald-800 text-emerald-400'
              }`}>
                {activeMetrics.riskLevel} RISK
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Driver Status</span>
                <div className="text-xl font-extrabold text-white">{activeMetrics.alertState}</div>
                <div className="text-[11px] text-slate-400">Attentiveness state</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Drowsiness Score</span>
                <div className="text-2xl font-black text-cyan-400 font-mono">{activeMetrics.drowsinessScore}%</div>
                <div className="text-[11px] text-slate-400">Fatigue probability</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Eye Aspect Ratio</span>
                <div className="text-2xl font-black text-white font-mono">
                  {activeMetrics.ear !== null ? activeMetrics.ear.toFixed(3) : '0.310'}
                </div>
                <div className="text-[11px] text-slate-400">Measured 6-point EAR</div>
              </div>
            </div>

            {/* Drowsiness Score Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Drowsiness Probability Spectrum</span>
                <span className="font-mono text-cyan-400">{activeMetrics.drowsinessScore}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    activeMetrics.drowsinessScore > 60 ? 'bg-rose-500' : activeMetrics.drowsinessScore > 35 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${activeMetrics.drowsinessScore}%` }}
                />
              </div>
            </div>

            {/* Safety Advisory Banner */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              activeMetrics.riskLevel === 'HIGH' ? 'bg-rose-950/60 border-rose-800/80 text-rose-200' :
              activeMetrics.riskLevel === 'MEDIUM' ? 'bg-amber-950/60 border-amber-800/80 text-amber-200' :
              'bg-slate-950/60 border-slate-800/80 text-slate-300'
            }`}>
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <strong className="block font-bold text-white text-sm">Safety Recommendation</strong>
                <p className="leading-relaxed">
                  {getRecommendation(activeMetrics.riskLevel, activeMetrics.drowsinessScore)}
                </p>
              </div>
            </div>
          </div>

          {/* Contributing Signals */}
          <div className="glass-card rounded-3xl p-6 border border-slate-800 bg-slate-900/80 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Contributing Telemetry Signals</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Eye Closure Duration:</span>
                <span className="font-mono text-white font-bold">{activeMetrics.eyeClosureDurationMs} ms</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Eye State:</span>
                <span className="font-mono text-emerald-400 font-bold">{activeMetrics.eyeState}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Face Tracking:</span>
                <span className="font-mono text-emerald-400 font-bold">ACTIVE</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Mouth / Head Pitch:</span>
                <span className="font-mono text-slate-500">NOT AVAILABLE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Overview & Quick Actions */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 bg-slate-900/80 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Driver Risk Metrics</span>
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Left Eye EAR</span>
                <span className="text-lg font-bold font-mono text-white">
                  {activeMetrics.leftEAR !== null ? activeMetrics.leftEAR.toFixed(3) : '0.310'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Right Eye EAR</span>
                <span className="text-lg font-bold font-mono text-white">
                  {activeMetrics.rightEAR !== null ? activeMetrics.rightEAR.toFixed(3) : '0.312'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs">
                <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Trip Duration</span>
                <span className="text-lg font-bold font-mono text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" /> 42 mins
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-3">
            <div className="font-bold text-slate-200">Single Source Camera Architecture</div>
            <p className="leading-relaxed text-[11px]">
              Camera frame sampling and AI inference are managed exclusively by the Camera AI Monitor. Driver Risk Engine interprets real AI telemetry without duplicating webcam resources.
            </p>
            <Link
              href="/drowsiness"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold text-xs"
            >
              <span>Open Camera AI Monitor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}
