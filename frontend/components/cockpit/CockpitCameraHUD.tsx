'use client';

import React, { useEffect, useRef } from 'react';
import { Camera, Smartphone, Laptop, RefreshCw, Play, Square, VideoOff } from 'lucide-react';
import { CameraStatus, CameraSourceType } from '@/hooks/useWebcam';

export interface CockpitTrackingData {
  faceDetected?: boolean;
  score?: number | null;
  isDrowsy?: boolean;
  alertState?: 'NORMAL' | 'WARNING' | 'DROWSY' | 'ALERT';
  ear?: number | null;
  leftEAR?: number | null;
  rightEAR?: number | null;
  eyeState?: string;
  closureDurationMs?: number;
  faceRect?: [number, number, number, number] | number[] | null; // [x, y, w, h]
  leftEyeCenter?: [number, number] | number[] | null; // [x, y]
  rightEyeCenter?: [number, number] | number[] | null; // [x, y]
  frameWidth?: number;
  frameHeight?: number;
}

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
  trackingData?: CockpitTrackingData;
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
  detectedCount = 0,
  trackingData
}) => {
  const isActive = cameraStatus === 'CAMERA_ACTIVE';
  const isStarting = cameraStatus === 'CAMERA_STARTING';

  // Keep a stable ref for tracking data to feed the 60 FPS canvas loop
  const trackingDataRef = useRef<CockpitTrackingData>({
    faceDetected: true,
    score: 12,
    isDrowsy: false,
    alertState: 'NORMAL',
    ear: 0.28,
    eyeState: 'OPEN',
    closureDurationMs: 0,
    faceRect: null,
    leftEyeCenter: null,
    rightEyeCenter: null,
    frameWidth: 480,
    frameHeight: 360
  });

  useEffect(() => {
    if (trackingData) {
      trackingDataRef.current = {
        ...trackingDataRef.current,
        ...trackingData
      };
    }
  }, [trackingData]);

  // Dedicated 60 FPS RequestAnimationFrame Canvas Animation Loop
  useEffect(() => {
    if (!isActive) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    let animId: number;
    const startTime = performance.now();

    // Smoothed state coordinates for jitter-free interpolation
    const smooth = {
      opacity: 0,
      fx: 0,
      fy: 0,
      fw: 0,
      fh: 0,
      lx: 0,
      ly: 0,
      rx: 0,
      ry: 0,
      arcAngle: 0
    };

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayW = rect.width || 320;
      const displayH = rect.height || 240;

      if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
        canvas.width = Math.round(displayW * dpr);
        canvas.height = Math.round(displayH * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayW, displayH);

      const data = trackingDataRef.current;
      const isFace = data.faceDetected !== false;
      const targetOpacity = isFace ? 1.0 : 0.0;
      smooth.opacity += (targetOpacity - smooth.opacity) * 0.15;
      smooth.arcAngle += 0.05;

      const fw = data.frameWidth || 480;
      const fh = data.frameHeight || 360;

      // Extract normalized coordinates from trackingData
      let fxNorm = 0.25;
      let fyNorm = 0.18;
      let fwNorm = 0.50;
      let fhNorm = 0.62;
      let lxNorm = 0.40;
      let lyNorm = 0.42;
      let rxNorm = 0.60;
      let ryNorm = 0.42;

      if (data.faceRect && Array.isArray(data.faceRect) && data.faceRect.length === 4) {
        const [rx, ry, rw, rh] = data.faceRect;
        fxNorm = rx / fw;
        fyNorm = ry / fh;
        fwNorm = rw / fw;
        fhNorm = rh / fh;
      }

      if (data.leftEyeCenter && Array.isArray(data.leftEyeCenter) && data.leftEyeCenter.length === 2) {
        lxNorm = data.leftEyeCenter[0] / fw;
        lyNorm = data.leftEyeCenter[1] / fh;
      } else {
        lxNorm = fxNorm + fwNorm * 0.33;
        lyNorm = fyNorm + fhNorm * 0.38;
      }

      if (data.rightEyeCenter && Array.isArray(data.rightEyeCenter) && data.rightEyeCenter.length === 2) {
        rxNorm = data.rightEyeCenter[0] / fw;
        ryNorm = data.rightEyeCenter[1] / fh;
      } else {
        rxNorm = fxNorm + fwNorm * 0.67;
        ryNorm = fyNorm + fhNorm * 0.38;
      }

      // Target pixel coordinates on display canvas
      const targetFx = fxNorm * displayW;
      const targetFy = fyNorm * displayH;
      const targetFw = Math.max(70, fwNorm * displayW);
      const targetFh = Math.max(85, fhNorm * displayH);

      const targetLx = lxNorm * displayW;
      const targetLy = lyNorm * displayH;
      const targetRx = rxNorm * displayW;
      const targetRy = ryNorm * displayH;

      // Smooth lerp (alpha = 0.22)
      smooth.fx += (targetFx - smooth.fx) * 0.22;
      smooth.fy += (targetFy - smooth.fy) * 0.22;
      smooth.fw += (targetFw - smooth.fw) * 0.22;
      smooth.fh += (targetFh - smooth.fh) * 0.22;
      smooth.lx += (targetLx - smooth.lx) * 0.22;
      smooth.ly += (targetLy - smooth.ly) * 0.22;
      smooth.rx += (targetRx - smooth.rx) * 0.22;
      smooth.ry += (targetRy - smooth.ry) * 0.22;

      const isDrowsy = Boolean(
        data.isDrowsy ||
        data.alertState === 'DROWSY' ||
        data.alertState === 'ALERT' ||
        (data.closureDurationMs && data.closureDurationMs >= 3000)
      );

      const isClosing = !isDrowsy && Boolean(
        data.eyeState === 'CLOSED' ||
        data.eyeState === 'CLOSING' ||
        (data.closureDurationMs && data.closureDurationMs > 0) ||
        (data.ear !== null && data.ear !== undefined && data.ear < 0.22)
      );

      // Dynamic Color Theme Palette
      const mainColor = isDrowsy ? '#EF4444' : isClosing ? '#F59E0B' : '#00AEEF';
      const secondaryColor = isDrowsy ? '#DC2626' : isClosing ? '#D97706' : '#1687E8';
      const glowColor = isDrowsy
        ? 'rgba(239, 68, 68, 0.55)'
        : isClosing
        ? 'rgba(245, 158, 11, 0.45)'
        : 'rgba(0, 174, 239, 0.35)';

      // --- 1. FACE DETECTED OVERLAY (EYE RINGS + CORNERS + SCANNER) ---
      if (smooth.opacity > 0.05) {
        ctx.save();
        ctx.globalAlpha = Math.min(1.0, smooth.opacity);

        const fx = smooth.fx;
        const fy = smooth.fy;
        const fw = smooth.fw;
        const fh = smooth.fh;
        const lx = smooth.lx;
        const ly = smooth.ly;
        const rx = smooth.rx;
        const ry = smooth.ry;

        // Pulsing Face Overlay for Drowsiness Alert (RED -> transparent -> RED)
        if (isDrowsy) {
          const pulseAlpha = 0.12 + (Math.sin(elapsed * 8) + 1) * 0.08;
          ctx.fillStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
          ctx.fillRect(fx, fy, fw, fh);
        }

        // A. Face Corner Brackets (Minimal corner brackets ┌ ┐ └ ┘, NOT solid box)
        const cornerLen = Math.min(24, fw * 0.22);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = isDrowsy ? 2.8 : 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isDrowsy ? 10 : 6;

        // Top-Left ┌
        ctx.beginPath();
        ctx.moveTo(fx, fy + cornerLen);
        ctx.lineTo(fx, fy);
        ctx.lineTo(fx + cornerLen, fy);
        ctx.stroke();

        // Top-Right ┐
        ctx.beginPath();
        ctx.moveTo(fx + fw - cornerLen, fy);
        ctx.lineTo(fx + fw, fy);
        ctx.lineTo(fx + fw, fy + cornerLen);
        ctx.stroke();

        // Bottom-Left └
        ctx.beginPath();
        ctx.moveTo(fx, fy + fh - cornerLen);
        ctx.lineTo(fx, fy + fh);
        ctx.lineTo(fx + cornerLen, fy + fh);
        ctx.stroke();

        // Bottom-Right ┘
        ctx.beginPath();
        ctx.moveTo(fx + fw - cornerLen, fy + fh);
        ctx.lineTo(fx + fw, fy + fh);
        ctx.lineTo(fx + fw, fy + fh - cornerLen);
        ctx.stroke();

        // B. Subtle AI Vertical Scanning Laser Line
        const scanPhase = (Math.sin(elapsed * 2.8) + 1) / 2; // 0 to 1
        const scanY = fy + 10 + scanPhase * (fh - 20);

        const scanGrad = ctx.createLinearGradient(fx, scanY - 6, fx, scanY + 6);
        scanGrad.addColorStop(0, 'rgba(0, 174, 239, 0.0)');
        scanGrad.addColorStop(
          0.5,
          isDrowsy ? 'rgba(239, 68, 68, 0.35)' : isClosing ? 'rgba(245, 158, 11, 0.28)' : 'rgba(0, 174, 239, 0.22)'
        );
        scanGrad.addColorStop(1, 'rgba(0, 174, 239, 0.0)');

        ctx.fillStyle = scanGrad;
        ctx.fillRect(fx + 2, scanY - 6, fw - 4, 12);

        ctx.beginPath();
        ctx.moveTo(fx + 4, scanY);
        ctx.lineTo(fx + fw - 4, scanY);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 6;
        ctx.stroke();

        // C. AI Status Tag below Face Box
        ctx.shadowBlur = 0;
        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = mainColor;
        const statusText = isDrowsy
          ? '⚠ DROWSINESS DETECTED (EYES CLOSED)'
          : isClosing
          ? 'EYE CLOSURE DETECTED'
          : '● AI TRACKING ACTIVE';
        ctx.fillText(statusText, fx + 2, fy + fh + 15);

        // D. Eye-to-Eye Connection Tracking Line (◎ · · · · · · ◎)
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint bridge dot
        const midX = (lx + rx) / 2;
        const midY = (ly + ry) / 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();

        // E. Function to Draw Real-Time Eye Tracking Rings + Pupil Dot
        const drawEyeRings = (cx: number, cy: number, label: string) => {
          const pulse = Math.sin(elapsed * 5) * 1.5;
          const outerR = Math.max(12, fw * 0.07) + (isDrowsy ? Math.sin(elapsed * 9) * 3 : pulse);
          const innerR = outerR * 0.54;

          // Outer Concentric Ring
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = isDrowsy ? 9 : 6;
          ctx.stroke();

          // Rotating subtle arc on outer ring
          ctx.beginPath();
          ctx.arc(cx, cy, outerR + 2, smooth.arcAngle, smooth.arcAngle + Math.PI * 0.65);
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 1.1;
          ctx.stroke();

          // 4 Crosshair Ticks (0, 90, 180, 270 deg)
          const tickLen = 3.5;
          const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
          angles.forEach((ang) => {
            const x1 = cx + Math.cos(ang) * (outerR - tickLen);
            const y1 = cy + Math.sin(ang) * (outerR - tickLen);
            const x2 = cx + Math.cos(ang) * (outerR + tickLen);
            const y2 = cy + Math.sin(ang) * (outerR + tickLen);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          });

          // Inner Ring
          ctx.beginPath();
          ctx.setLineDash([2, 2]);
          ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.setLineDash([]);

          // Center Pupil / Tracking Dot
          ctx.beginPath();
          ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = mainColor;
          ctx.shadowBlur = 7;
          ctx.fill();

          // Small Eye Label
          ctx.shadowBlur = 0;
          ctx.font = 'bold 7px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillText(label, cx - 10, cy - outerR - 4);
        };

        // Draw Left and Right Eye Tracking Rings
        drawEyeRings(lx, ly, 'L-EYE');
        drawEyeRings(rx, ry, 'R-EYE');

        ctx.restore();
      }

      // --- 2. SEARCHING FOR FACE (NO FACE DETECTED) ---
      if (smooth.opacity < 0.85) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1.0 - smooth.opacity);

        const centerX = displayW / 2;
        const centerY = displayH / 2;
        const sBoxW = 120;
        const sBoxH = 140;
        const sfx = centerX - sBoxW / 2;
        const sfy = centerY - sBoxH / 2;
        const sCorner = 16;

        ctx.strokeStyle = 'rgba(0, 174, 239, 0.5)';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';

        // 4 searching corners
        ctx.beginPath();
        ctx.moveTo(sfx, sfy + sCorner);
        ctx.lineTo(sfx, sfy);
        ctx.lineTo(sfx + sCorner, sfy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sfx + sBoxW - sCorner, sfy);
        ctx.lineTo(sfx + sBoxW, sfy);
        ctx.lineTo(sfx + sBoxW, sfy + sCorner);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sfx, sfy + sBoxH - sCorner);
        ctx.lineTo(sfx, sfy + sBoxH);
        ctx.lineTo(sfx + sCorner, sfy + sBoxH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sfx + sBoxW - sCorner, sfy + sBoxH);
        ctx.lineTo(sfx + sBoxW, sfy + sBoxH);
        ctx.lineTo(sfx + sBoxW, sfy + sBoxH - sCorner);
        ctx.stroke();

        // Sweeping radar scan line
        const radarY = sfy + ((Math.sin(elapsed * 2) + 1) / 2) * sBoxH;
        ctx.beginPath();
        ctx.moveTo(sfx + 4, radarY);
        ctx.lineTo(sfx + sBoxW - 4, radarY);
        ctx.strokeStyle = 'rgba(0, 174, 239, 0.4)';
        ctx.stroke();

        // Status text
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = 'rgba(0, 174, 239, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('SEARCHING FOR FACE...', centerX, centerY + sBoxH / 2 + 18);
        ctx.textAlign = 'left';

        ctx.restore();
      }

      // --- 3. SMALL AI STATUS BADGE (TOP-LEFT OF VIDEO) ---
      ctx.save();
      const badgeX = 10;
      const badgeY = 10;
      const badgeW = 148;
      const badgeH = 34;
      const bR = 6;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = isDrowsy
        ? 'rgba(239, 68, 68, 0.7)'
        : isClosing
        ? 'rgba(245, 158, 11, 0.6)'
        : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(badgeX + bR, badgeY);
      ctx.lineTo(badgeX + badgeW - bR, badgeY);
      ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + bR, bR);
      ctx.lineTo(badgeX + badgeW, badgeY + badgeH - bR);
      ctx.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - bR, badgeY + badgeH, bR);
      ctx.lineTo(badgeX + bR, badgeY + badgeH);
      ctx.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - bR, bR);
      ctx.lineTo(badgeX, badgeY + bR);
      ctx.arcTo(badgeX, badgeY, badgeX + bR, badgeY, bR);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top line: ◉ AI DRIVER MONITOR
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = mainColor;
      ctx.fillText('◉ AI DRIVER MONITOR', badgeX + 8, badgeY + 13);

      // Bottom line: EYE TRACKING ACTIVE / BLINK / ALERT
      ctx.font = '7.5px monospace';
      ctx.fillStyle = isDrowsy ? '#EF4444' : isClosing ? '#F59E0B' : '#38BDF8';
      const badgeSub = isDrowsy
        ? '⚠ DROWSINESS ALERT'
        : isClosing
        ? '▲ EYE CLOSURE DETECTED'
        : 'EYE TRACKING ACTIVE';
      ctx.fillText(badgeSub, badgeX + 8, badgeY + 25);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isActive]);

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

        {/* Real-Time AI Eye Detection & Driver Perception Canvas Overlay */}
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
