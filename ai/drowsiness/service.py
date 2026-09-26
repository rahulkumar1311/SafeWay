from typing import Dict, Any
from common.image_decoder import decode_base64_image
from common.logger import logger
from drowsiness.face_detector import face_detector
from drowsiness.eye_analyzer import eye_analyzer
from drowsiness.yawn_analyzer import yawn_analyzer
from drowsiness.temporal_tracker import temporal_tracker
from drowsiness.scoring import drowsiness_scorer
from drowsiness.state_machine import alert_system

class DrowsinessService:
    """
    Coordinates real-time Computer Vision Landmark Detection, Temporal Tracking, and State Machine Alerts.
    """
    def analyze_frame(self, session_id: str, frame_data: str) -> Dict[str, Any]:
        """
        Processes frame data, evaluates landmark score, and steps the alert state machine.
        Does NOT store images on disk.
        """
        logger.info(f"[Python AI] Processing drowsiness frame for session: '{session_id}'")

        # 1. Image decoding
        image = decode_base64_image(frame_data)

        # 2. Face detection & primary face selection
        detection_res = face_detector.detect_primary_face(image)
        face_detected = detection_res.get("face_detected", False)

        # 3. Eye landmark & 6-point EAR analysis
        eye_res = eye_analyzer.analyze(detection_res)

        # 4. Yawn analysis
        yawn_res = yawn_analyzer.analyze(detection_res)

        # 5. Instantaneous score for temporal tracking
        inst_score = (eye_res["eye_fatigue_score"] * 0.65) + (yawn_res["yawn_fatigue_score"] * 0.35) if face_detected else 0.0

        # 6. Temporal state tracking across frames
        temporal_res = temporal_tracker.update_state(
            session_id=session_id,
            is_closed=eye_res["is_closed"] if face_detected else False,
            is_yawning=yawn_res["is_yawning"] if face_detected else False,
            instantaneous_score=inst_score,
            face_detected=face_detected
        )

        # 7. Computer Vision Score & Confidence computation
        result = drowsiness_scorer.compute(
            detection_result=detection_res,
            eye_result=eye_res,
            yawn_result=yawn_res,
            temporal_result=temporal_res
        )

        # 8. State Machine Alert Transition & Cooldown Evaluation
        state_eval = alert_system.evaluate_state(
            session_id=session_id,
            drowsiness_score=result["drowsinessScore"] if face_detected else 0,
            is_drowsy_instant=result["isDrowsy"] if face_detected else False,
            consecutive_closed_frames=temporal_res["consecutive_closed_frames"] if face_detected else 0,
            consecutive_yawn_frames=temporal_res["consecutive_yawn_frames"] if face_detected else 0,
            face_detected=face_detected
        )

        closure_duration_ms = temporal_res.get("eye_closure_duration_ms", 0) if face_detected else 0

        # Enforce >= 3.0 seconds (3000ms) continuous eye closure => DROWSY / HIGH RISK / ALERT
        if face_detected and closure_duration_ms >= 3000:
            score = max(85, result.get("drowsinessScore", 0))
            risk_level = "HIGH"
            final_alert_state = "DROWSY"
            alert_event = "PROLONGED_EYE_CLOSURE_ALERT"
            is_drowsy = True
            alert_active = True
        elif face_detected:
            score = result.get("drowsinessScore", 0)
            risk_level = "HIGH" if score >= 70 else ("MEDIUM" if score >= 35 else "LOW")
            final_alert_state = state_eval["state"]
            alert_event = state_eval["alertEvent"]
            is_drowsy = (score >= 70 or final_alert_state in ("DROWSY", "ALERT"))
            alert_active = (final_alert_state in ("DROWSY", "ALERT"))
        else:
            score = 0
            risk_level = "LOW"
            final_alert_state = "FACE_NOT_DETECTED"
            alert_event = None
            is_drowsy = False
            alert_active = False

        result["drowsinessScore"] = score
        result["alertState"] = final_alert_state
        result["alertEvent"] = alert_event
        result["faceDetected"] = face_detected
        result["eyesDetected"] = (len(detection_res.get("eyes", [])) > 0 or ("left_eye_landmarks" in detection_res)) if face_detected else False
        result["leftEAR"] = eye_res.get("left_ear", None) if face_detected else None
        result["rightEAR"] = eye_res.get("right_ear", None) if face_detected else None
        result["ear"] = eye_res.get("ear", None) if face_detected else None
        result["eyeState"] = eye_res.get("eye_state", "UNKNOWN") if face_detected else "UNKNOWN"
        result["eyeClosureDurationMs"] = closure_duration_ms
        result["riskLevel"] = risk_level
        result["isDrowsy"] = is_drowsy
        result["alert"] = alert_active

        logger.info(
            f"[Python AI] Frame result for session '{session_id}' | Face: {face_detected} | "
            f"Score: {score} | EAR: {result['ear']} | eyeState: {result['eyeState']} | "
            f"Duration: {closure_duration_ms}ms | State: {result['alertState']}"
        )

        return result

drowsiness_service = DrowsinessService()

