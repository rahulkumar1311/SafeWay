'use client';

import React from 'react';
import { Camera, Smartphone, Laptop, RefreshCw, Play, Square, VideoOff, Sparkles, AlertCircle } from 'lucide-react';
import { CameraStatus, CameraSourceType } from '@/hooks/useWebcam';
import DriverEyeTrackingOverlay, { EyeTrackingTelemetry } from '@/components/cockpit/DriverEyeTrackingOverlay';

export type CockpitTrackingData = EyeTrackingTelemetry;

interface CockpitCameraHUDProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cameraStatus: CameraStatus;
  cameraSource: CameraSourceType;
  deviceLabel?: string;
  errorMessage?: string;
  fps?: number;
  onSwitchSource?: (source: CameraSourceType) => void;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  detectedCount?: number;
  trackingData?: CockpitTrackingData;
  isSimulating?: boolean;
  onToggleSimulation?: () => void;
}

export const CockpitCameraHUD: React.FC<CockpitCameraHUDProps> = ({
  videoRef,
  canvasRef,
  cameraStatus,
  cameraSource,
  deviceLabel = 'Integrated Webcam',
  errorMessage = '',
  fps = 30,
  onSwitchSource,
  onStartCamera,
  onStopCamera,
  detectedCount = 0,
  trackingData,
  isSimulating = false,
  onToggleSimulation
}) => {
  const isActive = cameraStatus === 'CAMERA_ACTIVE';
  const isStarting = cameraStatus === 'CAMERA_STARTING';
  const isError = cameraStatus === 'CAMERA_ERROR' || cameraStatus === 'CAMERA_DENIED' || cameraStatus === 'USB_MOBILE_CAMERA_NOT_DETECTED';

  return (
    <div className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 font-mono">
      {/* Card Header & Device Selection */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Camera className="w-4 h-4 text-sky-600" />
          <span>ROAD SAFETY CAMERA FEED</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {onSwitchSource && (
            <button
              type="button"
              onClick={() => onSwitchSource(cameraSource === 'USB_MOBILE_CAMERA' ? 'LAPTOP_CAMERA' : 'USB_MOBILE_CAMERA')}
              className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Switch camera device source"
            >
              {cameraSource === 'USB_MOBILE_CAMERA' ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span>USB PHONE</span>
                </>
              ) : (
                <>
                  <Laptop className="w-3.5 h-3.5 text-slate-500" />
                  <span>LAPTOP CAM</span>
                </>
              )}
            </button>
          )}

          <span className={`px-2.5 py-1 rounded-xl border font-bold ${
            isActive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : isStarting
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : isError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            {isActive ? '● CAM ACTIVE' : isStarting ? '○ STARTING...' : isError ? '⚠ CAM ERROR' : '○ CAMERA OFF'}
          </span>
        </div>
      </div>

      {/* Video Stream & Processing Canvas Frame */}
      <div className="relative w-full h-[240px] sm:h-[280px] rounded-xl overflow-hidden bg-[#FFFAF0] border border-slate-200 flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Real-Time AI Driver Eye Tracking & Facial Landmark Overlay */}
        <DriverEyeTrackingOverlay
          canvasRef={canvasRef}
          isActive={isActive || isSimulating}
          trackingData={trackingData}
        />

        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FFFAF0]/95 z-20">
            {isError ? (
              <AlertCircle className="w-10 h-10 text-rose-500" />
            ) : (
              <VideoOff className="w-10 h-10 text-slate-400" />
            )}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 block uppercase font-mono">
                {isStarting ? 'INITIALIZING CAMERA HARDWARE...' : isError ? 'CAMERA UNAVAILABLE' : 'CAMERA INACTIVE'}
              </span>
              <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans font-medium">
                {errorMessage || (cameraStatus === 'USB_MOBILE_CAMERA_NOT_DETECTED'
                  ? 'Ensure DroidCam or USB phone is connected. You can also switch to Laptop Cam above or run simulation below.'
                  : isStarting
                  ? 'Requesting webcam permissions...'
                  : 'Click START CAMERA to begin driver monitoring, or test with SIMULATE DROWSINESS below.')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {onStartCamera && !isStarting && (
                <button
                  type="button"
                  onClick={onStartCamera}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>START CAMERA</span>
                </button>
              )}

              {onToggleSimulation && (
                <button
                  type="button"
                  onClick={onToggleSimulation}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isSimulating
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isSimulating ? 'STOP SIMULATION' : 'SIMULATE DROWSINESS'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {isActive && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none text-[10px] font-mono">
            <div className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-slate-800 backdrop-blur-md shadow-sm">
              DEVICE: <span className="text-sky-700 font-bold">{deviceLabel || 'Integrated Webcam'}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-slate-800 backdrop-blur-md shadow-sm">
              FPS: <span className="text-emerald-700 font-bold">{fps}</span> | OBJECTS: <span className="text-amber-700 font-bold">{detectedCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Prominent START CAMERA / STOP CAMERA Control Bar */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500">
          Selected Source: <strong className="text-sky-700 font-bold">{cameraSource === 'USB_MOBILE_CAMERA' ? 'USB Phone' : 'Laptop Cam'}</strong>
        </div>

        <div className="flex items-center gap-2">
          {onToggleSimulation && (
            <button
              type="button"
              onClick={onToggleSimulation}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isSimulating
                  ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-600/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{isSimulating ? 'SIMULATION ON' : 'SIMULATE'}</span>
            </button>
          )}

          {isActive ? (
            <button
              type="button"
              onClick={onStopCamera}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 hover:scale-105 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>STOP CAMERA</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartCamera}
              disabled={isStarting}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 hover:scale-105 transition-all cursor-pointer"
            >
              {isStarting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              <span>{isStarting ? 'STARTING...' : 'START CAMERA'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CockpitCameraHUD;
