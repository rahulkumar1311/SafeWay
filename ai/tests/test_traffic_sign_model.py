import pytest
from traffic_sign.model_loader import model_registry
from traffic_sign.classification import classifier
from traffic_sign.metadata import get_sign_details

def test_model_registry_startup_loading():
    model_registry.load_model()
    assert model_registry.is_loaded is True
    assert len(model_registry.classes) > 0

def test_traffic_sign_classification_details():
    detection_data = {
        "roi_found": True,
        "shape": "OCTAGON",
        "dominant_color": "RED",
        "roi_image": None,
        "color_ratios": {"red": 0.40, "blue": 0.0, "yellow": 0.0}
    }

    result = classifier.classify(detection_data)
    assert result["signType"] == "Stop Sign"
    assert "Stop completely" in result["meaning"]
    assert "recommendedAction" in result
    assert "complete stop" in result["recommendedAction"].lower()
    assert result["confidence"] >= 0.90

def test_traffic_sign_low_confidence_threshold_fallback():
    detection_data = {
        "roi_found": True,
        "shape": "UNKNOWN",
        "dominant_color": "UNKNOWN",
        "roi_image": None,
        "color_ratios": {"red": 0.01, "blue": 0.01, "yellow": 0.01}
    }

    result = classifier.classify(detection_data)
    assert result["signType"] == "Unknown Sign"
    assert "recommendedAction" in result
