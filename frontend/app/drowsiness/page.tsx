'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  AlertCircle,
  Volume2,
  VolumeX,
  User,
  Timer
} from 'lucide-react';
import { useWebcam } from '@/hooks/useWebcam';
import aiApi from '@/services/aiApi';

export default function DrowsinessPage() {
  // 1. Audio Alarm Engine with Web Audio API synthesizer & Web Speech Synthesis
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[Drowsiness Audio] Init error:', e);
    }
  }, []);

  // Sharp, urgent two-tone alert buzzer
  const playAlertBuzzer = useCallback(() => {
    if (isSoundMuted || typeof window === 'undefined') return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // Two-tone high-pitch alternating alarm (880Hz to 1100Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.15);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('[Drowsiness Audio] Play buzzer note:', e);
    }
  }, [initAudio, isSoundMuted]);

  // Spoken voice warning via SpeechSynthesis
  const speakVoiceAlert = useCallback(
    (text: string) => {
      if (isSoundMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('[Drowsiness Audio] Voice synthesis note:', e);
      }
    },
    [isSoundMuted]
  );

  const startContinuousAlarm = useCallback(() => {
    if (alarmIntervalRef.current) return;
    playAlertBuzzer();
    speakVoiceAlert('Warning: Driver drowsiness detected! Open your eyes!');
    alarmIntervalRef.current = setInterval(() => {
      playAlertBuzzer();
    }, 600);
  }, [playAlertBuzzer, speakVoiceAlert]);

  const stopContinuousAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // 2. Continuous 3-Second Eye-Closure State via Stable Refs
  const closedStartTimeRef = useRef<number | null>(null);
  const missedFramesRef = useRef<number>(0);
  const isAlarmTriggeredRef = useRef<boolean>(false);
  const lastLogTimeRef = useRef<number>(0);

  // Live Telemetry state for UI
  const [telemetry, setTelemetry] = useState<{
    faceDetected: boolean;
    eyeState: 'OPEN' | 'CLOSED' | 'CLOSING' | 'UNKNOWN' | 'NO_FACE';
    ear: number | null;
    leftEAR: number | null;
    rightEAR: number | null;
    closureDurationMs: number;
    score: number;
    isDrowsy: boolean;
    alertState: 'NORMAL' | 'EYES_CLOSED_WARNING' | 'DROWSINESS_ALERT' | 'NO_FACE';
  }>({
    faceDetected: false,
    eyeState: 'UNKNOWN',
    ear: null,
    leftEAR: null,
    rightEAR: null,
    closureDurationMs: 0,
    score: 0,
    isDrowsy: false,
    alertState: 'NORMAL'
  });

  // 3. Robust Webcam Hook with Exact Device Selection, DroidCam IP Stream & 3 FPS AI Sampling
  const {
    videoRef,
    imgStreamRef,
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
    ipStreamUrl,
    setIpStreamUrl,
    startIpStream,
    startCamera,
    stopCamera
  } = useWebcam({
    fps: 3, // Sampling at 3 FPS (every 330ms) for responsive 3-second eye closure detection
    jpegQuality: 0.5,
    targetWidth: 480,
    targetHeight: 360,
    onFrame: async (base64Frame) => {
      try {
        const res = await aiApi.analyzeDrowsiness('drowsiness_page_session', base64Frame);
        if (!res || !res.success || !res.data) return;

        const data = res.data;
        const now = Date.now();
        const faceDetected = Boolean(data.faceDetected);

        let eyeState: 'OPEN' | 'CLOSED' | 'CLOSING' | 'UNKNOWN' | 'NO_FACE' = 'UNKNOWN';
        let isClosed = false;
        const ear = data.ear !== undefined && data.ear !== null ? Number(data.ear) : null;
        const leftEAR = data.leftEAR !== undefined && data.leftEAR !== null ? Number(data.leftEAR) : null;
        const rightEAR = data.rightEAR !== undefined && data.rightEAR !== null ? Number(data.rightEAR) : null;

        if (!faceDetected) {
          missedFramesRef.current += 1;
          // Grace period: allow 2 missed frames for momentary motion blur before resetting
          if (missedFramesRef.current > 2) {
            closedStartTimeRef.current = null;
            if (isAlarmTriggeredRef.current) {
              isAlarmTriggeredRef.current = false;
              stopContinuousAlarm();
            }
            eyeState = 'NO_FACE';
          } else {
            eyeState = 'UNKNOWN';
          }
        } else {
          missedFramesRef.current = 0;

          // Reliable eye state threshold: EAR < 0.22 is CLOSED/CLOSING
          if (data.eyeState === 'CLOSED' || data.eyeState === 'CLOSING' || (ear !== null && ear < 0.22)) {
            isClosed = true;
            eyeState = (data.eyeState as any) || 'CLOSED';
          } else if (data.eyeState === 'OPEN' || (ear !== null && ear >= 0.22)) {
            isClosed = false;
            eyeState = 'OPEN';
          } else {
            eyeState = (data.eyeState as any) || 'UNKNOWN';
          }

          if (isClosed) {
            if (closedStartTimeRef.current === null) {
              closedStartTimeRef.current = now;
            }
          } else {
            closedStartTimeRef.current = null;
            if (isAlarmTriggeredRef.current) {
              isAlarmTriggeredRef.current = false;
              stopContinuousAlarm();
            }
          }
        }

        // Calculate continuous duration of closed eyes
        let durationMs = 0;
        if (closedStartTimeRef.current !== null) {
          durationMs = now - closedStartTimeRef.current;
        }

        let alertState: 'NORMAL' | 'EYES_CLOSED_WARNING' | 'DROWSINESS_ALERT' | 'NO_FACE' = 'NORMAL';
        let isDrowsy = false;
        let score = Math.max(0, Number(data.drowsinessScore) || 0);

        if (!faceDetected && missedFramesRef.current > 2) {
          alertState = 'NO_FACE';
          score = 0;
        } else if (durationMs >= 3000) {
          // Continuous 3.0 seconds closure triggered
          alertState = 'DROWSINESS_ALERT';
          isDrowsy = true;
          score = Math.max(85, score);

          if (!isAlarmTriggeredRef.current) {
            isAlarmTriggeredRef.current = true;
            startContinuousAlarm();
          }
        } else if (durationMs > 0 && isClosed) {
          // Warning countdown phase (0 - 3 seconds)
          alertState = 'EYES_CLOSED_WARNING';
          isDrowsy = false;
          score = Math.max(score, Math.min(75, Math.round((durationMs / 3000) * 80)));
        } else {
          alertState = 'NORMAL';
          isDrowsy = false;
          if (isAlarmTriggeredRef.current) {
            isAlarmTriggeredRef.current = false;
            stopContinuousAlarm();
          }
        }

        // Throttled Diagnostic Logging (max once every 1.5 seconds)
        if (now - lastLogTimeRef.current > 1500) {
          lastLogTimeRef.current = now;
          console.log(
            `[Drowsiness AI] Face: ${faceDetected} | Left EAR: ${leftEAR?.toFixed(2) ?? 'N/A'} | ` +
            `Right EAR: ${rightEAR?.toFixed(2) ?? 'N/A'} | EAR: ${ear?.toFixed(2) ?? 'N/A'} | Eye State: ${eyeState}`
          );
          console.log(
            `[Drowsiness Timer] Eye state: ${eyeState} | Closed duration: ${durationMs}ms | Alarm state: ${alertState}`
          );
        }

        setTelemetry({
          faceDetected,
          eyeState,
          ear,
          leftEAR,
          rightEAR,
          closureDurationMs: durationMs,
          score,
          isDrowsy,
          alertState
        });

        // Extract normalized spatial coordinates from AI response
        const fw = data.frameWidth || 480;
        const fh = data.frameHeight || 360;

        let fxNorm = 0.25;
        let fyNorm = 0.2;
        let fwNorm = 0.5;
        let fhNorm = 0.6;
        let lxNorm = 0.4;
        let lyNorm = 0.42;
        let rxNorm = 0.6;
        let ryNorm = 0.42;
        let hasEyeLandmarks = false;

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
          hasEyeLandmarks = true;
        } else {
          lxNorm = fxNorm + fwNorm * 0.32;
          lyNorm = fyNorm + fhNorm * 0.38;
        }

        if (data.rightEyeCenter && Array.isArray(data.rightEyeCenter) && data.rightEyeCenter.length === 2) {
          rxNorm = data.rightEyeCenter[0] / fw;
          ryNorm = data.rightEyeCenter[1] / fh;
          hasEyeLandmarks = true;
        } else {
          rxNorm = fxNorm + fwNorm * 0.68;
          ryNorm = fyNorm + fhNorm * 0.38;
        }

        trackingDataRef.current = {
          faceDetected,
          fxNorm,
          fyNorm,
          fwNorm,
          fhNorm,
          lxNorm,
          lyNorm,
          rxNorm,
          ryNorm,
          ear,
          leftEAR,
          rightEAR,
          eyeState,
          closureDurationMs: durationMs,
          score,
          isDrowsy,
          alertState,
          hasEyeLandmarks
        };
      } catch (err) {
        // AI stream recovery
      }
    }
  });

  // 4. Stable Reference for 60 FPS Canvas Animation Loop
  const trackingDataRef = useRef<{
    faceDetected: boolean;
    fxNorm: number;
    fyNorm: number;
    fwNorm: number;
    fhNorm: number;
    lxNorm: number;
    lyNorm: number;
    rxNorm: number;
    ryNorm: number;
    ear: number | null;
    leftEAR: number | null;
    rightEAR: number | null;
    eyeState: string;
    closureDurationMs: number;
    score: number;
    isDrowsy: boolean;
    alertState: string;
    hasEyeLandmarks: boolean;
  }>({
    faceDetected: false,
    fxNorm: 0.25,
    fyNorm: 0.2,
    fwNorm: 0.5,
    fhNorm: 0.6,
    lxNorm: 0.4,
    lyNorm: 0.42,
    rxNorm: 0.6,
    ryNorm: 0.42,
    ear: null,
    leftEAR: null,
    rightEAR: null,
    eyeState: 'UNKNOWN',
    closureDurationMs: 0,
    score: 0,
    isDrowsy: false,
    alertState: 'NORMAL',
    hasEyeLandmarks: false
  });

  // 5. Dedicated 60 FPS RequestAnimationFrame Canvas Animation Loop
  useEffect(() => {
    if (cameraStatus !== 'CAMERA_ACTIVE') {
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
      ry: 0
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
      const displayW = rect.width || 640;
      const displayH = rect.height || 420;

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
      const targetOpacity = data.faceDetected ? 1.0 : 0.0;
      smooth.opacity += (targetOpacity - smooth.opacity) * 0.15;

      // Convert normalized source coordinates to canvas pixel space
      const targetFx = data.fxNorm * displayW;
      const targetFy = data.fyNorm * displayH;
      const targetFw = Math.max(90, data.fwNorm * displayW);
      const targetFh = Math.max(110, data.fhNorm * displayH);

      const targetLx = data.lxNorm * displayW;
      const targetLy = data.lyNorm * displayH;
      const targetRx = data.rxNorm * displayW;
      const targetRy = data.ryNorm * displayH;

      // Smooth lerp (alpha = 0.22)
      smooth.fx += (targetFx - smooth.fx) * 0.22;
      smooth.fy += (targetFy - smooth.fy) * 0.22;
      smooth.fw += (targetFw - smooth.fw) * 0.22;
      smooth.fh += (targetFh - smooth.fh) * 0.22;
      smooth.lx += (targetLx - smooth.lx) * 0.22;
      smooth.ly += (targetLy - smooth.ly) * 0.22;
      smooth.rx += (targetRx - smooth.rx) * 0.22;
      smooth.ry += (targetRy - smooth.ry) * 0.22;

      const isDrowsy = data.isDrowsy || data.closureDurationMs >= 3000;
      const isWarning =
        !isDrowsy &&
        (data.eyeState === 'CLOSED' ||
          data.eyeState === 'CLOSING' ||
          data.closureDurationMs > 0 ||
          (data.ear !== null && data.ear < 0.22));

      // Dynamic automotive theme palette
      const mainColor = isDrowsy ? '#EF4444' : isWarning ? '#F59E0B' : '#00AEEF';
      const glowColor = isDrowsy
        ? 'rgba(239, 68, 68, 0.45)'
        : isWarning
        ? 'rgba(245, 158, 11, 0.4)'
        : 'rgba(0, 174, 239, 0.35)';
      const darkBg = 'rgba(15, 23, 42, 0.75)';

      // --- 1. FACE DETECTED (DRAW EYE TRACKING RINGS + CORNERS + SCANNER) ---
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

        // A. Face Corner Brackets (Minimal corner brackets ┌ ┐ └ ┘, NOT solid rectangle)
        const cornerLen = Math.min(30, fw * 0.22);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;

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

        // B. Subtle AI Vertical Laser Scanning Line
        const scanPhase = (Math.sin(elapsed * 2.8) + 1) / 2; // 0 to 1
        const scanY = fy + 12 + scanPhase * (fh - 24);

        const scanGrad = ctx.createLinearGradient(fx, scanY - 8, fx, scanY + 8);
        scanGrad.addColorStop(0, 'rgba(0, 174, 239, 0.0)');
        scanGrad.addColorStop(
          0.5,
          isDrowsy ? 'rgba(239, 68, 68, 0.35)' : isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 174, 239, 0.25)'
        );
        scanGrad.addColorStop(1, 'rgba(0, 174, 239, 0.0)');

        ctx.fillStyle = scanGrad;
        ctx.fillRect(fx + 2, scanY - 8, fw - 4, 16);

        ctx.beginPath();
        ctx.moveTo(fx + 4, scanY);
        ctx.lineTo(fx + fw - 4, scanY);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = 6;
        ctx.stroke();

        // C. AI Analysis Tag below Face Box
        ctx.shadowBlur = 0;
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = mainColor;
        const statusText = isDrowsy
          ? '● CRITICAL: DROWSINESS DETECTED'
          : isWarning
          ? '▲ WARNING: EYE CLOSURE'
          : '● AI PERCEPTION ACTIVE';
        ctx.fillText(statusText, fx + 4, fy + fh + 16);

        // D. Eye-to-Eye Connection Tracking Line
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(lx, ly);
        ctx.lineTo(rx, ry);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint bridge dot
        const midX = (lx + rx) / 2;
        const midY = (ly + ry) / 2;
        ctx.beginPath();
        ctx.arc(midX, midY, 2.0, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();

        // E. Function to Draw Real-time Eye Tracking Rings + Pupil Dots
        const drawEyeRings = (cx: number, cy: number, label: string, earVal: number | null) => {
          const pulse = Math.sin(elapsed * 5) * 1.5;
          const outerR = Math.max(14, fw * 0.07) + (isDrowsy ? Math.sin(elapsed * 8) * 3 : pulse);
          const innerR = outerR * 0.52;

          // Outer Concentric Ring
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 7;
          ctx.stroke();

          // 4 Crosshair Ticks (0, 90, 180, 270 deg)
          const tickLen = 4;
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

          // Inner Concentric Ring
          ctx.beginPath();
          ctx.setLineDash([2, 3]);
          ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
          ctx.strokeStyle = isDrowsy ? '#DC2626' : isWarning ? '#D97706' : '#1687E8';
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.setLineDash([]);

          // Center Pupil / Tracking Dot
          ctx.beginPath();
          ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
          ctx.fillStyle = mainColor;
          ctx.shadowBlur = 8;
          ctx.fill();

          // Eye label and EAR indicator
          ctx.shadowBlur = 0;
          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          const earStr = earVal !== null ? earVal.toFixed(2) : '--';
          ctx.fillText(`${label} [${earStr}]`, cx - 18, cy - outerR - 4);
        };

        // Draw Left & Right Eye Tracking Rings
        drawEyeRings(lx, ly, 'L-EYE', data.leftEAR);
        drawEyeRings(rx, ry, 'R-EYE', data.rightEAR);

        ctx.restore();
      }

      // --- 2. SEARCHING FOR FACE (NO FACE DETECTED) ---
      if (smooth.opacity < 0.85) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1.0 - smooth.opacity);

        const centerX = displayW / 2;
        const centerY = displayH / 2;
        const searchBoxW = 160;
        const searchBoxH = 190;
        const sfx = centerX - searchBoxW / 2;
        const sfy = centerY - searchBoxH / 2;
        const sCorner = 20;

        ctx.strokeStyle = 'rgba(2, 132, 199, 0.5)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        // 4 searching corners
        ctx.beginPath();
        ctx.moveTo(sfx, sfy + sCorner);
        ctx.lineTo(sfx, sfy);
        ctx.lineTo(sfx + sCorner, sfy);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sfx + searchBoxW - sCorner, sfy);
        ctx.lineTo(sfx + searchBoxW, sfy);
        ctx.lineTo(sfx + searchBoxW, sfy + sCorner);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sfx, sfy + searchBoxH - sCorner);
        ctx.lineTo(sfx, sfy + searchBoxH);
        ctx.lineTo(sfx + sCorner, sfy + searchBoxH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sfx + searchBoxW - sCorner, sfy + searchBoxH);
        ctx.lineTo(sfx + searchBoxW, sfy + searchBoxH);
        ctx.lineTo(sfx + searchBoxW, sfy + searchBoxH - sCorner);
        ctx.stroke();

        // Sweeping radar scan line
        const radarY = sfy + ((Math.sin(elapsed * 2) + 1) / 2) * searchBoxH;
        ctx.beginPath();
        ctx.moveTo(sfx + 4, radarY);
        ctx.lineTo(sfx + searchBoxW - 4, radarY);
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.4)';
        ctx.stroke();

        // Searching status text
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('SEARCHING FOR FACE...', centerX, centerY + searchBoxH / 2 + 25);
        ctx.textAlign = 'left';

        ctx.restore();
      }

      // --- 3. REAL-TIME EYE TRACKING GLASS HUD CARD (TOP-RIGHT OF WEBCAM) ---
      ctx.save();
      const hudW = 168;
      const hudH = 104;
      const hudX = displayW - hudW - 12;
      const hudY = 12;

      // Rounded rect glass background
      ctx.fillStyle = darkBg;
      ctx.strokeStyle = isDrowsy
        ? 'rgba(239, 68, 68, 0.6)'
        : isWarning
        ? 'rgba(245, 158, 11, 0.5)'
        : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      const r = 10;
      ctx.beginPath();
      ctx.moveTo(hudX + r, hudY);
      ctx.lineTo(hudX + hudW - r, hudY);
      ctx.arcTo(hudX + hudW, hudY, hudX + hudW, hudY + r, r);
      ctx.lineTo(hudX + hudW, hudY + hudH - r);
      ctx.arcTo(hudX + hudW, hudY + hudH, hudX + hudW - r, hudY + hudH, r);
      ctx.lineTo(hudX + r, hudY + hudH);
      ctx.arcTo(hudX, hudY + hudH, hudX, hudY + hudH - r, r);
      ctx.lineTo(hudX, hudY + r);
      ctx.arcTo(hudX, hudY, hudX + r, hudY, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // HUD Title
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#00AEEF';
      ctx.fillText('REAL-TIME EYE TRACKING', hudX + 10, hudY + 16);

      // Separator line
      ctx.beginPath();
      ctx.moveTo(hudX + 10, hudY + 22);
      ctx.lineTo(hudX + hudW - 10, hudY + 22);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();

      // Status Item 1: Face
      ctx.font = '8px monospace';
      ctx.fillStyle = data.faceDetected ? '#10B981' : '#F43F5E';
      ctx.fillText(data.faceDetected ? '● Face: DETECTED' : '○ Face: SEARCHING', hudX + 10, hudY + 36);

      // Status Item 2: Eyes
      ctx.fillStyle = data.faceDetected ? '#00AEEF' : '#94A3B8';
      ctx.fillText(data.faceDetected ? '● Eyes: TRACKING' : '○ Eyes: NONE', hudX + 10, hudY + 50);

      // Status Item 3: State & EAR
      const earText = data.ear !== null ? data.ear.toFixed(2) : '--';
      ctx.fillStyle = isDrowsy ? '#EF4444' : isWarning ? '#F59E0B' : '#38BDF8';
      ctx.fillText(`◉ State: ${data.eyeState} (${earText})`, hudX + 10, hudY + 64);

      // Status Item 4: Closure countdown
      const sec = (data.closureDurationMs / 1000).toFixed(1);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(`⏱ Closure: ${sec}s / 3.0s`, hudX + 10, hudY + 78);

      // Mini Closure Progress bar
      const barW = hudW - 20;
      const barH = 4;
      const barX = hudX + 10;
      const barY = hudY + 86;
      const barPct = Math.min(1.0, data.closureDurationMs / 3000);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(barX, barY, barW, barH);

      ctx.fillStyle = isDrowsy ? '#EF4444' : '#F59E0B';
      ctx.fillRect(barX, barY, barW * barPct, barH);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraStatus]);

  const [inputIpUrl, setInputIpUrl] = useState<string>('http://192.168.1.100:4747/video');
  const [showIpInput, setShowIpInput] = useState<boolean>(false);

  const isActive = cameraStatus === 'CAMERA_ACTIVE';
  const isStarting = cameraStatus === 'CAMERA_STARTING';

  // Handle start camera with audio context initialization
  const handleStartCamera = useCallback(() => {
    initAudio();
    if (cameraSource === 'IP_STREAM') {
      startIpStream(inputIpUrl);
    } else {
      startCamera();
    }
  }, [initAudio, cameraSource, inputIpUrl, startIpStream, startCamera]);

  // Handle stop camera with alarm cleanup
  const handleStopCamera = useCallback(() => {
    stopContinuousAlarm();
    closedStartTimeRef.current = null;
    isAlarmTriggeredRef.current = false;
    stopCamera();
    setTelemetry({
      faceDetected: false,
      eyeState: 'UNKNOWN',
      ear: null,
      leftEAR: null,
      rightEAR: null,
      closureDurationMs: 0,
      score: 0,
      isDrowsy: false,
      alertState: 'NORMAL'
    });
  }, [stopCamera, stopContinuousAlarm]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopContinuousAlarm();
    };
  }, [stopContinuousAlarm]);

  const closureSeconds = (telemetry.closureDurationMs / 1000).toFixed(1);
  const closureProgressPct = Math.min(100, Math.round((telemetry.closureDurationMs / 3000) * 100));

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
            Real-time MediaPipe facial landmark perception tracking Eye Aspect Ratio (EAR) & 3-second continuous closure.
          </p>
        </div>

        {/* Camera Source Selector & Lifecycle Toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Explicit Camera Device Dropdown for Hardware Webcams */}
          {videoDevices.length > 0 && cameraSource !== 'IP_STREAM' && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                initAudio();
                setSelectedDeviceId(e.target.value);
              }}
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

          {/* Camera Source Mode Switcher: Laptop Cam vs USB Phone vs WiFi IP */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                initAudio();
                setShowIpInput(false);
                setCameraSource('LAPTOP_CAMERA');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraSource === 'LAPTOP_CAMERA' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptop Cam</span>
            </button>
            <button
              type="button"
              onClick={() => {
                initAudio();
                setShowIpInput(false);
                setCameraSource('USB_MOBILE_CAMERA');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraSource === 'USB_MOBILE_CAMERA' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>USB Phone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                initAudio();
                setShowIpInput(true);
                setCameraSource('IP_STREAM');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraSource === 'IP_STREAM' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>WiFi Stream</span>
            </button>
          </div>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={() => {
              initAudio();
              setIsSoundMuted((prev) => !prev);
            }}
            className={`p-2 rounded-xl border font-bold text-xs flex items-center transition-all cursor-pointer ${
              isSoundMuted
                ? 'bg-slate-100 border-slate-200 text-slate-400'
                : 'bg-white border-slate-200 text-sky-700 shadow-xs'
            }`}
            title={isSoundMuted ? 'Sound Muted: Click to enable audio alarm' : 'Sound Enabled: Click to mute'}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-sky-600" />}
          </button>

          {isActive ? (
            <button
              onClick={handleStopCamera}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer font-mono"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>STOP CAMERA</span>
            </button>
          ) : (
            <button
              onClick={handleStartCamera}
              disabled={isStarting}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer font-mono"
            >
              {isStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isStarting ? 'STARTING...' : 'START CAMERA'}</span>
            </button>
          )}
        </div>
      </div>

      {/* DroidCam WiFi / IP URL Input Bar when WiFi Stream is selected */}
      {(cameraSource === 'IP_STREAM' || showIpInput) && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Smartphone className="w-5 h-5 text-sky-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-sky-900 block uppercase">DroidCam WiFi / IP Feed URL</span>
              <span className="text-[11px] text-sky-700 font-sans">
                Enter the URL shown on your DroidCam phone app (e.g. <code>http://192.168.1.X:4747/video</code> or <code>http://127.0.0.1:4747/video</code>)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={inputIpUrl}
              onChange={(e) => setInputIpUrl(e.target.value)}
              placeholder="http://192.168.1.X:4747/video"
              className="px-3 py-1.5 rounded-xl bg-white border border-sky-300 text-xs font-mono font-bold text-sky-900 outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-64"
            />
            <button
              type="button"
              onClick={() => {
                initAudio();
                startIpStream(inputIpUrl);
              }}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shrink-0 cursor-pointer shadow-xs transition-all"
            >
              CONNECT
            </button>
          </div>
        </div>
      )}

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

      {/* Prominent Real-Time Drowsiness Alert Banner */}
      {isActive && telemetry.alertState === 'DROWSINESS_ALERT' && (
        <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3 font-mono">
            <AlertTriangle className="w-7 h-7 fill-white text-rose-600 shrink-0" />
            <div>
              <span className="text-sm font-extrabold block uppercase tracking-wider">
                CRITICAL ALERT: PROLONGED EYE CLOSURE DETECTED (≥ 3.0s)
              </span>
              <p className="text-xs font-sans text-rose-100 font-medium">
                Driver fatigue alarm is sounding. Please open your eyes and pull over safely immediately!
              </p>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-white/20 rounded-xl font-mono text-xs font-black shrink-0">
            {closureSeconds}s CLOSED
          </div>
        </div>
      )}

      {/* Warning Countdown Banner during Eye-Closure (0 to 3s) */}
      {isActive && telemetry.alertState === 'EYES_CLOSED_WARNING' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs flex items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2.5">
            <Timer className="w-5 h-5 text-amber-600 animate-spin" />
            <div>
              <span className="text-xs font-bold block uppercase tracking-wider text-amber-800">
                EYES CLOSED WARNING: {closureSeconds}s / 3.0s
              </span>
              <p className="text-[11px] font-sans text-amber-700">
                Alarm will sound at 3.0 seconds of sustained closure.
              </p>
            </div>
          </div>
          <div className="w-28 bg-amber-200 rounded-full h-2 overflow-hidden shrink-0">
            <div
              className="bg-amber-600 h-full transition-all duration-200"
              style={{ width: `${closureProgressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Live Camera Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>FACIAL LANDMARK VISION FEED</span>
            </div>

            {/* Quick Camera Switcher Buttons directly on video panel */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    initAudio();
                    setShowIpInput(false);
                    setCameraSource('LAPTOP_CAMERA');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    cameraSource === 'LAPTOP_CAMERA' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch to Laptop / Built-in Webcam"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Laptop Cam</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    initAudio();
                    setShowIpInput(false);
                    setCameraSource('USB_MOBILE_CAMERA');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    cameraSource === 'USB_MOBILE_CAMERA' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Switch to DroidCam USB Phone Camera"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>DroidCam USB</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    initAudio();
                    setShowIpInput(true);
                    setCameraSource('IP_STREAM');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    cameraSource === 'IP_STREAM' ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Use DroidCam WiFi Stream (http://192.168.1.X:4747/video)"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>WiFi IP</span>
                </button>
              </div>

              {/* Camera device selection dropdown */}
              {videoDevices.length > 1 && cameraSource !== 'IP_STREAM' && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    initAudio();
                    setSelectedDeviceId(e.target.value);
                  }}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs outline-none focus:border-sky-500 shadow-2xs transition-all cursor-pointer max-w-[150px] truncate"
                  title="Choose exact video hardware device"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Device ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {isActive ? (
                <button
                  onClick={handleStopCamera}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer font-mono"
                  title="Stop Camera"
                >
                  <Square className="w-3 h-3 fill-white" />
                  <span>STOP</span>
                </button>
              ) : (
                <button
                  onClick={handleStartCamera}
                  disabled={isStarting}
                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer font-mono"
                  title="Start Camera"
                >
                  {isStarting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-white" />}
                  <span>{isStarting ? 'STARTING' : 'START'}</span>
                </button>
              )}

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
              }`}>
                {isActive ? '● LIVE' : '○ OFF'}
              </span>
            </div>
          </div>

          <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden bg-[#FFFAF0] border border-slate-200 flex items-center justify-center">
            {cameraSource === 'IP_STREAM' ? (
              <img
                ref={imgStreamRef}
                src={ipStreamUrl}
                crossOrigin="anonymous"
                alt="DroidCam Direct IP Stream"
                className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
            )}

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

        {/* Right Column (1/3): Metrics & Recommendations */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">FATIGUE TELEMETRY</span>
              <Activity className="w-4 h-4 text-sky-600" />
            </div>

            <div className="space-y-4">
              {/* Face Tracking Status */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">FACE PERCEPTION</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className={`text-sm font-black ${
                  !isActive
                    ? 'text-slate-400'
                    : telemetry.faceDetected
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}>
                  {!isActive
                    ? '○ STANDBY'
                    : telemetry.faceDetected
                    ? '● FACE DETECTED'
                    : '○ NO FACE FOUND'}
                </div>
              </div>

              {/* Eye Aspect Ratio (EAR) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">EYE ASPECT RATIO (EAR)</span>
                <div className="text-2xl font-black text-sky-700 font-outfit">
                  {telemetry.ear !== null ? `${telemetry.ear.toFixed(2)} (${telemetry.eyeState})` : '0.28 (STANDBY)'}
                </div>
              </div>

              {/* Eye Closure Duration & Countdown */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">EYE CLOSURE DURATION</span>
                  <span className="text-[10px] font-bold text-slate-500">{closureProgressPct}%</span>
                </div>
                <div className={`text-xl font-black font-outfit ${
                  telemetry.closureDurationMs >= 3000
                    ? 'text-rose-600'
                    : telemetry.closureDurationMs > 0
                    ? 'text-amber-600'
                    : 'text-slate-800'
                }`}>
                  {closureSeconds}s <span className="text-xs text-slate-400 font-normal">/ 3.0s threshold</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      telemetry.closureDurationMs >= 3000 ? 'bg-rose-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${closureProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Drowsiness Fatigue Score */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">DROWSINESS SCORE</span>
                <div className={`text-3xl font-black font-outfit ${
                  telemetry.isDrowsy ? 'text-rose-600' : telemetry.score > 40 ? 'text-amber-600' : 'text-slate-900'
                }`}>
                  {telemetry.score}%
                </div>
              </div>

              {/* Camera Device */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">ACTIVE CAMERA DEVICE</span>
                <div className="text-xs font-bold text-slate-800 truncate" title={activeTrackInfo?.label || usbDeviceLabel || 'Webcam Device'}>
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
