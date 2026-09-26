'use client';

import React, { useState, useCallback } from 'react';
import {
  ShieldAlert,
  Camera,
  Play,
  Square,
  AlertTriangle,
  Activity,
  CheckCircle2,
  RefreshCw,
  VideoOff,
  PhoneCall,
  MapPin,
  XOctagon,
  Volume2,
  VolumeX,
  Send,
  AlertOctagon
} from 'lucide-react';
import { useRoadWebcam } from '@/hooks/useRoadWebcam';
import { useRoadObjectDetection } from '@/hooks/useRoadObjectDetection';
import { useAccidentSOS } from '@/hooks/useAccidentSOS';

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

  const {
    detectedObjects,
    isCameraBlocked,
    obstructionScore,
    visibilityScore,
    highestRisk
  } = useRoadObjectDetection(videoRef, isActive);

  const {
    accidentState,
    countdownSeconds,
    location,
    locationStatus,
    incidentId,
    dispatchedRecord,
    isMuted,
    setIsMuted,
    initAudio,
    cancelSOS,
    triggerManualSOS
  } = useAccidentSOS({
    isCameraActive: isActive,
    isCameraBlocked,
    obstructionScore,
    userId: 'default_user'
  });

  const handleStartCamera = useCallback(() => {
    initAudio();
    startCamera();
  }, [initAudio, startCamera]);

  const activeAlert = detectedObjects.find((o) => o.confidence > 0.8)?.class;

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1 font-mono">
            <ShieldAlert className="w-4 h-4" />
            <span>AI Road Safety, Collision & Incident Perception</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit">
            Road Safety & Emergency Collision Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time road camera vision with automated collision & camera obstruction accident detection and 15-second SOS dispatch.
          </p>
        </div>

        {/* Lifecycle Camera Controls & Audio Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              initAudio();
              setIsMuted((prev) => !prev);
            }}
            className={`p-2.5 rounded-xl border font-bold text-xs flex items-center transition-all cursor-pointer ${
              isMuted
                ? 'bg-slate-100 border-slate-200 text-slate-400'
                : 'bg-white border-slate-200 text-sky-700 shadow-xs'
            }`}
            title={isMuted ? 'Sound Muted: Click to enable alarm sound' : 'Sound Enabled: Click to mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-sky-600" />}
          </button>

          {isActive ? (
            <button
              onClick={stopCamera}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer font-mono"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>STOP CAMERA</span>
            </button>
          ) : (
            <button
              onClick={handleStartCamera}
              disabled={isStarting}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer font-mono"
            >
              {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isStarting ? 'STARTING...' : 'START CAMERA'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 🚨 15-SECOND AUTOMATIC SOS COUNTDOWN EMERGENCY BANNER */}
      {accidentState === 'SOS_COUNTDOWN' && (
        <div className="p-5 rounded-2xl bg-rose-600 text-white shadow-xl shadow-rose-600/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-start sm:items-center gap-3.5">
            <AlertOctagon className="w-10 h-10 text-white shrink-0 mt-0.5 sm:mt-0" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-black uppercase tracking-wider font-mono">
                  POSSIBLE VEHICLE ACCIDENT DETECTED
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-mono font-black">
                  CAMERA OBSTRUCTED
                </span>
              </div>
              <p className="text-xs sm:text-sm font-sans text-rose-100 font-medium leading-relaxed">
                Front camera obstruction suggests collision impact. Automatic SOS will be dispatched to your emergency contacts in <strong>{countdownSeconds} seconds</strong>.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-rose-200 pt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {location
                    ? `GPS Ready: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : locationStatus === 'ACQUIRING'
                    ? 'Acquiring high-accuracy GPS coordinates...'
                    : 'GPS coordinates unavailable'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <div className="w-14 h-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center font-outfit text-2xl font-black shadow-md shrink-0">
              {countdownSeconds}s
            </div>

            <button
              onClick={cancelSOS}
              className="px-5 py-3.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-black text-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-105 cursor-pointer shrink-0 font-mono uppercase"
            >
              <XOctagon className="w-4 h-4 text-rose-600" />
              <span>I&apos;M OK — CANCEL SOS</span>
            </button>
          </div>
        </div>
      )}

      {/* ✅ SOS SENT CONFIRMATION BANNER */}
      {accidentState === 'SOS_SENT' && (
        <div className="p-5 rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-white shrink-0" />
            <div className="space-y-0.5">
              <span className="text-sm font-black uppercase tracking-wide block">
                EMERGENCY SOS DISPATCHED SUCCESSFULLY
              </span>
              <p className="text-xs font-sans text-emerald-100 font-medium">
                Registered emergency contacts have been notified. Live Google Maps location link shared.
              </p>
              {location?.mapsUrl && (
                <a
                  href={location.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white underline font-mono inline-block pt-1 hover:text-emerald-200"
                >
                  📍 View Dispatched Location on Google Maps ({location.latitude.toFixed(5)}, {location.longitude.toFixed(5)})
                </a>
              )}
            </div>
          </div>

          <button
            onClick={() => cancelSOS()}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer shrink-0"
          >
            DISMISS ALERT
          </button>
        </div>
      )}

      {/* ⚠️ CAMERA OBSTRUCTION DETECTED (Pre-Countdown Warning) */}
      {accidentState === 'POSSIBLE_CAMERA_OBSTRUCTION' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs flex items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 animate-spin" />
            <div>
              <span className="text-xs font-bold block uppercase tracking-wider text-amber-800">
                CAMERA OBSTRUCTION DETECTED ({obstructionScore}%)
              </span>
              <p className="text-[11px] font-sans text-amber-700">
                Monitoring road camera visibility. Sustained obstruction will trigger accident countdown.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Camera & Perception Stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>ROAD COLLISION & OBJECT PERCEPTION FEED</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                accidentState === 'SOS_COUNTDOWN'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : accidentState === 'POSSIBLE_CAMERA_OBSTRUCTION'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200'
              }`}>
                {accidentState === 'SOS_COUNTDOWN'
                  ? '● ACCIDENT DETECTED'
                  : accidentState === 'POSSIBLE_CAMERA_OBSTRUCTION'
                  ? '● CAMERA OBSTRUCTED'
                  : isActive
                  ? '● ROAD MONITORING ACTIVE'
                  : '○ CAMERA INACTIVE'}
              </span>
            </div>
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
                    {isStarting ? 'INITIALIZING PERCEPTION HARDWARE...' : 'ROAD CAMERA INACTIVE'}
                  </span>
                  <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans font-medium">
                    Click START CAMERA to activate front-facing road vision and automated collision accident detection.
                  </p>
                </div>
                {!isStarting && (
                  <button
                    onClick={handleStartCamera}
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
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">COLLISION TELEMETRY</span>
              <Activity className="w-4 h-4 text-sky-600" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold">CAMERA VISIBILITY</span>
                <span className={`text-base font-black font-outfit ${visibilityScore < 30 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {isActive ? `${visibilityScore}%` : 'STANDBY'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold">OBSTRUCTION LEVEL</span>
                <span className={`text-base font-black font-outfit ${obstructionScore >= 75 ? 'text-rose-600' : obstructionScore >= 30 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {isActive ? `${obstructionScore}%` : '0%'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold">DETECTED OBJECTS</span>
                <span className="text-base font-black text-sky-700 font-outfit">{detectedObjects.length}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold">LIVE GPS STATUS</span>
                <span className="text-xs font-bold text-slate-800">
                  {locationStatus === 'ACQUIRED'
                    ? '● GPS LOCKED'
                    : locationStatus === 'ACQUIRING'
                    ? '○ ACQUIRING...'
                    : locationStatus === 'DENIED'
                    ? '× GPS DENIED'
                    : '○ STANDBY'}
                </span>
              </div>
            </div>

            {/* Quick Manual SOS Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={triggerManualSOS}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-transform hover:scale-102 cursor-pointer font-mono"
              >
                <Send className="w-3.5 h-3.5 fill-white" />
                <span>MANUAL SOS DISPATCH</span>
              </button>
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

          {/* Safety Recommendations Box */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 font-sans">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Collision SOS Safety Rules</span>
            </h3>
            <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1 shrink-0" />
                <span>Front camera blockage triggers 15-second SOS countdown.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1 shrink-0" />
                <span>Tap <strong>I&apos;M OK — CANCEL SOS</strong> to cancel false positives.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
                <span>All registered emergency contacts receive real-time Google Maps link.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

