from typing import Dict, Any
from common.config import settings
from common.logger import logger

class DrowsinessScorer:
    """
    Measurable Signal Drowsiness Scoring & Confidence Calculation Engine.
    """

    def compute(
        self,
        detection_result: Dict[str, Any],
        eye_result: Dict[str, Any],
        yawn_result: Dict[str, Any],
        temporal_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates final drowsiness score (0-100), evaluates isDrowsy threshold, and computes confidence.
        """
        face_detected = detection_result.get("face_detected", False)
        base_confidence = detection_result.get("confidence", 0.50)

        eye_score = eye_result.get("eye_fatigue_score", 0.0)
        yawn_score = yawn_result.get("yawn_fatigue_score", 0.0)
        smoothed_score = temporal_result.get("smoothed_score", 0.0)

        # Instantaneous combined score
        instantaneous_score = (eye_score * 0.65) + (yawn_score * 0.35)

        # Combine instantaneous & temporal smoothed score
        combined_score = (instantaneous_score * 0.40) + (smoothed_score * 0.60)

        if not face_detected:
            # If no face is detected, cap score and decrease confidence
            final_score = int(min(30.0, combined_score))
            confidence = round(min(0.40, base_confidence), 2)
        else:
            final_score = int(min(100, max(0, round(combined_score))))
            confidence = round(min(0.98, max(0.60, base_confidence)), 2)

        # Compare score against configurable threshold
        is_drowsy = final_score >= settings.DROWSINESS_SCORE_THRESHOLD

        return {
            "drowsinessScore": final_score,
            "isDrowsy": is_drowsy,
            "confidence": confidence
        }

drowsiness_scorer = DrowsinessScorer()
