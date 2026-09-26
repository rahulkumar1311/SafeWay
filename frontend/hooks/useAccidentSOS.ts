import { useState, useEffect, useRef, useCallback } from 'react';
import emergencyApi from '@/services/emergencyApi';

export type AccidentState =
  | 'NORMAL'
  | 'POSSIBLE_CAMERA_OBSTRUCTION'
  | 'ACCIDENT_SUSPECTED'
  | 'SOS_COUNTDOWN'
  | 'SOS_SENT'
  | 'CANCELLED';

export type LocationStatus = 'IDLE' | 'ACQUIRING' | 'ACQUIRED' | 'DENIED' | 'UNAVAILABLE';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  mapsUrl?: string;
  timestamp?: string;
}

export interface UseAccidentSOSOptions {
  isCameraActive: boolean;
  isCameraBlocked: boolean;
  obstructionScore?: number;
  userId?: string;
}

export function useAccidentSOS(options: UseAccidentSOSOptions) {
  const {
    isCameraActive,
    isCameraBlocked,
    obstructionScore = 0,
    userId = 'default_user'
  } = options;

  const [accidentState, setAccidentState] = useState<AccidentState>('NORMAL');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(15);
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('IDLE');
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [dispatchedRecord, setDispatchedRecord] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const obstructionStartTimeRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDispatchingRef = useRef<boolean>(false);
  const hasDispatchedIncidentRef = useRef<string | null>(null);

  // Audio Context unlock & buzzer generator
  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch {}
  }, []);

  const playUrgentBuzzer = useCallback((freq = 880, duration = 0.25) => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state !== 'running') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration * 0.5);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [initAudio, isMuted]);

  const speakAlert = useCallback((text: string) => {
    if (isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, [isMuted]);

  // Acquire Live GPS Coordinates in Parallel
  const acquireLocation = useCallback(async (): Promise<DriverLocation | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationStatus('UNAVAILABLE');
      return null;
    }

    setLocationStatus('ACQUIRING');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const loc: DriverLocation = {
            latitude: lat,
            longitude: lng,
            accuracy,
            mapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
            timestamp: new Date().toISOString()
          };
          setLocation(loc);
          setLocationStatus('ACQUIRED');
          resolve(loc);
        },
        (err) => {
          console.warn('[AccidentSOS] Geolocation lookup error:', err.message);
          if (err.code === err.PERMISSION_DENIED) {
            setLocationStatus('DENIED');
          } else {
            setLocationStatus('UNAVAILABLE');
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 15000
        }
      );
    });
  }, []);

  // Dispatch SOS Emergency Event to Backend API (Single Execution Guaranteed)
  const dispatchSOS = useCallback(async (currentIncidentId: string, currentLoc: DriverLocation | null) => {
    if (isDispatchingRef.current || hasDispatchedIncidentRef.current === currentIncidentId) {
      return;
    }

    isDispatchingRef.current = true;
    hasDispatchedIncidentRef.current = currentIncidentId;

    try {
      console.log(`[AccidentSOS] Dispatching automatic accident SOS for incident: ${currentIncidentId}...`);
      const payload = {
        userId,
        latitude: currentLoc?.latitude ?? null as any,
        longitude: currentLoc?.longitude ?? null as any,
        accuracy: currentLoc?.accuracy ?? null as any,
        incidentId: currentIncidentId,
        timestamp: new Date().toISOString(),
        eventType: 'CAMERA_OBSTRUCTION_ACCIDENT'
      };

      const res = await emergencyApi.triggerSOS(payload);
      if (res && res.data) {
        setDispatchedRecord(res.data);
      }
      setAccidentState('SOS_SENT');
      playUrgentBuzzer(1200, 0.6);
      speakAlert('Emergency SOS dispatched. Emergency contacts have been notified with your location.');
    } catch (err) {
      console.error('[AccidentSOS] SOS dispatch error:', err);
      setAccidentState('SOS_SENT');
    } finally {
      isDispatchingRef.current = false;
    }
  }, [userId, playUrgentBuzzer, speakAlert]);

  // Cancel Accident Alert / False Positive Confirmation
  const cancelSOS = useCallback(async () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const currentInc = incidentId;
    setAccidentState('CANCELLED');
    obstructionStartTimeRef.current = null;

    speakAlert("Accident alert cancelled. Safe driving resumed.");

    if (currentInc) {
      try {
        await emergencyApi.cancelAccident(userId, currentInc);
      } catch {}
    }

    // Reset back to NORMAL after 3 seconds
    setTimeout(() => {
      setAccidentState('NORMAL');
      setCountdownSeconds(15);
      setIncidentId(null);
    }, 3000);
  }, [incidentId, userId, speakAlert]);

  // Manual Trigger SOS
  const triggerManualSOS = useCallback(async () => {
    initAudio();
    const newIncId = `man_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setIncidentId(newIncId);
    setAccidentState('SOS_COUNTDOWN');
    setCountdownSeconds(5); // Rapid 5s countdown for manual intent
    const loc = await acquireLocation();
    dispatchSOS(newIncId, loc);
  }, [initAudio, acquireLocation, dispatchSOS]);

  // Evaluate Camera Obstruction Persistence (1.5s confirmation window)
  useEffect(() => {
    if (!isCameraActive || accidentState === 'SOS_COUNTDOWN' || accidentState === 'SOS_SENT' || accidentState === 'CANCELLED') {
      return;
    }

    const now = Date.now();
    const isObstructed = isCameraBlocked || obstructionScore >= 75;

    if (isObstructed) {
      if (obstructionStartTimeRef.current === null) {
        obstructionStartTimeRef.current = now;
        setAccidentState('POSSIBLE_CAMERA_OBSTRUCTION');
      } else {
        const duration = now - obstructionStartTimeRef.current;
        // 1.5 seconds of sustained severe camera obstruction triggers accident suspicion
        if (duration >= 1500) {
          const newIncident = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          setIncidentId(newIncident);
          setAccidentState('SOS_COUNTDOWN');
          setCountdownSeconds(15);
          obstructionStartTimeRef.current = null;

          // Start parallel GPS acquisition immediately
          acquireLocation();

          // Audio & Voice warning
          playUrgentBuzzer(880, 0.4);
          speakAlert('Warning: Possible vehicle accident detected. Automatic SOS will be sent in 15 seconds.');
        }
      }
    } else {
      if (accidentState === 'POSSIBLE_CAMERA_OBSTRUCTION') {
        setAccidentState('NORMAL');
      }
      obstructionStartTimeRef.current = null;
    }
  }, [isCameraActive, isCameraBlocked, obstructionScore, accidentState, acquireLocation, playUrgentBuzzer, speakAlert]);

  // 15-Second Countdown Timer Engine
  useEffect(() => {
    if (accidentState === 'SOS_COUNTDOWN') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            // Execute automatic SOS dispatch when countdown reaches 0
            if (incidentId) {
              dispatchSOS(incidentId, location);
            }
            return 0;
          }
          // Beep on each second
          if (prev <= 5) {
            playUrgentBuzzer(950, 0.15);
          } else if (prev % 3 === 0) {
            playUrgentBuzzer(750, 0.1);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [accidentState, incidentId, location, dispatchSOS, playUrgentBuzzer]);

  return {
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
    triggerManualSOS,
    acquireLocation
  };
}

export default useAccidentSOS;
