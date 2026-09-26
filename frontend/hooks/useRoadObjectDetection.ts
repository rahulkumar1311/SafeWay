import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { analyzeCameraVisibility, CameraVisibilityResult } from '@/utils/cameraObstructionDetector';
import { StandardRoadHazardDetection, RoadHazardType } from '@/types/roadHazard';
import roadHazardRuleEngine from '@/services/roadHazardRuleEngine';
import roadPerceptionService from '@/services/roadPerceptionService';

export interface DetectedRoadObject {
  id: string;
  class: string;
  score: number;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  areaRatio: number;
  heightRatio: number;
  centerX: number;
  centerY: number;
  corridorWeight: number;
  expansionRate: number;
  proximityRisk: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED';
}

export const PROXIMITY_THRESHOLDS = {
  NORMAL_MAX: 0.10,   // < 10% area -> NORMAL
  CAUTION_MAX: 0.25,  // 10-25% area -> CAUTION
  WARNING_MAX: 0.50,  // 25-50% area -> WARNING
  CRITICAL_MAX: 0.75, // 50-75% area -> CRITICAL
  BLOCKED_MIN: 0.75   // > 75% area -> CAMERA BLOCKED candidate
};

const RELEVANT_CLASSES = new Set([
  'person',
  'car',
  'motorcycle',
  'bicycle',
  'bus',
  'truck',
  'stop sign',
  'traffic light'
]);

function calculateIoU(
  boxA: [number, number, number, number],
  boxB: [number, number, number, number]
): number {
  const [xA, yA, wA, hA] = boxA;
  const [xB, yB, wB, hB] = boxB;

  const x1 = Math.max(xA, xB);
  const y1 = Math.max(yA, yB);
  const x2 = Math.min(xA + wA, xB + wB);
  const y2 = Math.min(yA + hA, yB + hB);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  const areaA = wA * hA;
  const areaB = wB * hB;
  const unionArea = areaA + areaB - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

export function useRoadObjectDetection(videoRef: React.RefObject<HTMLVideoElement>, isCameraActive: boolean) {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  const [detectedObjects, setDetectedObjects] = useState<DetectedRoadObject[]>([]);
  const [roadHazards, setRoadHazards] = useState<StandardRoadHazardDetection[]>([]);
  const [primaryHazard, setPrimaryHazard] = useState<StandardRoadHazardDetection | null>(null);
  const [secondarySignStatus, setSecondarySignStatus] = useState<'ACTIVE' | 'UNAVAILABLE'>('UNAVAILABLE');

  const [highestRisk, setHighestRisk] = useState<'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED'>('NORMAL');
  const [isCameraBlocked, setIsCameraBlocked] = useState<boolean>(false);

  // Diagnostics panel state
  const [fps, setFps] = useState<number>(0);
  const [largestBoxAreaRatio, setLargestBoxAreaRatio] = useState<number>(0);
  const [visibilityScore, setVisibilityScore] = useState<number>(100);
  const [obstructionScore, setObstructionScore] = useState<number>(0);

  const animationFrameRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastSignAnalysisTimeRef = useRef<number>(0);
  const consecutiveBlockedFramesRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);
  const lastFpsTimestampRef = useRef<number>(Date.now());

  const trackedCacheRef = useRef<Array<{ id: string; bbox: [number, number, number, number]; areaRatio: number }>>([]);
  const nextTrackIdRef = useRef<number>(1);
  const latestSecondarySignRef = useRef<StandardRoadHazardDetection | null>(null);
  const offscreenSignCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load TensorFlow.js COCO-SSD model
  useEffect(() => {
    let isMounted = true;
    async function loadModel() {
      try {
        console.log('[COCO] model loading');
        setIsModelLoading(true);
        setModelError(null);
        await tf.ready();
        const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        if (isMounted) {
          setModel(loadedModel);
          setIsModelLoading(false);
          console.log('[COCO] model loaded');
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.error('[COCO] Model loading error:', err);
        if (isMounted) {
          setIsModelLoading(false);
          setModelError(`Failed to load COCO-SSD object detection model: ${errMsg}`);
        }
      }
    }
    loadModel();
    return () => {
      isMounted = false;
    };
  }, []);

  // Main Single-Loop Object Detection & Visibility Analysis
  useEffect(() => {
    if (!model || !isCameraActive || !videoRef.current) return;

    let isRunning = true;

    const detectFrame = async () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const now = Date.now();

        // Calculate FPS
        frameCounterRef.current++;
        if (now - lastFpsTimestampRef.current >= 1000) {
          setFps(frameCounterRef.current);
          frameCounterRef.current = 0;
          lastFpsTimestampRef.current = now;
        }

        // Secondary Python AI Traffic Sign Sample Loop (~500ms interval)
        if (now - lastSignAnalysisTimeRef.current >= 500) {
          lastSignAnalysisTimeRef.current = now;
          try {
            if (!offscreenSignCanvasRef.current) {
              offscreenSignCanvasRef.current = document.createElement('canvas');
              offscreenSignCanvasRef.current.width = 320;
              offscreenSignCanvasRef.current.height = 240;
            }
            const canvas = offscreenSignCanvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, 320, 240);
              const base64Frame = canvas.toDataURL('image/jpeg', 0.5);
              const signResult = await roadPerceptionService.analyzeSecondaryRoadSign(base64Frame);
              if (signResult && signResult.status === 'ACTIVE') {
                setSecondarySignStatus('ACTIVE');
                let hazardType: RoadHazardType = 'school_zone';
                if (signResult.signType === 'Pedestrian Crossing') hazardType = 'pedestrian_crossing';
                else if (signResult.signType === 'School Zone') hazardType = 'school_zone';
                else if (signResult.signType === 'Sharp Turn' || signResult.signType === 'Dangerous Turn') hazardType = 'sharp_turn';
                else if (signResult.signType === 'Mandatory Turn Left') hazardType = 'left_turn';
                else if (signResult.signType === 'Mandatory Turn Right') hazardType = 'right_turn';
                else if (signResult.signType === 'Stop Sign') hazardType = 'stop_sign';
                else if (signResult.signType.startsWith('Speed Limit')) hazardType = 'speed_limit';

                const evaluatedSign = roadHazardRuleEngine.evaluateDetection(
                  hazardType,
                  signResult.signType,
                  signResult.confidence,
                  { x: 40, y: 40, width: 120, height: 120 },
                  video.videoHeight,
                  60
                );
                latestSecondarySignRef.current = evaluatedSign;
              } else {
                setSecondarySignStatus('UNAVAILABLE');
                latestSecondarySignRef.current = null;
              }
            }
          } catch (err) {
            setSecondarySignStatus('UNAVAILABLE');
            latestSecondarySignRef.current = null;
          }
        }

        // Throttle inference loop to ~10 FPS (100ms)
        if (now - lastInferenceTimeRef.current >= 100) {
          lastInferenceTimeRef.current = now;

          try {
            // 1. Raw Pixel Camera Visibility Analysis
            const visibilityResult: CameraVisibilityResult = analyzeCameraVisibility(video);
            setVisibilityScore(visibilityResult.visibilityScore);
            setObstructionScore(visibilityResult.obstructionScore);

            // 2. COCO-SSD Inference
            const predictions = await model.detect(video, 10, 0.35);

            const videoW = video.videoWidth;
            const videoH = video.videoHeight;
            const frameArea = videoW * videoH;

            const previousTracks = trackedCacheRef.current;
            const newTracks: Array<{ id: string; bbox: [number, number, number, number]; areaRatio: number }> = [];

            let maxAreaRatioPct = 0;
            const activeHazardsList: StandardRoadHazardDetection[] = [];

            const filtered: DetectedRoadObject[] = predictions
              .filter((p) => RELEVANT_CLASSES.has(p.class.toLowerCase()))
              .map((p) => {
                const scorePct = Math.round(p.score * 100);
                const [x, y, w, h] = p.bbox;

                const area = w * h;
                const areaRatio = area / frameArea;
                const areaRatioPct = areaRatio * 100;
                const heightRatio = h / videoH;

                const bboxCenterX = x + w / 2;
                const bboxCenterY = y + h / 2;
                const centerX = bboxCenterX / videoW;
                const centerY = bboxCenterY / videoH;

                if (areaRatioPct > maxAreaRatioPct) {
                  maxAreaRatioPct = areaRatioPct;
                }

                // Corridor weighting
                const distFromCenter = Math.abs(centerX - 0.5);
                let corridorWeight = 0.3;
                if (distFromCenter <= 0.15) corridorWeight = 1.0;
                else if (distFromCenter <= 0.30) corridorWeight = 0.7;

                // Temporal object tracking
                let matchedId = '';
                let expansionRate = 0;
                let bestIoU = 0;
                let bestPrevIdx = -1;

                previousTracks.forEach((prevTrack, idx) => {
                  const iou = calculateIoU(p.bbox, prevTrack.bbox);
                  if (iou > 0.3 && iou > bestIoU) {
                    bestIoU = iou;
                    bestPrevIdx = idx;
                  }
                });

                if (bestPrevIdx >= 0) {
                  const prevTrack = previousTracks[bestPrevIdx];
                  matchedId = prevTrack.id;
                  expansionRate = areaRatioPct - prevTrack.areaRatio;
                } else {
                  matchedId = `obj_${nextTrackIdRef.current++}`;
                }

                newTracks.push({
                  id: matchedId,
                  bbox: p.bbox,
                  areaRatio: areaRatioPct
                });

                // Proximity risk based on areaRatio thresholds
                let proximityRisk: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED' = 'NORMAL';
                if (areaRatio >= PROXIMITY_THRESHOLDS.BLOCKED_MIN) {
                  proximityRisk = 'CAMERA_BLOCKED';
                } else if (areaRatio >= PROXIMITY_THRESHOLDS.CRITICAL_MAX) {
                  proximityRisk = 'CRITICAL';
                } else if (areaRatio >= PROXIMITY_THRESHOLDS.WARNING_MAX) {
                  proximityRisk = 'WARNING';
                } else if (areaRatio >= PROXIMITY_THRESHOLDS.CAUTION_MAX) {
                  proximityRisk = 'CAUTION';
                }

                // Map COCO-SSD detection to StandardRoadHazardDetection
                let hazardType: RoadHazardType = 'road_obstacle';
                const lowerClass = p.class.toLowerCase();
                if (lowerClass === 'person') hazardType = 'pedestrian_crossing';
                else if (lowerClass === 'stop sign') hazardType = 'stop_sign';
                else if (lowerClass === 'traffic light') hazardType = 'traffic_light';
                else hazardType = 'road_obstacle';

                const hazardObj = roadHazardRuleEngine.evaluateDetection(
                  hazardType,
                  p.class.toUpperCase(),
                  scorePct,
                  { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) },
                  videoH,
                  60
                );
                activeHazardsList.push(hazardObj);

                return {
                  id: matchedId,
                  class: p.class,
                  score: scorePct,
                  confidence: scorePct,
                  bbox: [x, y, w, h],
                  areaRatio: Math.round(areaRatioPct * 10) / 10,
                  heightRatio: Math.round(heightRatio * 100) / 100,
                  centerX: Math.round(centerX * 100) / 100,
                  centerY: Math.round(centerY * 100) / 100,
                  corridorWeight: Math.round(corridorWeight * 100) / 100,
                  expansionRate: Math.round(expansionRate * 10) / 10,
                  proximityRisk
                };
              });

            if (latestSecondarySignRef.current) {
              activeHazardsList.push(latestSecondarySignRef.current);
            }

            trackedCacheRef.current = newTracks;
            setLargestBoxAreaRatio(Math.round(maxAreaRatioPct * 10) / 10);

            // 3. Camera Obstruction Persistence Evaluation
            const isBlockedFrame = visibilityResult.blocked || maxAreaRatioPct >= 75;
            if (isBlockedFrame) {
              consecutiveBlockedFramesRef.current++;
            } else {
              consecutiveBlockedFramesRef.current = 0;
            }

            const blockedPersisted = consecutiveBlockedFramesRef.current >= 3;
            setIsCameraBlocked(blockedPersisted);

            // Fuse simultaneous hazards
            const fusedHazards = roadHazardRuleEngine.fuseMultipleHazards(activeHazardsList, 60);

            // 4. Unified Frame Risk Level Calculation
            let frameRiskLevel: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED' = 'NORMAL';
            if (blockedPersisted) {
              frameRiskLevel = 'CAMERA_BLOCKED';
            } else if (fusedHazards.highestRiskLevel === 'CRITICAL' || maxAreaRatioPct >= 50) {
              frameRiskLevel = 'CRITICAL';
            } else if (fusedHazards.highestRiskLevel === 'HIGH' || maxAreaRatioPct >= 25) {
              frameRiskLevel = 'WARNING';
            } else if (fusedHazards.highestRiskLevel === 'MEDIUM' || maxAreaRatioPct >= 10) {
              frameRiskLevel = 'CAUTION';
            }

            if (isRunning) {
              setDetectedObjects(filtered);
              setRoadHazards(activeHazardsList);
              setPrimaryHazard(fusedHazards.primaryHazard);
              setHighestRisk(frameRiskLevel);
            }
          } catch (err) {
            console.error('[COCO] Detection loop error:', err);
          }
        }
      }

      if (isRunning) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isRunning = false;
      consecutiveBlockedFramesRef.current = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [model, isCameraActive, videoRef]);

  return {
    isModelLoading,
    modelError,
    detectedObjects,
    roadHazards,
    primaryHazard,
    secondarySignStatus,
    highestRisk,
    isCameraBlocked,
    fps,
    largestBoxAreaRatio,
    visibilityScore,
    obstructionScore
  };
}
