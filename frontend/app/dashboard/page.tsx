'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import hazardApi from '@/services/hazardApi';
import safetyApi from '@/services/safetyApi';
import trafficRuleApi from '@/services/trafficRuleApi';
import aiApi from '@/services/aiApi';
import { useWebcam } from '@/hooks/useWebcam';
import { useV2VNetwork } from '@/hooks/useV2VNetwork';
import { useLiveGpsTracking } from '@/hooks/useLiveGpsTracking';
import { useCrashDetector } from '@/hooks/useCrashDetector';
import JioMapContainer from '@/components/navigation/JioMapContainer';
import { RoadHazard, RiskLevel } from '@/types';

// Cockpit HUD Suite Components
import CockpitHeader from '@/components/cockpit/CockpitHeader';
import Cockpit3DVehicleView, { DetectedRoadObject } from '@/components/cockpit/Cockpit3DVehicleView';
import CockpitSpeedHUD from '@/components/cockpit/CockpitSpeedHUD';
import CockpitEventHUD, { CockpitRoadEvent } from '@/components/cockpit/CockpitEventHUD';
import CockpitCameraHUD from '@/components/cockpit/CockpitCameraHUD';
import CockpitDriverMonitorHUD from '@/components/cockpit/CockpitDriverMonitorHUD';
import CockpitV2VHUD from '@/components/cockpit/CockpitV2VHUD';
import CockpitEmergencyHUD from '@/components/cockpit/CockpitEmergencyHUD';
import CockpitBottomRail from '@/components/cockpit/CockpitBottomRail';

export default function DashboardPage() {
  // 1. Audio Alarm Engine with Web Audio API synthesizer & Web Speech Synthesis
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAlarmTriggeredRef = useRef<boolean>(false);
  const closedStartTimeRef = useRef<number | null>(null);
  const missedFramesRef = useRef<number>(0);
  const lastLogTimeRef = useRef<number>(0);

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
      console.warn('[Dashboard Audio] Init error:', e);
    }
  }, []);

  // Sharp, urgent two-tone alert buzzer (880Hz to 1100Hz)
  const playAlertBuzzer = useCallback(() => {
    if (typeof window === 'undefined') return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('[Dashboard Audio] Play buzzer error:', e);
    }
  }, [initAudio]);

  // Spoken voice warning via SpeechSynthesis
  const speakVoiceAlert = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[Dashboard Audio] Voice synthesis error:', e);
    }
  }, []);

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

  // 1. Live GPS & Telemetry Hook
  const gpsState = useLiveGpsTracking();

  // 2. Real V2V Network Hook
  const {
    v2vStatus,
    nearbyVehicles,
    reconnect: reconnectV2V
  } = useV2VNetwork({
    latitude: gpsState.latitude || 25.5941,
    longitude: gpsState.longitude || 85.1376,
    speedKmH: gpsState.speedKmH || 0,
    heading: gpsState.heading || 0
  });

  // Driver Drowsiness & Spatial Eye Tracking Telemetry State
  const [drowsinessTelemetry, setDrowsinessTelemetry] = useState<{
    score: number | null;
    isDrowsy: boolean;
    alertState: 'NORMAL' | 'WARNING' | 'DROWSY' | 'ALERT';
    faceDetected: boolean;
    ear: number | null;
    leftEAR: number | null;
    rightEAR: number | null;
    eyeState: string;
    closureDurationMs: number;
    faceRect: [number, number, number, number] | number[] | null;
    leftEyeCenter: [number, number] | number[] | null;
    rightEyeCenter: [number, number] | number[] | null;
    frameWidth: number;
    frameHeight: number;
  }>({
    score: 12,
    isDrowsy: false,
    alertState: 'NORMAL',
    faceDetected: true,
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

  // 3. Real Webcam & DroidCam Camera Source Hook
  const {
    videoRef,
    canvasRef,
    cameraStatus,
    cameraSource,
    setCameraSource,
    usbDeviceLabel,
    activeTrackInfo,
    startCamera,
    stopCamera
  } = useWebcam({
    fps: 3,
    jpegQuality: 0.5,
    onFrame: async (base64Frame) => {
      try {
        const res = await aiApi.analyzeDrowsiness('cockpit_session_101', base64Frame);
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

        let alertState: 'NORMAL' | 'WARNING' | 'DROWSY' | 'ALERT' = 'NORMAL';
        let isDrowsy = false;
        let score = Math.max(0, Number(data.drowsinessScore) || 0);

        if (!faceDetected && missedFramesRef.current > 2) {
          alertState = 'NORMAL';
          score = 0;
        } else if (durationMs >= 3000) {
          // Continuous 3.0 seconds closure reached -> Drowsiness alert triggered!
          alertState = 'DROWSY';
          isDrowsy = true;
          score = Math.max(88, score);

          if (!isAlarmTriggeredRef.current) {
            isAlarmTriggeredRef.current = true;
            startContinuousAlarm();
          }
        } else if (durationMs > 0 && isClosed) {
          // Warning countdown phase (0 - 3 seconds)
          alertState = 'WARNING';
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

        // Diagnostic Logging (throttled to 1.5 seconds)
        if (now - lastLogTimeRef.current > 1500) {
          lastLogTimeRef.current = now;
          console.log(
            `[Dashboard Drowsiness] Face: ${faceDetected} | EAR: ${ear?.toFixed(2) ?? 'N/A'} | ` +
            `Eye: ${eyeState} | Closure: ${(durationMs / 1000).toFixed(1)}s | Drowsy: ${isDrowsy} | Alarm: ${isAlarmTriggeredRef.current ? 'ON' : 'OFF'}`
          );
        }

        setDrowsinessTelemetry({
          score,
          isDrowsy,
          alertState,
          faceDetected,
          ear,
          leftEAR,
          rightEAR,
          eyeState,
          closureDurationMs: durationMs,
          faceRect: (data.faceRect as any) || null,
          leftEyeCenter: (data.leftEyeCenter as any) || null,
          rightEyeCenter: (data.rightEyeCenter as any) || null,
          frameWidth: data.frameWidth || 480,
          frameHeight: data.frameHeight || 360
        });
      } catch (err) {
        // AI API fallback
      }
    }
  });

  const handleStartCamera = useCallback(() => {
    initAudio();
    startCamera();
  }, [initAudio, startCamera]);

  const handleStopCamera = useCallback(() => {
    stopContinuousAlarm();
    closedStartTimeRef.current = null;
    isAlarmTriggeredRef.current = false;
    stopCamera();
    setDrowsinessTelemetry({
      score: 0,
      isDrowsy: false,
      alertState: 'NORMAL',
      faceDetected: false,
      ear: null,
      leftEAR: null,
      rightEAR: null,
      eyeState: 'UNKNOWN',
      closureDurationMs: 0,
      faceRect: null,
      leftEyeCenter: null,
      rightEyeCenter: null,
      frameWidth: 480,
      frameHeight: 360
    });
  }, [stopCamera, stopContinuousAlarm]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopContinuousAlarm();
    };
  }, [stopContinuousAlarm]);

  // 4. Real Crash Detector Hook
  const {
    crashState,
    countdown,
    cancelEmergency,
    confirmEmergency
  } = useCrashDetector(
    gpsState.latitude || 25.5941,
    gpsState.longitude || 85.1376,
    gpsState.speedKmH || 0
  );

  // 5. Backend Real API States
  const [userLocation] = useState({
    state: 'Bihar',
    city: 'Patna',
    address: 'Gandhi Maidan, Patna, Bihar',
    latitude: 25.5941,
    longitude: 85.1376
  });

  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [nearbyHazards, setNearbyHazards] = useState<RoadHazard[]>([]);
  const [legalSpeedLimit, setLegalSpeedLimit] = useState<number>(60);
  const [advisorySpeed, setAdvisorySpeed] = useState<number | null>(null);
  const [activeEvent, setActiveEvent] = useState<CockpitRoadEvent | null>(null);
  const [aiOnline] = useState<boolean>(true);

  // Manual Vehicle Driving Speed State
  const [manualSpeedKmH, setManualSpeedKmH] = useState<number>(0);

  // Initial Sync from Real Backend APIs
  const syncCockpitBackend = async () => {
    try {
      const hazardRes = await hazardApi.getNearbyHazards(userLocation.latitude, userLocation.longitude, 10);
      if (hazardRes && hazardRes.data) {
        setNearbyHazards(hazardRes.data);
        if (hazardRes.data.length > 0) {
          setAdvisorySpeed(40);
          setActiveEvent({
            id: `evt_hazard_${Date.now()}`,
            type: 'HAZARD',
            title: `⚠ ${hazardRes.data[0].type.toUpperCase()} DETECTED`,
            message: hazardRes.data[0].description,
            recommendedSpeedKmH: 40,
            severity: 'WARNING'
          });
        }
      }

      const rulesRes = await trafficRuleApi.getRulesByState(userLocation.state, { limit: 1 });
      if (rulesRes && rulesRes.data) {
        setLegalSpeedLimit(60);
      }

      const safetyRes = await safetyApi.analyzeSafety({
        drowsinessScore: drowsinessTelemetry.score || 12,
        speed: manualSpeedKmH || gpsState.speedKmH || 0,
        speedLimit: 60,
        harshBraking: 0,
        roadHazard: nearbyHazards.length > 0
      });

      if (safetyRes && safetyRes.data) {
        setRiskLevel(safetyRes.data.riskLevel);
      }
    } catch (err) {
      console.warn('[Cockpit] Backend sync note:', err);
    }
  };

  useEffect(() => {
    syncCockpitBackend();
  }, []);

  // Map nearby hazards to 3D bounding objects for WebGL Canvas
  const detected3DObjects: DetectedRoadObject[] = nearbyHazards.map((h, i) => ({
    id: h._id || `hazard_${i}`,
    type: 'OBSTACLE',
    label: h.type,
    distanceMeters: Math.min(25, (i + 1) * 6),
    confidence: 0.92,
    directionAngle: (i - 1) * 35
  }));

  const activeDisplaySpeed = gpsState.speedKmH !== null ? gpsState.speedKmH : manualSpeedKmH;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. TOP COCKPIT STATUS BAR */}
      <CockpitHeader
        aiOnline={aiOnline}
        gpsStatus={gpsState.status}
        cameraActive={cameraStatus === 'CAMERA_ACTIVE'}
        v2vConnected={v2vStatus === 'ONLINE'}
        emergencyReady={true}
        cameraSourceLabel={cameraSource === 'USB_MOBILE_CAMERA' ? 'USB PHONE' : 'LAPTOP'}
        driverRiskLevel={riskLevel}
      />

      {/* 2. ROAD EVENT / TRAFFIC SIGN HUD OVERLAY */}
      {activeEvent && (
        <CockpitEventHUD
          currentEvent={activeEvent}
          onDismiss={() => setActiveEvent(null)}
        />
      )}

      {/* 3. PRIMARY 2-COLUMN COCKPIT HUD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT & CENTER COLUMN (2/3): 3D WebGL Vehicle Canvas + Dynamic Speed HUD */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3D WebGL Vehicle & Safety Radar Canvas */}
          <Cockpit3DVehicleView
            heading={gpsState.heading || 0}
            speedKmH={activeDisplaySpeed}
            onSpeedChange={setManualSpeedKmH}
            detectedObjects={detected3DObjects}
            nearbyV2VVehicles={nearbyVehicles}
            threatLevel={riskLevel === 'HIGH' ? 'CRITICAL' : riskLevel === 'MEDIUM' ? 'WARNING' : 'SAFE'}
          />

          {/* Central Speed Advisory HUD */}
          <CockpitSpeedHUD
            currentSpeedKmH={activeDisplaySpeed}
            legalLimitKmH={legalSpeedLimit}
            advisorySpeedKmH={advisorySpeed}
            activeHazardLabel={activeEvent ? activeEvent.title : null}
          />
        </div>

        {/* RIGHT COLUMN (1/3): Floating Road Camera Preview + Driver Monitor + V2V */}
        <div className="space-y-6">
          {/* Floating Road Camera HUD with Live AI Eye Tracking & Driver Perception Overlay */}
          <CockpitCameraHUD
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraStatus={cameraStatus}
            cameraSource={cameraSource}
            deviceLabel={activeTrackInfo?.label || usbDeviceLabel || 'DroidCam Video'}
            fps={activeTrackInfo?.frameRate || 30}
            onSwitchSource={setCameraSource}
            onStartCamera={handleStartCamera}
            onStopCamera={handleStopCamera}
            detectedCount={detected3DObjects.length}
            trackingData={drowsinessTelemetry}
          />

          {/* Driver Attentiveness Monitor HUD */}
          <CockpitDriverMonitorHUD
            isFaceDetected={cameraStatus === 'CAMERA_ACTIVE' && drowsinessTelemetry.faceDetected}
            isEyesOpen={drowsinessTelemetry.eyeState === 'OPEN'}
            earValue={drowsinessTelemetry.ear}
            eyeClosureDurationSeconds={drowsinessTelemetry.closureDurationMs / 1000}
            drowsinessScore={drowsinessTelemetry.score}
            alertState={drowsinessTelemetry.alertState}
          />

          {/* V2V Mesh Network HUD */}
          <CockpitV2VHUD
            v2vStatus={v2vStatus}
            nearbyVehicles={nearbyVehicles}
            onReconnect={reconnectV2V}
          />
        </div>
      </div>

      {/* 4. LIVE 3D GEOSPATIAL MAP OVERLAY */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 font-mono">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
            <span>LIVE 3D GEOSPATIAL MAP & ROUTE OVERLAY</span>
          </div>
          <span className="text-slate-500 font-bold">Jio 3D / OSM Tiles</span>
        </div>

        <JioMapContainer
          userLocation={{
            latitude: gpsState.latitude || userLocation.latitude,
            longitude: gpsState.longitude || userLocation.longitude,
            address: userLocation.address
          }}
          hazards={nearbyHazards}
        />
      </div>

      {/* 5. BOTTOM TELEMETRY STRIP */}
      <CockpitBottomRail
        speedKmH={activeDisplaySpeed}
        heading={gpsState.heading || 124}
        gpsStatus={gpsState.status}
        roadName="NH-30 (Patna Expressway)"
        speedLimitKmH={legalSpeedLimit}
        advisorySpeedKmH={advisorySpeed}
        aiOnline={aiOnline}
        v2vConnected={v2vStatus === 'ONLINE'}
      />

      {/* 6. CRASH IMPACT EMERGENCY SOS OVERLAY MODAL */}
      <CockpitEmergencyHUD
        isEmergencyActive={crashState === 'SUSPECTED_IMPACT' || crashState === 'CONFIRMED_CRASH'}
        countdownSeconds={countdown}
        latitude={gpsState.latitude}
        longitude={gpsState.longitude}
        onCancel={cancelEmergency}
        onSendNow={confirmEmergency}
      />
    </div>
  );
}
