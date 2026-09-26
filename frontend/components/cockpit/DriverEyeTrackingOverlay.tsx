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
    leftEAR: 0.29,
    rightEAR: 0.28,
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
      arcAngle: 0,
      counterAngle: 0
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
      smooth.counterAngle -= 0.035;

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
      const mainColor = isDrowsy ? '#FF1744' : isClosing ? '#FFB300' : '#00E5FF';
      const secondaryColor = isDrowsy ? '#DC2626' : isClosing ? '#D97706' : '#0284C7';
      const glowColor = isDrowsy
        ? 'rgba(255, 23, 68, 0.65)'
        : isClosing
        ? 'rgba(255, 179, 0, 0.55)'
        : 'rgba(0, 229, 255, 0.45)';

      // --- 1. FACE DETECTED OVERLAY (EYE RINGS + CORNERS + MESH + SCANNER) ---
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
        const midX = (lx + rx) / 2;
        const midY = (ly + ry) / 2;

        // Pulsing Face Overlay for Drowsiness Alert (RED -> transparent -> RED)
        if (isDrowsy) {
          const pulseAlpha = 0.14 + (Math.sin(elapsed * 8) + 1) * 0.09;
          ctx.fillStyle = `rgba(239, 68, 68, ${pulseAlpha})`;
          ctx.fillRect(fx, fy, fw, fh);
        }

        // A. Precision Face Target Brackets with Vernier Ticks (┌ ┐ └ ┘)
        const cornerLen = Math.min(26, fw * 0.24);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = isDrowsy ? 2.8 : 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isDrowsy ? 12 : 7;

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

        // Corner Accent Dots
        [ [fx, fy], [fx + fw, fy], [fx, fy + fh], [fx + fw, fy + fh] ].forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, 2.0, 0, Math.PI * 2);
          ctx.fillStyle = mainColor;
          ctx.fill();
        });

        // Vertical Alignment Vernier Scale Ticks on Left & Right
        const numTicks = 4;
        for (let i = 1; i <= numTicks; i++) {
          const tickY = fy + (fh / (numTicks + 1)) * i;
          ctx.beginPath();
          ctx.moveTo(fx - 4, tickY);
          ctx.lineTo(fx, tickY);
          ctx.moveTo(fx + fw, tickY);
          ctx.lineTo(fx + fw + 4, tickY);
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // B. Cybernetic AI Facial Landmark Mesh Topology Grid
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = mainColor;
        ctx.fillStyle = mainColor;
        ctx.globalAlpha = isDrowsy ? 0.65 : isClosing ? 0.52 : 0.38;
        ctx.lineWidth = 0.8;

        const foreheadX1 = fx + fw * 0.3;
        const foreheadX2 = fx + fw * 0.7;
        const foreheadY = fy + fh * 0.12;

        const leftTemple = [fx + fw * 0.12, fy + fh * 0.32];
        const rightTemple = [fx + fw * 0.88, fy + fh * 0.32];
        const leftCheek = [fx + fw * 0.18, fy + fh * 0.62];
        const rightCheek = [fx + fw * 0.82, fy + fh * 0.62];
        const noseTip = [midX, fy + fh * 0.58];
        const chin = [midX, fy + fh * 0.94];
        const mouthL = [midX - fw * 0.16, fy + fh * 0.76];
        const mouthR = [midX + fw * 0.16, fy + fh * 0.76];

        // 1. Forehead Triangulation
        ctx.beginPath();
        ctx.moveTo(foreheadX1, foreheadY);
        ctx.lineTo(foreheadX2, foreheadY);
        ctx.lineTo(midX, midY - 6);
        ctx.lineTo(foreheadX1, foreheadY);
        ctx.stroke();

        // 2. Temple & Cheek Interconnect Wireframe
        ctx.beginPath();
        ctx.moveTo(leftTemple[0], leftTemple[1]);
        ctx.lineTo(lx, ly);
        ctx.lineTo(leftCheek[0], leftCheek[1]);
        ctx.lineTo(noseTip[0], noseTip[1]);
        ctx.lineTo(rightCheek[0], rightCheek[1]);
        ctx.lineTo(rx, ry);
        ctx.lineTo(rightTemple[0], rightTemple[1]);
        ctx.stroke();

        // 3. Eyebrow Arches
        ctx.beginPath();
        ctx.moveTo(lx - 12, ly - 9);
        ctx.quadraticCurveTo(lx, ly - 13, lx + 10, ly - 9);
        ctx.moveTo(rx - 10, ry - 9);
        ctx.quadraticCurveTo(rx, ry - 13, rx + 12, ry - 9);
        ctx.stroke();

        // 4. Nose Bridge Axis
        ctx.beginPath();
        ctx.moveTo(midX, midY - 4);
        ctx.lineTo(noseTip[0], noseTip[1]);
        ctx.lineTo(noseTip[0] - 5, noseTip[1] + 4);
        ctx.lineTo(noseTip[0] + 5, noseTip[1] + 4);
        ctx.stroke();

        // 5. Mouth Contour & Chin Interconnect
        ctx.beginPath();
        ctx.moveTo(mouthL[0], mouthL[1]);
        ctx.quadraticCurveTo(midX, mouthL[1] - 3, mouthR[0], mouthR[1]);
        ctx.quadraticCurveTo(midX, mouthL[1] + 4, mouthL[0], mouthL[1]);
        ctx.moveTo(mouthL[0], mouthL[1]);
        ctx.lineTo(chin[0], chin[1]);
        ctx.lineTo(mouthR[0], mouthR[1]);
        ctx.stroke();

        // 6. Draw Glowing Vertex Mesh Nodes
        const meshNodes = [
          [foreheadX1, foreheadY],
          [foreheadX2, foreheadY],
          [midX, midY - 6],
          leftTemple,
          rightTemple,
          leftCheek,
          rightCheek,
          noseTip,
          mouthL,
          mouthR,
          chin,
          [lx - 12, ly - 9],
          [lx + 10, ly - 9],
          [rx - 10, ry - 9],
          [rx + 12, ry - 9]
        ];

        meshNodes.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();

        // C. Futuristic Bi-Directional Scanning Laser Beam with Trailing Aura
        const scanPhase = (Math.sin(elapsed * 2.8) + 1) / 2;
        const scanY = fy + 10 + scanPhase * (fh - 20);

        const scanGrad = ctx.createLinearGradient(fx, scanY - 8, fx, scanY + 8);
        scanGrad.addColorStop(0, 'rgba(0, 229, 255, 0.0)');
        scanGrad.addColorStop(
          0.5,
          isDrowsy ? 'rgba(255, 23, 68, 0.4)' : isClosing ? 'rgba(255, 179, 0, 0.32)' : 'rgba(0, 229, 255, 0.25)'
        );
        scanGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

        ctx.fillStyle = scanGrad;
        ctx.fillRect(fx + 2, scanY - 8, fw - 4, 16);

        ctx.beginPath();
        ctx.moveTo(fx + 4, scanY);
        ctx.lineTo(fx + fw - 4, scanY);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.3;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 7;
        ctx.stroke();

        // D. Status Tag Below Face Box
        ctx.shadowBlur = 0;
        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = mainColor;
        const statusText = isDrowsy
          ? '⚠ DROWSINESS DETECTED (EYES CLOSED)'
          : isClosing
          ? '▲ EYE CLOSURE DETECTED'
          : '● AI MESH: 468 PTS (ACTIVE)';
        ctx.fillText(statusText, fx + 2, fy + fh + 15);

        // E. Eye-to-Eye Connection Tracking Line with Center Perception Node (◎ · · · · · · ◎)
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
        ctx.arc(midX, midY, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();

        // F. Dual-Ring Counter-Rotating Eye Optics Reticles
        const drawEyeReticle = (cx: number, cy: number, label: string, earVal: number | null | undefined) => {
          const pulse = Math.sin(elapsed * 5) * 1.5;
          const outerR = Math.max(13, fw * 0.075) + (isDrowsy ? Math.sin(elapsed * 9) * 3 : pulse);
          const innerR = outerR * 0.55;

          // 1. Outer Ring with 8 Precision Crosshair Ticks
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 1.4;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = isDrowsy ? 10 : 6;
          ctx.stroke();

          // 8 Compass Ticks (0, 45, 90, 135, 180, 225, 270, 315 deg)
          const tickLen = 3.2;
          const numAngles = 8;
          for (let a = 0; a < numAngles; a++) {
            const ang = (a * Math.PI) / 4;
            const x1 = cx + Math.cos(ang) * (outerR - tickLen);
            const y1 = cy + Math.sin(ang) * (outerR - tickLen);
            const x2 = cx + Math.cos(ang) * (outerR + tickLen);
            const y2 = cy + Math.sin(ang) * (outerR + tickLen);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = secondaryColor;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }

          // 2. Rotating Clockwise Arc on Outer Edge
          ctx.beginPath();
          ctx.arc(cx, cy, outerR + 2.5, smooth.arcAngle, smooth.arcAngle + Math.PI * 0.7);
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // 3. Counter-Rotating Inner Dashed Reticle
          ctx.beginPath();
          ctx.setLineDash([2, 2]);
          ctx.arc(cx, cy, innerR, smooth.counterAngle, smooth.counterAngle + Math.PI * 1.8);
          ctx.strokeStyle = secondaryColor;
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.setLineDash([]);

          // 4. Center Glowing Pupil Tracking Core
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = mainColor;
          ctx.shadowBlur = 8;
          ctx.fill();

          // 5. Eye Pill Metric Tag
          ctx.shadowBlur = 0;
          ctx.font = 'bold 7px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          const earTag = earVal !== null && earVal !== undefined ? ` (${earVal.toFixed(2)})` : '';
          ctx.fillText(`${label}${earTag}`, cx - 12, cy - outerR - 4);
        };

        // Render Left and Right Eye Reticles
        drawEyeReticle(lx, ly, 'L-EYE', data.leftEAR || data.ear);
        drawEyeReticle(rx, ry, 'R-EYE', data.rightEAR || data.ear);

        ctx.restore();
      }

      // --- 2. SEARCHING FOR FACE (RADAR EFFECT) ---
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

        ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';

        // 4 Searching Corners
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

        // Sweeping Radar Beam
        const radarY = sfy + ((Math.sin(elapsed * 2) + 1) / 2) * sBoxH;
        ctx.beginPath();
        ctx.moveTo(sfx + 4, radarY);
        ctx.lineTo(sfx + sBoxW - 4, radarY);
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
        ctx.stroke();

        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('SEARCHING FOR FACE...', centerX, centerY + sBoxH / 2 + 18);
        ctx.textAlign = 'left';

        ctx.restore();
      }

      // --- 3. SMALL AUTOMOTIVE GLASS AI STATUS BADGE (Top-Left) ---
      ctx.save();
      const badgeX = 10;
      const badgeY = 10;
      const badgeW = 156;
      const badgeH = 34;
      const bR = 6;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isDrowsy
        ? 'rgba(255, 23, 68, 0.75)'
        : isClosing
        ? 'rgba(255, 179, 0, 0.65)'
        : 'rgba(255, 255, 255, 0.18)';
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

      // Top Line: ◉ AI DRIVER MONITOR
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = mainColor;
      ctx.fillText('◉ AI DRIVER MONITOR', badgeX + 8, badgeY + 13);

      // Bottom Line: Dynamic Perception Subtext
      ctx.font = '7.5px monospace';
      ctx.fillStyle = isDrowsy ? '#FF1744' : isClosing ? '#FFB300' : '#38BDF8';
      const badgeSub = isDrowsy
        ? '⚠ DROWSINESS DETECTED'
        : isClosing
        ? '▲ EYES CLOSING'
        : '● EYE TRACKING ACTIVE';
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
