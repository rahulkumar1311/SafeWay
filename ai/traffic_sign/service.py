from typing import Dict, Any
from common.image_decoder import decode_base64_image
from common.logger import logger
from traffic_sign.preprocessing import preprocessor
from traffic_sign.detection import detector
from traffic_sign.classification import classifier
from traffic_sign.voice_alert import voice_alert_system

class TrafficSignService:
    """
    Coordinates real-time Computer Vision Traffic Sign Recognition & Asynchronous Voice Alert Pipeline.
    """
    def process_image(self, image_data: str) -> Dict[str, Any]:
        """
        Processes traffic sign image data, classifies signType, meaning, action, and triggers voice alert.
        Raises ValueError if image_data is invalid base64 payload.
        """
        logger.info("Processing Traffic Sign Recognition request...")

        # 1. Decode base64 image (raises ValueError if malformed)
        image = decode_base64_image(image_data)

        # 2. Preprocess image (CLAHE, blur, HSV color space masks)
        preprocessed = preprocessor.preprocess(image)

        # 3. Detect sign contour ROI & geometry
        detection_data = detector.detect_roi(preprocessed)

        # 4. Classify traffic sign & evaluate confidence threshold
        result = classifier.classify(detection_data)

        sign_type = result.get("signType", "Unknown Sign")
        meaning = result.get("meaning", "")
        action = result.get("recommendedAction", "")

        # 5. Trigger Asynchronous Voice Alert (non-blocking, cooldown protected)
        voice_text = voice_alert_system.trigger_voice_alert(
            sign_type=sign_type,
            meaning=meaning,
            action=action
        )

        result["voiceAlertText"] = voice_text

        logger.info(
            f"Traffic Sign Recognition Result -> signType: '{sign_type}' | "
            f"meaning: '{meaning}' | confidence: {result['confidence']} | voiceAlert: \"{voice_text}\""
        )

        return result

traffic_sign_service = TrafficSignService()
