'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Camera,
  Play,
  Square,
  Smartphone,
  Laptop,
  AlertTriangle,
  Activity,
  Gauge,
  CheckCircle2,
  RefreshCw,
  VideoOff
} from 'lucide-react';
import { useRoadWebcam } from '@/hooks/useRoadWebcam';
import { useRoadObjectDetection } from '@/hooks/useRoadObjectDetection';

export default function RoadSafetyPage() {
  const [speed] = useState<number>(45);
  const [speedLimit] = useState<number>(60);
  const [advisorySpeed] = useState<number | null>(40);

  const {
    videoRef,
    canvasRef,
    cameraStatus,
    errorMessage,
    startCamera,
    stopCamera
  } = useRoadWebcam({ autoStart: false });

  const isActive = cameraStatus === 'CAMERA_ACTIVE';
  const isStarting = cameraStatus === 'CAMERA_STARTING';

  const { detectedObjects } = useRoadObjectDetection(videoRef, isActive);

  const activeAlert = detectedObjects.find((o) => o.confidence > 0.8)?.class;

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>AI Road Safety & Object Perception</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit">
            Road Safety, Traffic Signs & Object Perception
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time object perception detecting pedestrians, vehicles, road hazards, and traffic signs.
          </p>
        </div>

        {/* Lifecycle Camera Controls */}
        <div className="shrink-0">
          {isActive ? (
            <button
              onClick={stopCamera}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>STOP CAMERA</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={isStarting}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isStarting ? 'STARTING...' : 'START CAMERA'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Camera & Perception Stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>ROAD OBJECT PERCEPTION FEED</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              {isActive ? '● PERCEPTION ACTIVE' : '○ CAMERA INACTIVE'}
            </span>
          </div>

          <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden bg-[#FFFAF0] border border-slate-200 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

            {!isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FFFAF0]/95 z-20 font-mono">
                <VideoOff className="w-12 h-12 text-slate-400" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 block uppercase font-mono">
                    {isStarting ? 'INITIALIZING PERCEPTION HARDWARE...' : 'CAMERA INACTIVE'}
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans font-medium">
                    Click START CAMERA to launch road object detection and sign perception.
                  </p>
                </div>
                {!isStarting && (
                  <button
                    onClick={startCamera}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>START CAMERA</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Detection Metrics & Active Alerts */}
        <div className="space-y-6 font-mono">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">PERCEPTION METRICS</span>
              <Activity className="w-4 h-4 text-sky-600" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold">DETECTED OBJECTS</span>
                <span className="text-base font-black text-sky-700 font-outfit">{detectedObjects.length}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold">CURRENT SPEED</span>
                <span className="text-base font-black text-slate-900 font-outfit">{speed} km/h</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold">ADVISORY SPEED</span>
                <span className="text-base font-black text-emerald-700 font-outfit">{advisorySpeed} km/h</span>
              </div>
            </div>
          </div>

          {activeAlert && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>ROAD OBJECT DETECTED</span>
              </div>
              <p className="text-xs font-sans text-amber-800">Detected road object: {activeAlert}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
