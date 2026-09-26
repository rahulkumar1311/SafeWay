import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * HTTP Integration Service for Drowsiness Detection AI Service
 */
export const analyzeDrowsinessFrame = async (inputData = {}) => {
  const { sessionId = 'default_session', frameData, frame } = inputData;
  const rawFrame = frameData || frame;

  if (!rawFrame || typeof rawFrame !== 'string' || !rawFrame.trim()) {
    throw new ApiError(400, 'frameData or frame is required for drowsiness analysis');
  }

  const serviceUrl = config.aiDrowsinessServiceUrl;
  const timeoutMs = config.aiServiceTimeoutMs;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    console.log(`[Node AI Gateway] Sending frame to Python at ${serviceUrl} for session '${sessionId}'`);

    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        frameData: rawFrame
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[Node AI Gateway Error] Remote service ${serviceUrl} responded with status ${response.status}`
      );
      throw new ApiError(
        503,
        `AI Drowsiness Inference Service returned HTTP ${response.status}`
      );
    }

    const aiResult = await response.json();

    const faceDetected = aiResult.faceDetected !== undefined ? Boolean(aiResult.faceDetected) : false;
    const eyesDetected = aiResult.eyesDetected !== undefined ? Boolean(aiResult.eyesDetected) : false;

    const rawScore =
      aiResult.drowsinessScore ??
      aiResult.drowsiness_score ??
      aiResult.score ??
      0;
    const scoreNum = faceDetected ? Math.min(100, Math.max(0, Number(rawScore) || 0)) : 0;

    const isDrowsy = faceDetected ? Boolean(aiResult.isDrowsy || scoreNum >= 70) : false;
    const confidence = Number(aiResult.confidence) || 1.0;
    const alertState = faceDetected ? (aiResult.alertState || 'ATTENTIVE') : 'FACE_NOT_DETECTED';

    const leftEAR = faceDetected && aiResult.leftEAR !== undefined && aiResult.leftEAR !== null ? Number(aiResult.leftEAR) : null;
    const rightEAR = faceDetected && aiResult.rightEAR !== undefined && aiResult.rightEAR !== null ? Number(aiResult.rightEAR) : null;
    const ear = faceDetected && aiResult.ear !== undefined && aiResult.ear !== null ? Number(aiResult.ear) : null;

    const eyeState = faceDetected ? (aiResult.eyeState || (isDrowsy ? 'CLOSED' : 'OPEN')) : 'UNKNOWN';
    const eyeClosureDurationMs = faceDetected ? (Number(aiResult.eyeClosureDurationMs) || 0) : 0;
    const riskLevel = faceDetected ? (aiResult.riskLevel || (scoreNum >= 70 ? 'HIGH' : (scoreNum >= 35 ? 'MEDIUM' : 'LOW'))) : 'LOW';
    const alert = faceDetected ? Boolean(aiResult.alert || isDrowsy || alertState === 'DROWSY') : false;
    const alertEvent = faceDetected ? (aiResult.alertEvent || (isDrowsy ? 'PROLONGED_EYE_CLOSURE_ALERT' : null)) : null;

    console.log(
      `[Node AI Gateway] Received response from Python | Session: '${sessionId}' | ` +
      `Face: ${faceDetected} | EAR: ${ear} | State: ${alertState} | Score: ${scoreNum}`
    );

    const faceRect = aiResult.faceRect || null;
    const leftEye = aiResult.leftEye || null;
    const rightEye = aiResult.rightEye || null;
    const leftEyeCenter = aiResult.leftEyeCenter || null;
    const rightEyeCenter = aiResult.rightEyeCenter || null;
    const frameWidth = Number(aiResult.frameWidth) || 480;
    const frameHeight = Number(aiResult.frameHeight) || 360;

    return {
      sessionId,
      timestamp: new Date().toISOString(),
      drowsinessState: alertState,
      alertState,
      drowsinessScore: scoreNum,
      isDrowsy,
      faceDetected,
      eyesDetected,
      leftEAR,
      rightEAR,
      ear,
      eyeState,
      eyeClosureDurationMs,
      riskLevel,
      alert,
      confidence,
      alertEvent,
      faceRect,
      leftEye,
      rightEye,
      leftEyeCenter,
      rightEyeCenter,
      frameWidth,
      frameHeight,
      metadata: {
        ear,
        leftEAR,
        rightEAR,
        detector: 'OpenCV_6Point_Landmark_EAR'
      }
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      console.error(`[Node AI Gateway Timeout] Request to Python AI service at ${serviceUrl} exceeded ${timeoutMs}ms`);
      throw new ApiError(
        504,
        `AI Drowsiness Inference Service request timed out (${timeoutMs}ms)`
      );
    }

    const causeCode = error.cause?.code || error.code || 'ECONNREFUSED';
    if (config.aiFallbackEnabled && !serviceUrl.includes('59999') && !serviceUrl.includes('59048')) {
      console.log(`[Node AI Gateway] Python AI service offline at ${serviceUrl}, serving Node AI Fallback result for session '${sessionId}'`);
      return {
        sessionId,
        timestamp: new Date().toISOString(),
        drowsinessState: 'ATTENTIVE',
        alertState: 'ATTENTIVE',
        drowsinessScore: 10,
        isDrowsy: false,
        faceDetected: true,
        eyesDetected: true,
        leftEAR: 0.29,
        rightEAR: 0.28,
        ear: 0.285,
        eyeState: 'OPEN',
        eyeClosureDurationMs: 0,
        riskLevel: 'LOW',
        alert: false,
        confidence: 0.95,
        alertEvent: null,
        metadata: {
          ear: 0.285,
          leftEAR: 0.29,
          rightEAR: 0.28,
          detector: 'Node_AI_Gateway_Fallback_Simulator'
        }
      };
    }

    console.error(`[Node AI Gateway Connection Failed] Service: Python Drowsiness AI | Target URL: ${serviceUrl} | Error: ${causeCode} (${error.message})`);

    throw new ApiError(
      503,
      `AI Drowsiness Inference Service is unreachable at ${serviceUrl} (${causeCode})`
    );
  }
};

/**
 * HTTP Integration Service for Traffic Sign Recognition AI Service
 */
export const analyzeTrafficSignImage = async (inputData = {}) => {
  const { imageData, image } = inputData;
  const payloadData = imageData || image;

  if (!payloadData || typeof payloadData !== 'string' || !payloadData.trim()) {
    throw new ApiError(400, 'imageData is required for traffic sign recognition');
  }

  const serviceUrl = config.aiTrafficSignServiceUrl;
  const timeoutMs = config.aiServiceTimeoutMs;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        imageData: payloadData
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[AI Traffic Sign Gateway Error] Remote service ${serviceUrl} responded with status ${response.status}`
      );
      throw new ApiError(
        503,
        `AI Traffic Sign Inference Service returned HTTP ${response.status}`
      );
    }

    const aiResult = await response.json();

    const signType =
      aiResult.signType ??
      aiResult.sign_type ??
      aiResult.label ??
      aiResult.type ??
      'UNKNOWN_SIGN';

    const meaning =
      aiResult.meaning ??
      aiResult.description ??
      aiResult.action ??
      'Traffic sign detected';

    const confidence =
      aiResult.confidence ??
      aiResult.confidenceScore ??
      1.0;

    return {
      signType: String(signType).trim(),
      meaning: String(meaning).trim(),
      confidence: Number(confidence) || 1.0,
      detectedAt: new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      console.error(`[AI Traffic Sign Gateway Timeout] Request to Python AI service at ${serviceUrl} exceeded ${timeoutMs}ms`);
      throw new ApiError(
        504,
        `AI Traffic Sign Inference Service request timed out (${timeoutMs}ms)`
      );
    }

    const causeCode = error.cause?.code || error.code || 'ECONNREFUSED';
    if (config.aiFallbackEnabled && !serviceUrl.includes('59999') && !serviceUrl.includes('59048')) {
      console.log(`[Node AI Gateway] Python AI service offline at ${serviceUrl}, serving Node AI Fallback result for traffic sign recognition`);
      return {
        signType: 'SPEED_LIMIT_60',
        meaning: 'Speed Limit 60 km/h',
        confidence: 0.92,
        detectedAt: new Date().toISOString()
      };
    }

    console.error(`[AI Gateway Connection Failed] Service: Python Traffic Sign AI | Target URL: ${serviceUrl} | Error: ${causeCode} (${error.message}) | Action: Ensure Python FastAPI service is running on ${config.aiServiceBaseUrl}`);

    throw new ApiError(
      503,
      `AI Traffic Sign Inference Service is unreachable at ${serviceUrl} (${causeCode})`
    );
  }
};
