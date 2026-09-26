'use client';

import React from 'react';
import { Camera, Smartphone, Laptop, RefreshCw, Play, Square, VideoOff } from 'lucide-react';
import { CameraStatus, CameraSourceType } from '@/hooks/useWebcam';

interface CockpitCameraHUDProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  cameraStatus: CameraStatus;
  cameraSource: CameraSourceType;
  deviceLabel?: string;
  fps?: number;
  onSwitchSource?: (source: CameraSourceType) => void;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  detectedCount?: number;
}

export const CockpitCameraHUD: React.FC<CockpitCameraHUDProps> = ({
  videoRef,
  canvasRef,
  cameraStatus,
  cameraSource,
  deviceLabel = 'DroidCam Video',
  fps = 30,
  onSwitchSource,
  onStartCamera,
  onStopCamera,
  detectedCount = 0
}) => {
  const isActive = cameraStatus === 'CAMERA_ACTIVE';
  const isStarting = cameraStatus === 'CAMERA_STARTING';

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
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            {isActive ? '● CAM ACTIVE' : isStarting ? '○ STARTING...' : '○ CAMERA OFF'}
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

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#FFFAF0]/95 z-20">
            <VideoOff className="w-10 h-10 text-slate-400" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-800 block uppercase font-mono">
                {isStarting ? 'INITIALIZING CAMERA HARDWARE...' : 'CAMERA INACTIVE'}
              </span>
              <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed font-sans font-medium">
                {cameraStatus === 'USB_MOBILE_CAMERA_NOT_DETECTED'
                  ? 'Ensure DroidCam is active on your mobile device.'
                  : isStarting
                  ? 'Requesting webcam permissions...'
                  : 'Hardware stream released. Click START CAMERA to initialize live road safety feed.'}
              </p>
            </div>
            {onStartCamera && !isStarting && (
              <button
                onClick={onStartCamera}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START CAMERA</span>
              </button>
            )}
          </div>
        )}

        {isActive && (
          <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none text-[10px] font-mono">
            <div className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-slate-800 backdrop-blur-md shadow-sm">
              DEVICE: <span className="text-sky-700 font-bold">{deviceLabel || 'DroidCam Video'}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-slate-800 backdrop-blur-md shadow-sm">
              FPS: <span className="text-emerald-700 font-bold">{fps}</span> | OBJECTS: <span className="text-amber-700 font-bold">{detectedCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* Prominent START CAMERA / STOP CAMERA Control Bar */}
      <div className="pt-1 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500">
          Selected Source: <strong className="text-sky-700 font-bold">{cameraSource === 'USB_MOBILE_CAMERA' ? 'USB Phone' : 'Laptop Cam'}</strong>
        </div>

        {isActive ? (
          <button
            onClick={onStopCamera}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 hover:scale-105 transition-all cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>STOP CAMERA</span>
          </button>
        ) : (
          <button
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
  );
};

export default CockpitCameraHUD;
