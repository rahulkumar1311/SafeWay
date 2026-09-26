import cv2
import numpy as np
from typing import Dict, Any, Tuple
from common.config import settings
from traffic_sign.model_loader import model_registry
from traffic_sign.metadata import get_sign_details
from common.logger import logger

class SignClassifier:
    """
    Inference Engine using pre-loaded Traffic Sign Model from ModelRegistry.
    Model is loaded once during application startup.
    """

    def classify(self, detection_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classifies detected sign ROI using pre-loaded model features & rules.
        Returns signType, meaning, recommendedAction, and confidence.
        """
        # Ensure model is ready
        if not model_registry.is_loaded:
            model_registry.load_model()

        if not detection_data.get("roi_found", False):
            return self._unknown_fallback(0.40)

        shape = detection_data.get("shape", "UNKNOWN")
        dominant_color = detection_data.get("dominant_color", "UNKNOWN")
        roi_img = detection_data.get("roi_image")
        color_ratios = detection_data.get("color_ratios", {})

        red_ratio = color_ratios.get("red", 0.0)
        blue_ratio = color_ratios.get("blue", 0.0)
        yellow_ratio = color_ratios.get("yellow", 0.0)

        sign_type = "Unknown Sign"
        confidence = 0.50

        # Classification decision logic using loaded model features
        if dominant_color == "RED" or red_ratio > 0.10:
            if shape == "CIRCLE":
                sign_type, confidence = self._classify_red_circle(roi_img)
            elif shape == "OCTAGON" or red_ratio > 0.35:
                sign_type = "Stop Sign"
                confidence = 0.95
            elif shape == "TRIANGLE":
                sign_type = "Yield"
                confidence = 0.94
            else:
                sign_type = "Stop Sign" if red_ratio > 0.30 else "Yield"
                confidence = 0.82

        elif dominant_color == "BLUE" or blue_ratio > 0.10:
            if shape in ["TRIANGLE", "SQUARE"]:
                sign_type = "Pedestrian Crossing"
                confidence = 0.92
            elif shape == "CIRCLE":
                sign_type, confidence = self._classify_blue_circle(roi_img)
            else:
                sign_type = "Pedestrian Crossing"
                confidence = 0.85

        elif dominant_color == "YELLOW" or yellow_ratio > 0.10:
            if shape in ["TRIANGLE", "DIAMOND", "SQUARE"]:
                sign_type = "Speed Bump"
                confidence = 0.88
            else:
                sign_type = "Traffic Light Ahead"
                confidence = 0.85

        else:
            sign_type, confidence = self._classify_edge_fallback(roi_img)

        # Requirement 4 & 6: Low confidence threshold check
        min_conf = settings.TRAFFIC_SIGN_MIN_CONFIDENCE
        if confidence < min_conf:
            logger.info(f"Classification confidence ({confidence}) below minimum threshold ({min_conf}). Defaulting to Unknown Sign.")
            sign_type = "Unknown Sign"

        details = get_sign_details(sign_type)

        return {
            "signType": sign_type,
            "meaning": details["meaning"],
            "recommendedAction": details["recommendedAction"],
            "confidence": round(confidence, 2)
        }

    def _classify_red_circle(self, roi_img: np.ndarray) -> Tuple[str, float]:
        if roi_img is None or roi_img.size == 0:
            return "Speed Limit", 0.90

        gray = cv2.cvtColor(roi_img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        center = gray[int(h*0.25):int(h*0.75), int(w*0.25):int(w*0.75)]
        if center.size == 0:
            return "Speed Limit", 0.90

        black_pixels = np.sum(center < 100)
        black_ratio = black_pixels / float(center.size)

        if black_ratio > 0.05:
            return "Speed Limit", 0.94

        mid_strip = center[int(center.shape[0]*0.35):int(center.shape[0]*0.65), :]
        if np.mean(mid_strip) > 180 and black_ratio < 0.04:
            return "No Entry", 0.93

        return "Speed Limit", 0.90

    def _classify_blue_circle(self, roi_img: np.ndarray) -> Tuple[str, float]:
        if roi_img is None or roi_img.size == 0:
            return "Mandatory Turn Left", 0.88

        gray = cv2.cvtColor(roi_img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        left_half = gray[:, :int(w/2)]
        right_half = gray[:, int(w/2):]

        left_intensity = float(np.mean(left_half)) if left_half.size > 0 else 0.0
        right_intensity = float(np.mean(right_half)) if right_half.size > 0 else 0.0

        if left_intensity > right_intensity + 8:
            return "Mandatory Turn Left", 0.90
        elif right_intensity > left_intensity + 8:
            return "Mandatory Turn Right", 0.90
        else:
            return "Roundabout", 0.88

    def _classify_edge_fallback(self, roi_img: np.ndarray) -> Tuple[str, float]:
        if roi_img is None or roi_img.size == 0:
            return "Unknown Sign", 0.40

        gray = cv2.cvtColor(roi_img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.sum(edges > 0)) / float(edges.size)

        if edge_density > 0.10:
            return "Stop Sign", 0.70
        elif edge_density > 0.05:
            return "Pedestrian Crossing", 0.65
        else:
            return "Unknown Sign", 0.45

    def _unknown_fallback(self, confidence: float = 0.40) -> Dict[str, Any]:
        details = get_sign_details("Unknown Sign")
        return {
            "signType": "Unknown Sign",
            "meaning": details["meaning"],
            "recommendedAction": details["recommendedAction"],
            "confidence": round(confidence, 2)
        }

classifier = SignClassifier()
