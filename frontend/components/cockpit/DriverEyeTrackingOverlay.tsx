'use client';

import React, { useEffect, useRef } from 'react';

export interface EyeTrackingTelemetry {
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

interface DriverEyeTrackingOverlayProps {
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  trackingData?: EyeTrackingTelemetry;
}

export const DriverEyeTrackingOverlay: React.FC<DriverEyeTrackingOverlayProps> = ({
  canvasRef: externalCanvasRef,
  isActive,
  trackingData
}) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;

  // Stable ref for incoming perception telemetry to feed the 60 FPS animation loop
  const trackingDataRef = useRef<EyeTrackingTelemetry>({
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

  // 60 FPS High-Performance Canvas Rendering Loop
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
      smooth.arcAngle += 0.045;

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

      // --- 1. FACE DETECTED OVERLAY (EYE RINGS + CORNERS + LANDMARKS + SCANNER) ---
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

        // A. Face Corner Brackets (Feature 1: Minimal corner brackets ┌ ┐ └ ┘)
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

        // B. Facial Landmark Points & Contours (Feature 5: Subtle landmarks)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = mainColor;
        ctx.fillStyle = mainColor;
        ctx.globalAlpha = isDrowsy ? 0.6 : isClosing ? 0.5 : 0.38;
        ctx.lineWidth = 0.8;

        const midX = (lx + rx) / 2;
        const midY = (ly + ry) / 2;

        // 1. Left Eyebrow Arch
        ctx.beginPath();
        ctx.moveTo(lx - 12, ly - 9);
        ctx.quadraticCurveTo(lx, ly - 13, lx + 10, ly - 9);
        ctx.stroke();
        [ [lx - 12, ly - 9], [lx - 3, ly - 12], [lx + 10, ly - 9] ].forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // 2. Right Eyebrow Arch
        ctx.beginPath();
        ctx.moveTo(rx - 10, ry - 9);
        ctx.quadraticCurveTo(rx, ry - 13, rx + 12, ry - 9);
        ctx.stroke();
        [ [rx - 10, ry - 9], [rx + 3, ry - 12], [rx + 12, ry - 9] ].forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // 3. Nose Bridge & Tip
        const noseTipY = fy + fh * 0.58;
        ctx.beginPath();
        ctx.moveTo(midX, midY + 4);
        ctx.lineTo(midX, noseTipY);
        ctx.lineTo(midX - 5, noseTipY + 4);
        ctx.lineTo(midX + 5, noseTipY + 4);
        ctx.stroke();
        [ [midX, midY + 4], [midX, noseTipY], [midX - 5, noseTipY + 4], [midX + 5, noseTipY + 4] ].forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 1.1, 0, Math.PI * 2);
          ctx.fill();
        });

        // 4. Subtle Lip Contour
        const mouthCenterY = fy + fh * 0.76;
        const mouthW = fw * 0.16;
        ctx.beginPath();
        ctx.moveTo(midX - mouthW, mouthCenterY);
        ctx.quadraticCurveTo(midX, mouthCenterY - 3, midX + mouthW, mouthCenterY);
        ctx.quadraticCurveTo(midX, mouthCenterY + 4, midX - mouthW, mouthCenterY);
        ctx.stroke();

        // 5. Subtle Jawline Anchor Nodes
        [ [fx + fw * 0.15, fy + fh * 0.88], [midX, fy + fh * 0.96], [fx + fw * 0.85, fy + fh * 0.88] ].forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // C. Subtle AI Vertical Scanning Laser Line (Feature 6)
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

        // D. AI Status Tag below Face Box
        ctx.shadowBlur = 0;
        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = mainColor;
        const statusText = isDrowsy
          ? '⚠ DROWSINESS DETECTED (EYES CLOSED)'
          : isClosing
          ? 'EYE CLOSURE DETECTED'
          : '● AI TRACKING ACTIVE';
        ctx.fillText(statusText, fx + 2, fy + fh + 15);

        // E. Eye-to-Eye Connection Tracking Line (Feature 4: ◎ · · · · · · ◎)
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint bridge dot
        ctx.beginPath();
        ctx.arc(midX, midY, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();

        // F. Eye Tracking Rings & Pupil Center Points (Features 2 & 3)
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

          // Center Pupil / Tracking Dot (Feature 3)
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

      // --- 3. SMALL AI STATUS BADGE (Feature 7: Top-Left of Video) ---
      ctx.save();
      const badgeX = 10;
      const badgeY = 10;
      const badgeW = 152;
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

      // Bottom line: EYES DETECTED / EYES CLOSING / DROWSINESS ALERT
      ctx.font = '7.5px monospace';
      ctx.fillStyle = isDrowsy ? '#EF4444' : isClosing ? '#F59E0B' : '#38BDF8';
      const badgeSub = isDrowsy
        ? '⚠ DROWSINESS DETECTED'
        : isClosing
        ? '▲ EYES CLOSING'
        : '● EYES DETECTED';
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
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-hidden"
    />
  );
};

export default DriverEyeTrackingOverlay;
