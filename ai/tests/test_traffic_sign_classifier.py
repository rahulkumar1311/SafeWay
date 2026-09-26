import numpy as np
import pytest
from traffic_sign.classification import classifier
from traffic_sign.metadata import get_sign_meaning
from common.config import settings

def test_metadata_mapping():
    meaning_stop = get_sign_meaning("Stop Sign")
    assert "Stop completely" in meaning_stop

    meaning_speed = get_sign_meaning("Speed Limit")
    assert "speed limit is 40 km/h" in meaning_speed.lower()

    meaning_unknown = get_sign_meaning("Random Unregistered Type")
    assert "low confidence" in meaning_unknown.lower()

def test_classifier_low_confidence_fallback():
    # Detection data with low confidence signal
    detection_data = {
        "roi_found": True,
        "shape": "UNKNOWN",
        "dominant_color": "UNKNOWN",
        "roi_image": np.zeros((30, 30, 3), dtype=np.uint8),
        "color_ratios": {"red": 0.01, "blue": 0.01, "yellow": 0.01}
    }

    result = classifier.classify(detection_data)
    assert result["signType"] == "Unknown Sign"
    assert "low confidence" in result["meaning"].lower()

def test_classifier_no_roi_found():
    detection_data = {"roi_found": False}
    result = classifier.classify(detection_data)
    assert result["signType"] == "Unknown Sign"
    assert result["confidence"] <= 0.50
