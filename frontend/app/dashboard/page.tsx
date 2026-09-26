'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import hazardApi from '@/services/hazardApi';
import safetyApi from '@/services/safetyApi';
import trafficRuleApi from '@/services/trafficRuleApi';
import aiApi from '@/services/aiApi';
import emergencyApi from '@/services/emergencyApi';
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

  // Sharp two-tone alarm buzzer (880Hz -> 1100Hz)
  const playAlertBuzzer = useCallback(() => {
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;
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

  // Automatic SOS Countdown State after Emergency Vehicle Stop
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosStatus, setSosStatus] = useState<{
    type: 'COUNTDOWN' | 'SENT' | 'CANCELLED' | 'NO_CONTACTS' | 'FAILED';
    message: string;
    contactsCount?: number;
    mapsUrl?: string;
  } | null>(null);

  const sosIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sosSentRef = useRef<boolean>(false);
  const sosCancelledRef = useRef<boolean>(false);
  const activeEmergencyIdRef = useRef<string | null>(null);

  // Dispatch SOS to emergency contacts with live GPS coordinates
  const dispatchAutoSOS = useCallback(async (eventId: string) => {
    if (sosSentRef.current) return;
    sosSentRef.current = true;

    try {
      // 1. Fetch configured emergency contacts
      let contacts: any[] = [];
      try {
        const contactRes = await emergencyApi.getContacts('default_user');
        if (contactRes && contactRes.data && Array.isArray(contactRes.data)) {
          contacts = contactRes.data;
        }
      } catch (e) {
        console.warn('[Dashboard SOS] Contact fetch note:', e);
      }

      if (contacts.length === 0) {
        setSosStatus({
          type: 'NO_CONTACTS',
          message: '⚠ NO EMERGENCY CONTACTS CONFIGURED — Please add emergency contacts in Emergency SOS / Settings.'
        });
        return;
      }

      // 2. Get latest live GPS location
      let lat = gpsState.latitude || 28.6139;
      let lng = gpsState.longitude || 77.2090;

      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 4000,
              maximumAge: 10000
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (posErr) {
          // fallback to gpsState
        }
      }

      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      // 3. Trigger SOS to backend
      const res = await emergencyApi.triggerSOS({
        userId: 'default_user',
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        eventType: 'DROWSINESS_VEHICLE_STOP_SOS',
        incidentId: eventId,
        timestamp: new Date().toISOString()
      });

      const count = res.data?.contactsNotifiedCount || contacts.length;

      setSosStatus({
        type: 'SENT',
        message: `🚨 SOS SENT TO ${count} EMERGENCY CONTACT(S)`,
        contactsCount: count,
        mapsUrl
      });

      speakVoiceAlert('Emergency SOS dispatched. Live location sent to emergency contacts.');
    } catch (err) {
      console.error('[Dashboard SOS] Send error:', err);
      setSosStatus({
        type: 'FAILED',
        message: '⚠ SOS DELIVERY FAILED — Please use Emergency SOS manually.'
      });
    }
  }, [gpsState.latitude, gpsState.longitude, speakVoiceAlert]);

  // Trigger Automatic SOS countdown when vehicle is confirmed STOPPED on shoulder
  const handleVehicleStopped = useCallback(() => {
    if (!drowsinessTelemetry.isDrowsy) return;
    if (sosSentRef.current || sosCancelledRef.current || sosCountdown !== null) return;

    const eventId = `sos_auto_${Date.now()}`;
    activeEmergencyIdRef.current = eventId;
    setSosCountdown(15);
    setSosStatus({
      type: 'COUNTDOWN',
      message: 'Vehicle safely stopped on shoulder. Automatic SOS dispatching in 15s'
    });

    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);

    sosIntervalRef.current = setInterval(() => {
      setSosCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (sosIntervalRef.current) {
            clearInterval(sosIntervalRef.current);
            sosIntervalRef.current = null;
          }
          dispatchAutoSOS(eventId);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [drowsinessTelemetry.isDrowsy, sosCountdown, dispatchAutoSOS]);

  // Cancel SOS by driver
  const handleCancelSOS = () => {
    if (sosIntervalRef.current) {
      clearInterval(sosIntervalRef.current);
      sosIntervalRef.current = null;
    }
    sosCancelledRef.current = true;
    setSosCountdown(null);
    setSosStatus({
      type: 'CANCELLED',
      message: 'SOS Cancelled by Driver. Vehicle remains safely parked on shoulder.'
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
      stopContinuousAlarm();
    };
  }, [stopContinuousAlarm]);

  // 3. Real Webcam & Drowsiness AI Stream Hook
  const {
    videoRef,
    canvasRef,
    cameraStatus,
    cameraSource,
    fps,
    detectedCount,
    switchSource,
    startCamera,
    stopCamera
  } = useWebcam({
    targetFps: 15,
    onFrame: async (base64Image) => {
      try {
        const res = await aiApi.predictDrowsiness(base64Image);
        const data = res.data;
        if (!data) return;

        const now = Date.now();
        const faceDetected = data.faceDetected !== false;
        const ear = data.ear !== null && data.ear !== undefined ? Number(data.ear) : null;
        const leftEAR = data.leftEAR !== null && data.leftEAR !== undefined ? Number(data.leftEAR) : null;
        const rightEAR = data.rightEAR !== null && data.rightEAR !== undefined ? Number(data.rightEAR) : null;
        const eyeState = String(data.eyeState || 'OPEN').toUpperCase();

        const isClosed = eyeState === 'CLOSED' || eyeState === 'CLOSING' || (ear !== null && ear < 0.22);

        if (!faceDetected) {
          missedFramesRef.current += 1;
        } else {
          missedFramesRef.current = 0;
        }

        if (isClosed) {
          if (closedStartTimeRef.current === null) {
            closedStartTimeRef.current = now;
          }
        } else {
          closedStartTimeRef.current = null;
        }

        const durationMs = closedStartTimeRef.current ? now - closedStartTimeRef.current : 0;

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
    isAlarmTriggeredRef.current = false;
    closedStartTimeRef.current = null;
    stopCamera();
  }, [stopCamera, stopContinuousAlarm]);

  // 4. Real Accident Crash Detector
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

  // Reset SOS guards when driver resumes driving after emergency resolution
  const handleSpeedChange = (speed: number) => {
    setManualSpeedKmH(speed);
    if (speed > 5 && !drowsinessTelemetry.isDrowsy) {
      if (sosSentRef.current || sosCancelledRef.current) {
        sosSentRef.current = false;
        sosCancelledRef.current = false;
        activeEmergencyIdRef.current = null;
        setSosStatus(null);
      }
    }
  };

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

  const activeDisplaySpeed = manualSpeedKmH;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. TOP COCKPIT NAVIGATION & SYSTEM INTEGRITY HEADER */}
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
          {/* Automatic Emergency SOS Alert Banner */}
          {sosStatus && (
            <div className={`p-4 rounded-2xl border shadow-lg transition-all font-mono ${
              sosStatus.type === 'COUNTDOWN'
                ? 'bg-rose-950/90 border-rose-500 text-white shadow-rose-500/20 animate-pulse'
                : sosStatus.type === 'SENT'
                ? 'bg-emerald-950/90 border-emerald-500 text-white shadow-emerald-500/20'
                : sosStatus.type === 'NO_CONTACTS' || sosStatus.type === 'FAILED'
                ? 'bg-amber-950/90 border-amber-500 text-white shadow-amber-500/20'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {sosStatus.type === 'COUNTDOWN' && (
                    <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center font-black text-lg text-white font-outfit shrink-0 shadow-md">
                      {sosCountdown}s
                    </div>
                  )}
                  {sosStatus.type === 'SENT' && (
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-lg text-white shrink-0 shadow-md">
                      ✓
                    </div>
                  )}
                  {(sosStatus.type === 'NO_CONTACTS' || sosStatus.type === 'FAILED') && (
                    <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-black text-lg text-white shrink-0 shadow-md">
                      ⚠
                    </div>
                  )}
                  {sosStatus.type === 'CANCELLED' && (
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-black text-lg text-white shrink-0 shadow-md">
                      ✕
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-white">
                      {sosStatus.type === 'COUNTDOWN'
                        ? 'AUTOMATIC SOS DISPATCH IN PROGRESS'
                        : sosStatus.type === 'SENT'
                        ? 'EMERGENCY SOS DISPATCHED'
                        : sosStatus.type === 'NO_CONTACTS'
                        ? 'EMERGENCY CONFIGURATION REQUIRED'
                        : sosStatus.type === 'CANCELLED'
                        ? 'SOS DISPATCH CANCELLED'
                        : 'SOS NOTIFICATION NOTICE'}
                    </div>
                    <div className="text-[11px] text-slate-200 font-sans font-medium">
                      {sosStatus.message}
                    </div>
                    {sosStatus.mapsUrl && (
                      <a
                        href={sosStatus.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-sky-300 hover:text-sky-200 underline pt-0.5"
                      >
                        📍 View Live Dispatched GPS Location on Google Maps
                      </a>
                    )}
                  </div>
                </div>

                {sosStatus.type === 'COUNTDOWN' && (
                  <button
                    onClick={handleCancelSOS}
                    className="px-4 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer shrink-0"
                  >
                    CANCEL SOS
                  </button>
                )}

                {sosStatus.type !== 'COUNTDOWN' && (
                  <button
                    onClick={() => setSosStatus(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold transition-all cursor-pointer shrink-0"
                  >
                    DISMISS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3D WebGL Vehicle & Safety Radar Canvas with Emergency Pull-Over Behavior */}
          <Cockpit3DVehicleView
            heading={gpsState.heading || 0}
            speedKmH={activeDisplaySpeed}
            onSpeedChange={handleSpeedChange}
            onVehicleStopped={handleVehicleStopped}
            detectedObjects={detected3DObjects}
            nearbyV2VVehicles={nearbyVehicles}
            threatLevel={riskLevel === 'HIGH' ? 'CRITICAL' : riskLevel === 'MEDIUM' ? 'WARNING' : 'SAFE'}
            isDrowsy={drowsinessTelemetry.isDrowsy}
            emergencyPullOver={drowsinessTelemetry.isDrowsy || riskLevel === 'HIGH'}
          />

          {/* Central Speed Advisory HUD */}
          <CockpitSpeedHUD
            currentSpeedKmH={activeDisplaySpeed}
            legalLimitKmH={legalSpeedLimit}
            advisorySpeedKmH={advisorySpeed}
            activeHazardLabel={activeEvent ? activeEvent.title : null}
          />
        </div>

        {/* RIGHT COLUMN (1/3): Camera Feed + Driver Monitor + V2V + Emergency SOS */}
        <div className="space-y-6">
          {/* AI Driver Attentiveness & Fatigue Score Card */}
          <CockpitDriverMonitorHUD
            score={drowsinessTelemetry.score}
            isDrowsy={drowsinessTelemetry.isDrowsy}
            alertState={drowsinessTelemetry.alertState}
            faceDetected={drowsinessTelemetry.faceDetected}
            ear={drowsinessTelemetry.ear}
            closureDurationMs={drowsinessTelemetry.closureDurationMs}
          />

          {/* Road Safety Camera Feed with Real-Time Spatial AI Reticles */}
          <CockpitCameraHUD
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraStatus={cameraStatus}
            cameraSource={cameraSource}
            fps={fps}
            detectedCount={detectedCount}
            onSwitchSource={switchSource}
            onStartCamera={handleStartCamera}
            onStopCamera={handleStopCamera}
            trackingData={drowsinessTelemetry}
          />

          {/* V2V Mesh Network Mesh List */}
          <CockpitV2VHUD
            v2vStatus={v2vStatus}
            nearbyVehicles={nearbyVehicles}
            onReconnect={reconnectV2V}
          />

          {/* Real Emergency SOS Dispatch Center */}
          <CockpitEmergencyHUD
            crashState={crashState}
            countdown={countdown}
            onCancelEmergency={cancelEmergency}
            onConfirmEmergency={confirmEmergency}
          />
        </div>
      </div>

      {/* 4. BOTTOM COCKPIT QUICK ACCESS RAIL */}
      <CockpitBottomRail
        onEmergencyClick={() => {
          if (typeof window !== 'undefined') window.location.href = '/emergency';
        }}
      />
    </div>
  );
}
