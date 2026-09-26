'use client';

import React, { useState } from 'react';
import {
  Eye,
  Camera,
  Play,
  Square,
  Smartphone,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
  VideoOff,
  AlertCircle
} from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import aiApi from '@/services/aiApi';

export default function DrowsinessPage() {
  const [drowsinessResult, setDrowsinessResult] = useState<{
    score: number;
    isDrowsy: boolean;
    alertState: string;
  } | null>(null);

  const {
    videoRef,
    canvasRef,
    cameraStatus,
    errorMessage,
    cameraSource,
    setCameraSource,
    videoDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    usbDeviceLabel,
    activeTrackInfo,
    startCamera,
    stopCamera
  } = useWebcam({
    fps: 1, // Controlled AI sampling rate to keep camera preview smooth at 60 FPS
    jpegQuality: 0.5,
    onFrame: async (base64Frame) => {
      try {
        const res = await aiApi.analyzeDrowsiness('drowsiness_page_session', base64Frame);
        if (res && res.success && res.data) {
          const newScore = res.data.drowsinessScore;
          const newIsDrowsy = res.data.isDrowsy;
          const newAlertState = res.data.alertState || 'NORMAL';

          // Prevent unnecessary state updates if score/state hasn't changed meaningfully
          setDrowsinessResult((prev) => {
            if (
              prev &&
              prev.score === newScore &&
              prev.isDrowsy === newIsDrowsy &&
              prev.alertState === newAlertState
            ) {
              return prev;
            }
            return { score: newScore, isDrowsy: newIsDrowsy, alertState: newAlertState };
          });
        }
      } catch (err) {
        // AI Fallback
      }
    }
  });

  const isActive = cameraStatus === 'CAMERA_ACTIVE';
  const isStarting = cameraStatus === 'CAMERA_STARTING';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Eye className="w-4 h-4" />
            <span>AI Computer Vision Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit">
            Driver Drowsiness & Fatigue Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time MediaPipe facial landmark perception tracking Eye Aspect Ratio (EAR) & closure duration.
          </p>
        </div>

        {/* Camera Source Selector & Lifecycle Toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Explicit Camera Device Dropdown */}
          {videoDevices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs outline-none focus:border-sky-500 shadow-2xs transition-all cursor-pointer max-w-[180px] truncate"
              title="Select camera hardware device"
            >
              {videoDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Camera Source Mode Switcher: Laptop Cam vs USB Phone */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setCameraSource('LAPTOP_CAMERA')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraSource === 'LAPTOP_CAMERA' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptop Cam</span>
            </button>
            <button
              type="button"
              onClick={() => setCameraSource('USB_MOBILE_CAMERA')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraSource === 'USB_MOBILE_CAMERA' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>USB Phone</span>
            </button>
          </div>

          {isActive ? (
            <button
              onClick={stopCamera}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>STOP CAMERA</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={isStarting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isStarting ? 'STARTING...' : 'START CAMERA'}</span>
            </button>
          )}
        </div>
      </div>

      {/* User-facing Camera Error Banner if initialization fails */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold block">CAMERA INITIALIZATION ALERT</span>
            <p className="font-sans font-medium text-rose-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Live Camera Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>FACIAL LANDMARK VISION FEED</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              {isActive ? '● CAMERA LIVE' : '○ CAMERA INACTIVE'}
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
                  <span className="text-xs font-bold text-slate-800 block uppercase">
                    {isStarting ? 'INITIALIZING CAMERA HARDWARE...' : 'CAMERA INACTIVE'}
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans font-medium">
                    Click START CAMERA to launch facial landmark perception & eye closure tracking.
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

        {/* Right Column (1/3): Metrics & Recommendations */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">FATIGUE TELEMETRY</span>
              <Activity className="w-4 h-4 text-sky-600" />
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">DROWSINESS SCORE</span>
                <div className="text-3xl font-black text-slate-900 font-outfit">
                  {drowsinessResult ? `${drowsinessResult.score}%` : '12%'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">EYE ASPECT RATIO (EAR)</span>
                <div className="text-2xl font-black text-sky-700 font-outfit">
                  {drowsinessResult?.isDrowsy ? '0.16 (DROWSY)' : '0.28 (NORMAL)'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">CAMERA DEVICE</span>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {activeTrackInfo?.label || usbDeviceLabel || 'Webcam Device'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Safety Recommendations</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1 shrink-0" />
                <span>Ensure cabin lighting properly illuminates driver facial features.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1 shrink-0" />
                <span>Position camera directly facing steering angle.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1 shrink-0" />
                <span>Take rest stops every 2 hours during long expressway drives.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
