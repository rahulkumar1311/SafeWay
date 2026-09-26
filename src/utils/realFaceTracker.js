// Real MediaPipe & Computer Vision Facial Landmark Data Processor

export class RealFaceTracker {
  constructor() {
    this.blinkCount = 0;
    this.yawnCount = 0;
    this.isEyeClosed = false;
    this.isYawning = false;
    this.lastBlinkTime = 0;
    this.yawnStartTime = 0;
    this.earHistory = [];
  }

  // 3D/2D Distance between points
  getDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = (p1.x - p2.x);
    const dy = (p1.y - p2.y);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Calculate Real Eye Aspect Ratio (EAR) from MediaPipe Landmarks
  calculateEARFromLandmarks(landmarks, eyeIndices) {
    if (!landmarks || landmarks.length < 400) return 0.35;
    const p1 = landmarks[eyeIndices[0]];
    const p2 = landmarks[eyeIndices[1]];
    const p3 = landmarks[eyeIndices[2]];
    const p4 = landmarks[eyeIndices[3]];
    const p5 = landmarks[eyeIndices[4]];
    const p6 = landmarks[eyeIndices[5]];

    const v1 = this.getDistance(p2, p6);
    const v2 = this.getDistance(p3, p5);
    const h = this.getDistance(p1, p4);

    if (h === 0) return 0.35;
    return (v1 + v2) / (2.0 * h);
  }

  // Calculate Real Mouth Aspect Ratio (MAR) for Yawn detection
  calculateMARFromLandmarks(landmarks) {
    if (!landmarks || landmarks.length < 400) return 0.15;
    const pTop = landmarks[13];
    const pBot = landmarks[14];
    const pLeft = landmarks[78];
    const pRight = landmarks[308];

    const v = this.getDistance(pTop, pBot);
    const h = this.getDistance(pLeft, pRight);

    if (h === 0) return 0.15;
    return v / h;
  }

  // Calculate Real Head Posture Tilt (Degrees)
  calculateHeadTilt(landmarks) {
    if (!landmarks || landmarks.length < 400) return 0;
    const nose = landmarks[4];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    if (!nose || !chin || !forehead) return 0;

    const dy = chin.y - forehead.y;
    const dx = chin.x - forehead.x;
    const angleRad = Math.atan2(dx, dy);
    return Math.round(angleRad * (180 / Math.PI));
  }

  // Process Direct Numerical Frame Inputs
  processFrame(earScore, marScore, headTilt) {
    const now = Date.now();

    // 1. Real Blink Detection Logic
    if (earScore < 0.21) {
      if (!this.isEyeClosed) {
        this.isEyeClosed = true;
        this.lastBlinkTime = now;
      }
    } else {
      if (this.isEyeClosed) {
        const closureDuration = now - this.lastBlinkTime;
        if (closureDuration >= 80 && closureDuration <= 500) {
          this.blinkCount += 1;
        }
        this.isEyeClosed = false;
      }
    }

    // 2. Real Yawn Detection Logic
    if (marScore > 0.55) {
      if (!this.isYawning) {
        this.isYawning = true;
        this.yawnStartTime = now;
      } else {
        if (now - this.yawnStartTime > 1200) {
          this.yawnCount += 1;
          this.isYawning = false;
        }
      }
    } else {
      this.isYawning = false;
    }

    // Smooth EAR history for fatigue calculation
    this.earHistory.push(earScore);
    if (this.earHistory.length > 40) this.earHistory.shift();

    const avgEAR = this.earHistory.reduce((a, b) => a + b, 0) / this.earHistory.length;
    let fatiguePercentage = Math.round((1 - (avgEAR / 0.38)) * 100);
    if (this.yawnCount > 0) fatiguePercentage += this.yawnCount * 7;
    if (Math.abs(headTilt) > 12) fatiguePercentage += 10;

    fatiguePercentage = Math.max(4, Math.min(99, fatiguePercentage));

    return {
      blinkCount: this.blinkCount,
      yawnCount: this.yawnCount,
      isEyeClosed: this.isEyeClosed,
      isDrowsyAlert: earScore < 0.21,
      fatiguePercentage
    };
  }

  // Process MediaPipe Landmarks Array
  processLandmarks(landmarks) {
    const LEFT_EYE = [33, 160, 158, 133, 153, 144];
    const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

    const leftEAR = this.calculateEARFromLandmarks(landmarks, LEFT_EYE);
    const rightEAR = this.calculateEARFromLandmarks(landmarks, RIGHT_EYE);
    const earScore = parseFloat(((leftEAR + rightEAR) / 2.0).toFixed(2));
    const marScore = this.calculateMARFromLandmarks(landmarks);
    const headTilt = this.calculateHeadTilt(landmarks);

    const frameResults = this.processFrame(earScore, marScore, headTilt);

    return {
      earScore,
      marScore,
      headTilt,
      ...frameResults
    };
  }

  reset() {
    this.blinkCount = 0;
    this.yawnCount = 0;
    this.isEyeClosed = false;
    this.isYawning = false;
    this.earHistory = [];
  }
}

export const realFaceTracker = new RealFaceTracker();
