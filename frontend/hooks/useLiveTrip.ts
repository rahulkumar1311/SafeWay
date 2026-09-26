import { useState, useCallback, useRef } from 'react';
import aiApi from '@/services/aiApi';
import { useDrowsinessContext } from '@/context/DrowsinessContext';

export interface DriverDrowsinessMetrics {
  faceDetected: boolean;
  eyesDetected: boolean;
  leftEAR: number | null;
  rightEAR: number | null;
  ear: number | null;
  eyeState: 'OPEN' | 'CLOSING' | 'CLOSED' | 'UNKNOWN';
  eyeClosureDurationMs: number;
  drowsinessScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  alert: boolean;
  alertState: string;
  timestamp: string;
}

export function useLiveTrip(tripId: string) {
  const { updateMetrics } = useDrowsinessContext();

  // Stable session ID for continuous temporal tracking in Python AI
  const stableSessionIdRef = useRef<string>(`trip_${tripId}_session`);

  // Guard against out-of-order async frame responses
  const lastProcessedTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  const [localMetrics, setLocalMetrics] = useState<DriverDrowsinessMetrics>({
    faceDetected: false,
    eyesDetected: false,
    leftEAR: null,
    rightEAR: null,
    ear: null,
    eyeState: 'UNKNOWN',
    eyeClosureDurationMs: 0,
    drowsinessScore: 0,
    riskLevel: 'LOW',
    alert: false,
    alertState: 'ATTENTIVE',
    timestamp: new Date().toISOString()
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const processFrame = useCallback(async (base64Frame: string) => {
    if (!base64Frame || isProcessingRef.current) return;

    const requestTime = Date.now();
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      setApiError(null);
      const sessionId = stableSessionIdRef.current;

      console.log(`[AI Drowsiness] Request started`);
      console.log(`[AI Drowsiness] Frame sent for session: '${sessionId}'`);

      const response = await aiApi.analyzeDrowsiness(sessionId, base64Frame);
      const processingTimeMs = Date.now() - requestTime;

      console.log(`[AI Drowsiness] Response received`);
      console.log(`[AI Drowsiness] Processing time = ${processingTimeMs} ms`);

      // Discard out-of-order responses (if a newer response was already processed)
      if (requestTime < lastProcessedTimeRef.current) {
        console.warn(`[AI Drowsiness] Discarded out-of-order response (Request time: ${requestTime} < Last processed: ${lastProcessedTimeRef.current})`);
        return;
      }

      if (response && response.data) {
        lastProcessedTimeRef.current = requestTime;
        const data = response.data;

        const isFaceFound = Boolean(data.faceDetected);
        const earValue = isFaceFound && data.ear !== undefined && data.ear !== null ? Number(data.ear) : null;
        const leftEarValue = isFaceFound && data.leftEAR !== undefined && data.leftEAR !== null ? Number(data.leftEAR) : null;
        const rightEarValue = isFaceFound && data.rightEAR !== undefined && data.rightEAR !== null ? Number(data.rightEAR) : null;

        console.log(`[AI Drowsiness] ${isFaceFound ? 'Face detected' : 'Face not detected'}`);
        console.log(`[AI Drowsiness] EAR = ${earValue !== null ? earValue.toFixed(3) : 'N/A'}`);

        const newMetrics: DriverDrowsinessMetrics = {
          faceDetected: isFaceFound,
          eyesDetected: isFaceFound ? Boolean(data.eyesDetected) : false,
          leftEAR: leftEarValue,
          rightEAR: rightEarValue,
          ear: earValue,
          eyeState: isFaceFound ? ((data.eyeState as 'OPEN' | 'CLOSING' | 'CLOSED' | 'UNKNOWN') || 'UNKNOWN') : 'UNKNOWN',
          eyeClosureDurationMs: isFaceFound ? (Number(data.eyeClosureDurationMs) || 0) : 0,
          drowsinessScore: isFaceFound ? (Number(data.drowsinessScore) || 0) : 0,
          riskLevel: isFaceFound ? ((data.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH') || 'LOW') : 'LOW',
          alert: isFaceFound ? Boolean(data.alert) : false,
          alertState: isFaceFound ? String(data.alertState || 'ATTENTIVE') : 'FACE_NOT_DETECTED',
          timestamp: data.timestamp || new Date().toISOString()
        };

        setLocalMetrics(newMetrics);
        updateMetrics(newMetrics);
      }
    } catch (err: any) {
      console.error('[AI Drowsiness] Processing Error:', err);
      const errMsg = err?.response?.data?.message || err.message || 'AI Inference Service Offline';
      setApiError(errMsg);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [updateMetrics]);

  return {
    tripId,
    metrics: localMetrics,
    isProcessing,
    apiError,
    processFrame
  };
}

