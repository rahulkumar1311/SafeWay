import { useState, useEffect, useRef, useCallback } from 'react';
import emergencyApi from '@/services/emergencyApi';

export type CrashState =
  | 'NORMAL'
  | 'SUSPECTED_IMPACT'
  | 'CONFIRMED_CRASH'
  | 'EMERGENCY_PENDING'
  | 'EMERGENCY_SENT'
  | 'CANCELLED';

export interface CrashEventData {
  eventId: string;
  decelerationG: number;
  impactScore: number;
  timestamp: string;
}

export function useCrashDetector(
  latitude: number,
  longitude: number,
  speed: number,
  onConfirmedCrash?: (data: { latitude: number; longitude: number; decelerationG: number }) => void
) {
  const [crashState, setCrashState] = useState<CrashState>('NORMAL');
  const [countdown, setCountdown] = useState<number>(15);
  const [activeEvent, setActiveEvent] = useState<CrashEventData | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger impact event state machine
  const triggerImpactEvent = useCallback(async (decelG: number, score: number) => {
    try {
      console.log(`[CrashDetector] Impact threshold crossed! Deceleration: ${decelG}G, Score: ${score}`);

      const response = await emergencyApi.sendTelemetry({
        userId: 'default_user',
        latitude,
        longitude,
        speed,
        decelerationG: decelG,
        impactScore: score
      });

      if (response && response.data && response.data.status === 'CONFIRMATION_PENDING') {
        const data = response.data;
        setActiveEvent({
          eventId: data.eventId || `acc_${Date.now()}`,
          decelerationG: decelG,
          impactScore: score,
          timestamp: data.timestamp || new Date().toISOString()
        });
        setCrashState('SUSPECTED_IMPACT');
        setCountdown(15);
      }
    } catch (err) {
      console.error('[CrashDetector] Error triggering telemetry incident:', err);
    }
  }, [latitude, longitude, speed]);

  // Cancel false positive alert
  const cancelEmergency = useCallback(async () => {
    console.log('[CrashDetector] Driver cancelled accident alert (False Alarm)');
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (activeEvent) {
      try {
        await emergencyApi.cancelAccident('default_user', activeEvent.eventId);
      } catch (err) {
        console.warn('[CrashDetector] Cancel API call note:', err);
      }
    }

    setCrashState('CANCELLED');
    setActiveEvent(null);
    setTimeout(() => setCrashState('NORMAL'), 3000);
  }, [activeEvent]);

  // Confirm crash, trigger V2V broadcast, and dispatch SMS notification
  const confirmEmergency = useCallback(async () => {
    console.log('[CrashDetector] Confirming crash and dispatching emergency notifications...');
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    setCrashState('CONFIRMED_CRASH');

    if (onConfirmedCrash) {
      onConfirmedCrash({
        latitude,
        longitude,
        decelerationG: activeEvent?.decelerationG || 3.0
      });
    }

    if (activeEvent) {
      try {
        const res = await emergencyApi.confirmAccident('default_user', activeEvent.eventId);
        if (res && res.data && res.data.notification) {
          setNotificationStatus(res.data.notification.message || 'Emergency notification dispatched');
        }
        setCrashState('EMERGENCY_SENT');
      } catch (err) {
        console.error('[CrashDetector] Confirm API error:', err);
        setCrashState('EMERGENCY_SENT');
      }
    }
  }, [activeEvent, latitude, longitude, onConfirmedCrash]);

  // Handle countdown ticker when SUSPECTED_IMPACT is active
  useEffect(() => {
    if (crashState === 'SUSPECTED_IMPACT') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            confirmEmergency();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [crashState, confirmEmergency]);

  // Listen to browser DeviceMotionEvent acceleration G-force
  useEffect(() => {
    let lastSensorTime = Date.now();

    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const now = Date.now();
      if (now - lastSensorTime < 300) return; // 300ms debounce
      lastSensorTime = now;

      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const totalAcc = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const decelG = totalAcc / 9.81;

      // Threshold: Deceleration >= 2.8G
      if (decelG >= 2.8 && crashState === 'NORMAL') {
        const impactScore = Math.min(100, Math.round(decelG * 25));
        triggerImpactEvent(decelG, impactScore);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [crashState, triggerImpactEvent]);

  return {
    crashState,
    countdown,
    activeEvent,
    notificationStatus,
    triggerImpactEvent,
    cancelEmergency,
    confirmEmergency
  };
}
