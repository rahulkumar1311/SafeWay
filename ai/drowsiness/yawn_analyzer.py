import numpy as np
from typing import Dict, Any
from common.config import settings
from common.logger import logger

class YawnAnalyzer:
    """
    Computes Mouth Aspect Ratio (MAR) metric and mouth opening/yawn signal.
    """

    def analyze(self, detection_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates MAR metric and yawn state based on configurable MAR_THRESHOLD.
        """
        lower_roi = detection_result.get("lower_face_roi")

        if lower_roi is None or lower_roi.size == 0:
            return {
                "mar": settings.MAR_THRESHOLD - 0.10,
                "is_yawning": False,
                "yawn_fatigue_score": 0.0
            }

        h, w = lower_roi.shape
        mouth_center = lower_roi[int(h * 0.2):int(h * 0.8), int(w * 0.2):int(w * 0.8)]
        if mouth_center.size == 0:
            return {
                "mar": settings.MAR_THRESHOLD - 0.10,
                "is_yawning": False,
                "yawn_fatigue_score": 0.0
            }

        dark_pixels = np.sum(mouth_center < 60)
        total_pixels = mouth_center.size
        dark_ratio = dark_pixels / float(total_pixels)

        # Map dark ratio to MAR proxy [0.10, 0.70]
        mar = min(0.70, max(0.10, dark_ratio * 2.1))

        # MAR comparison against threshold (MAR > settings.MAR_THRESHOLD e.g. 0.50)
        is_yawning = mar > settings.MAR_THRESHOLD

        if mar > (settings.MAR_THRESHOLD + 0.10):
            yawn_score = 100.0
        elif mar > settings.MAR_THRESHOLD:
            diff = mar - settings.MAR_THRESHOLD
            yawn_score = 50.0 + (diff / 0.10) * 50.0
        elif mar > (settings.MAR_THRESHOLD - 0.10):
            diff = mar - (settings.MAR_THRESHOLD - 0.10)
            yawn_score = (diff / 0.10) * 50.0
        else:
            yawn_score = 0.0

        return {
            "mar": round(mar, 3),
            "is_yawning": is_yawning,
            "yawn_fatigue_score": round(yawn_score, 1)
        }

yawn_analyzer = YawnAnalyzer()
