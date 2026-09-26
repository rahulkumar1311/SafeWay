import numpy as np
from typing import Dict, Any, List, Tuple
from common.config import settings
from common.logger import logger

def calculate_6point_ear(points: List[Tuple[float, float]]) -> float:
    """
    Calculates Eye Aspect Ratio (EAR) using standard 6-point 2D landmarks:
    EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    """
    if len(points) < 6:
        return 0.30

    p1, p2, p3, p4, p5, p6 = points[0:6]

    # Vertical distances
    v1 = np.sqrt((p2[0] - p6[0]) ** 2 + (p2[1] - p6[1]) ** 2)
    v2 = np.sqrt((p3[0] - p5[0]) ** 2 + (p3[1] - p5[1]) ** 2)

    # Horizontal distance
    h = np.sqrt((p1[0] - p4[0]) ** 2 + (p1[1] - p4[1]) ** 2)

    if h == 0:
        return 0.30

    ear = float(v1 + v2) / float(2.0 * h)
    return round(ear, 3)

class EyeAnalyzer:
    """
    Computes Eye Aspect Ratio (EAR) metrics and eye closure state using 6-point eye landmarks.
    """

    def analyze(self, detection_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates leftEAR, rightEAR, average EAR, and eye closure state.
        Prioritizes real 468 3D MediaPipe eye landmark mesh points.
        """
        face_detected = detection_result.get("face_detected", True if ("eyes" in detection_result and len(detection_result["eyes"]) > 0) or ("left_eye_landmarks" in detection_result) else False)

        if not face_detected:
            return {
                "left_ear": None,
                "right_ear": None,
                "ear": None,
                "is_closed": False,
                "eye_state": "UNKNOWN",
                "eye_fatigue_score": 0.0
            }

        # Check for real MediaPipe eye landmark contour points
        left_landmarks = detection_result.get("left_eye_landmarks")
        right_landmarks = detection_result.get("right_eye_landmarks")

        if left_landmarks and right_landmarks and len(left_landmarks) >= 6 and len(right_landmarks) >= 6:
            left_ear = calculate_6point_ear(left_landmarks)
            right_ear = calculate_6point_ear(right_landmarks)
            ear = round(float((left_ear + right_ear) / 2.0), 3)
            logger.info(f"[Eye Analyzer] Computed MediaPipe 468 Mesh EAR | Left: {left_ear} | Right: {right_ear} | Avg: {ear}")
        else:
            eyes = detection_result.get("eyes", [])
            # In OpenCV cascade mode, if a face is detected but the eye cascade detects NO open eyes in upper face ROI,
            # the eyes are closed. If eye cascade detects eyes, they are open.
            if len(eyes) >= 2:
                left_ear = 0.30
                right_ear = 0.30
                ear = 0.30
            elif len(eyes) == 1:
                left_ear = 0.28
                right_ear = 0.28
                ear = 0.28
            else:
                # 0 open eyes detected in face -> Closed eyes
                left_ear = 0.14
                right_ear = 0.14
                ear = 0.14

        # Determine eye state based on EAR thresholds
        # EAR < 0.21 => CLOSED, EAR < 0.24 => CLOSING, EAR >= 0.24 => OPEN
        if ear < settings.EAR_THRESHOLD:
            eye_state = "CLOSED"
            is_closed = True
        elif ear < (settings.EAR_THRESHOLD + 0.03):
            eye_state = "CLOSING"
            is_closed = True
        else:
            eye_state = "OPEN"
            is_closed = False

        # Map EAR to eye fatigue score (0.0 to 100.0)
        if ear < (settings.EAR_THRESHOLD - 0.06):
            eye_score = 100.0
        elif ear < settings.EAR_THRESHOLD:
            diff = settings.EAR_THRESHOLD - ear
            eye_score = 50.0 + (diff / 0.06) * 50.0
        elif ear < (settings.EAR_THRESHOLD + 0.05):
            diff = (settings.EAR_THRESHOLD + 0.05) - ear
            eye_score = (diff / 0.05) * 50.0
        else:
            eye_score = 0.0

        return {
            "left_ear": left_ear,
            "right_ear": right_ear,
            "ear": ear,
            "is_closed": is_closed,
            "eye_state": eye_state,
            "eye_fatigue_score": round(eye_score, 1)
        }

    def _extract_6point_landmarks(self, eye_box: Tuple[int, int, int, int]) -> List[Tuple[float, float]]:
        """
        Derives 6 landmark contour points [p1, p2, p3, p4, p5, p6] from eye ROI box (x, y, w, h).
        p1 = left corner, p4 = right corner, p2 & p3 = top lid, p5 & p6 = bottom lid.
        """
        ex, ey, ew, eh = eye_box
        x, y, w, h = float(ex), float(ey), float(ew), float(eh)

        p1 = (x, y + h * 0.5)
        p2 = (x + w * 0.25, y + h * 0.1)
        p3 = (x + w * 0.75, y + h * 0.1)
        p4 = (x + w, y + h * 0.5)
        p5 = (x + w * 0.75, y + h * 0.9)
        p6 = (x + w * 0.25, y + h * 0.9)

        return [p1, p2, p3, p4, p5, p6]

eye_analyzer = EyeAnalyzer()
