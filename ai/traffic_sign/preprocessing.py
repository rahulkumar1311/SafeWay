import cv2
import numpy as np
from typing import Dict, Any
from common.logger import logger

class ImagePreprocessor:
    """
    Traffic Sign Preprocessing Module: CLAHE contrast enhancement, Gaussian blur, HSV color space segmentation.
    """
    def preprocess(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Preprocesses BGR image and extracts HSV color segmentation masks.
        """
        if image is None or image.size == 0:
            return {"valid": False}

        # 1. Standardize resolution (128x128)
        resized = cv2.resize(image, (128, 128), interpolation=cv2.INTER_AREA)

        # 2. Convert to LAB color space for luminance CLAHE contrast enhancement
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        enhanced_lab = cv2.merge((cl, a, b))
        enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

        # 3. Gaussian Blur noise filtering
        blurred = cv2.GaussianBlur(enhanced_bgr, (5, 5), 0)

        # 4. HSV color space transformation
        hsv = cv2.cvtColor(blurred, cv2.COLOR_BGR2HSV)

        # 5. Extract Color Masks
        # Red Mask (wrap-around HSV hue 0-10 & 170-180)
        lower_red1 = np.array([0, 70, 50])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50])
        upper_red2 = np.array([180, 255, 255])
        mask_red = cv2.bitwise_or(
            cv2.inRange(hsv, lower_red1, upper_red1),
            cv2.inRange(hsv, lower_red2, upper_red2)
        )

        # Blue Mask
        lower_blue = np.array([100, 70, 50])
        upper_blue = np.array([140, 255, 255])
        mask_blue = cv2.inRange(hsv, lower_blue, upper_blue)

        # Yellow Mask
        lower_yellow = np.array([15, 70, 50])
        upper_yellow = np.array([35, 255, 255])
        mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)

        return {
            "valid": True,
            "original_bgr": resized,
            "enhanced_bgr": enhanced_bgr,
            "hsv": hsv,
            "mask_red": mask_red,
            "mask_blue": mask_blue,
            "mask_yellow": mask_yellow
        }

preprocessor = ImagePreprocessor()
