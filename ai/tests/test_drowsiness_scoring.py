import pytest
from common.config import settings
from drowsiness.scoring import DrowsinessScorer
from drowsiness.eye_analyzer import EyeAnalyzer
from drowsiness.yawn_analyzer import YawnAnalyzer
from drowsiness.temporal_tracker import TemporalTracker
from drowsiness.face_detector import FaceDetector

def test_eye_analyzer_ear_thresholding():
    analyzer = EyeAnalyzer()
    # Closed eyes ROI (low std dev / low contrast)
    closed_res = analyzer.analyze({
        "upper_face_roi": None,
        "eyes": [(10, 10, 30, 4)] # aspect ratio = 4/30 = 0.133 < 0.21
    })
    assert closed_res["is_closed"] is True
    assert closed_res["eye_fatigue_score"] > 50.0

    # Open eyes ROI
    open_res = analyzer.analyze({
        "upper_face_roi": None,
        "eyes": [(10, 10, 30, 12)] # aspect ratio = 12/30 = 0.40 > 0.21
    })
    assert open_res["is_closed"] is False
    assert open_res["eye_fatigue_score"] == 0.0

def test_yawn_analyzer_mar_thresholding():
    analyzer = YawnAnalyzer()
    res = analyzer.analyze({"lower_face_roi": None})
    assert "mar" in res
    assert "is_yawning" in res
    assert "yawn_fatigue_score" in res

def test_temporal_tracker_consecutive_closed_frames():
    tracker = TemporalTracker()
    session_id = "test_temporal_session"

    # Frame 1: closed
    t1 = tracker.update_state(session_id, is_closed=True, is_yawning=False, instantaneous_score=60.0)
    assert t1["consecutive_closed_frames"] == 1

    # Frame 2: closed
    t2 = tracker.update_state(session_id, is_closed=True, is_yawning=False, instantaneous_score=60.0)
    assert t2["consecutive_closed_frames"] == 2

    # Frame 3: closed (triggers temporal alert bonus)
    t3 = tracker.update_state(session_id, is_closed=True, is_yawning=False, instantaneous_score=60.0)
    assert t3["consecutive_closed_frames"] == 3
    assert t3["smoothed_score"] > t1["smoothed_score"]

    # Frame 4: open (resets consecutive counter)
    t4 = tracker.update_state(session_id, is_closed=False, is_yawning=False, instantaneous_score=0.0)
    assert t4["consecutive_closed_frames"] == 0

def test_drowsiness_scorer_combined_logic():
    scorer = DrowsinessScorer()
    detection_res = {"face_detected": True, "confidence": 0.95}
    eye_res = {"eye_fatigue_score": 80.0}
    yawn_res = {"yawn_fatigue_score": 50.0}
    temporal_res = {"smoothed_score": 75.0}

    result = scorer.compute(detection_res, eye_res, yawn_res, temporal_res)
    assert 0 <= result["drowsinessScore"] <= 100
    assert isinstance(result["isDrowsy"], bool)
    assert result["isDrowsy"] is True
    assert result["confidence"] >= 0.60
