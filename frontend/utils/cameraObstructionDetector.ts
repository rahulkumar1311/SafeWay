/**
 * Raw Frame Camera Obstruction & Visibility Detector
 * Analyzes video frame pixels directly to detect total darkness, extreme blur,
 * or uniform hand coverage EVEN WHEN COCO-SSD RETURNS 0 OBJECT DETECTIONS.
 */

export interface CameraVisibilityResult {
  blocked: boolean;
  obstructionScore: number; // 0 to 100%
  visibilityScore: number; // 0 to 100%
  reason: 'OK' | 'DARK_COVERED' | 'UNIFORM_OBSTRUCTION' | 'EXTREME_PROXIMITY';
}

// Offscreen canvas for fast pixel sampling
let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

export function analyzeCameraVisibility(video: HTMLVideoElement): CameraVisibilityResult {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return {
      blocked: false,
      obstructionScore: 0,
      visibilityScore: 100,
      reason: 'OK'
    };
  }

  const width = 160; // Downsampled sampling resolution for high performance
  const height = 120;

  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (!offscreenCtx) {
    return { blocked: false, obstructionScore: 0, visibilityScore: 100, reason: 'OK' };
  }

  try {
    // Draw current video frame to downsampled canvas
    offscreenCtx.drawImage(video, 0, 0, width, height);
    const imgData = offscreenCtx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    const totalPixels = width * height;

    let totalLuminance = 0;

    // First pass: Calculate mean luminance
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // ITU-R BT.601 perceptual luminance equation
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;
    }

    const meanLuminance = totalLuminance / totalPixels;

    // Second pass: Calculate luminance variance & edge gradient
    let totalVariance = 0;
    let totalGradient = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];

        const diff = lum - meanLuminance;
        totalVariance += diff * diff;

        // Horizontal neighbor edge gradient difference
        if (x < width - 1) {
          const nextIdx = (y * width + (x + 1)) * 4;
          const nextLum = 0.299 * pixels[nextIdx] + 0.587 * pixels[nextIdx + 1] + 0.114 * pixels[nextIdx + 2];
          totalGradient += Math.abs(lum - nextLum);
        }
      }
    }

    const variance = totalVariance / totalPixels;
    const stdDev = Math.sqrt(variance);
    const avgGradient = totalGradient / (width * height);

    // Visibility scoring metrics:
    // Standard clear camera scene has stdDev > 25 and avgGradient > 8.
    // Covered camera (hand or dark object) has stdDev < 12 and avgGradient < 3.5.

    let obstructionScore = 0;
    let reason: 'OK' | 'DARK_COVERED' | 'UNIFORM_OBSTRUCTION' | 'EXTREME_PROXIMITY' = 'OK';

    if (meanLuminance < 20) {
      // Extremely dark / camera covered by hand in dim light
      obstructionScore = Math.min(100, Math.round(95 - meanLuminance * 2));
      reason = 'DARK_COVERED';
    } else if (stdDev < 14 && avgGradient < 4.0) {
      // Camera covered by hand or skin-tone/uniform object (high brightness, zero texture/edges)
      obstructionScore = Math.min(100, Math.round(90 - stdDev * 4 - avgGradient * 5));
      reason = 'UNIFORM_OBSTRUCTION';
    } else {
      obstructionScore = Math.max(0, Math.round(30 - stdDev * 0.5 - avgGradient * 2));
      reason = 'OK';
    }

    const visibilityScore = Math.max(0, Math.min(100, 100 - obstructionScore));
    const isBlocked = obstructionScore >= 75 || visibilityScore <= 25;

    return {
      blocked: isBlocked,
      obstructionScore,
      visibilityScore,
      reason
    };
  } catch (err) {
    console.warn('[CameraObstruction] Error analyzing visibility:', err);
    return { blocked: false, obstructionScore: 0, visibilityScore: 100, reason: 'OK' };
  }
}

export default analyzeCameraVisibility;
