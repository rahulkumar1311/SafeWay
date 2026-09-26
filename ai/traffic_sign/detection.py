import cv2
import numpy as np
from typing import Dict, Any, Tuple
from common.logger import logger

class SignDetector:
    """
    Traffic Sign Region & Geometry Detector: Extracts prominent sign contour ROIs and shape signatures.
    """
    def detect_roi(self, preprocessed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detects sign ROI contour, classifies geometry shape, and crops sign ROI.
        """
        if not preprocessed_data.get("valid", False):
            return {"roi_found": False}

        img = preprocessed_data["enhanced_bgr"]
        mask_red = preprocessed_data["mask_red"]
        mask_blue = preprocessed_data["mask_blue"]
        mask_yellow = preprocessed_data["mask_yellow"]

        h, w = img.shape[:2]
        total_pixels = float(h * w)

        red_ratio = np.sum(mask_red > 0) / total_pixels
        blue_ratio = np.sum(mask_blue > 0) / total_pixels
        yellow_ratio = np.sum(mask_yellow > 0) / total_pixels

        # Combined color mask
        combined_mask = cv2.bitwise_or(cv2.bitwise_or(mask_red, mask_blue), mask_yellow)

        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            # Fallback to center frame ROI
            margin = int(h * 0.15)
            roi = img[margin:h-margin, margin:w-margin]
            return {
                "roi_found": False,
                "shape": "UNKNOWN",
                "roi_image": roi,
                "dominant_color": "UNKNOWN",
                "color_ratios": {"red": red_ratio, "blue": blue_ratio, "yellow": yellow_ratio}
            }

        largest_contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest_contour)

        if area < (total_pixels * 0.02):
            # Contour too small
            return {
                "roi_found": False,
                "shape": "UNKNOWN",
                "roi_image": img,
                "dominant_color": "UNKNOWN",
                "color_ratios": {"red": red_ratio, "blue": blue_ratio, "yellow": yellow_ratio}
            }

        # Crop contour bounding box
        x, y, cw, ch = cv2.boundingRect(largest_contour)
        roi_crop = img[y:y+ch, x:x+cw]

        # Geometry & Circularity analysis
        peri = cv2.arcLength(largest_contour, True)
        approx = cv2.approxPolyDP(largest_contour, 0.04 * peri, True)
        num_vertices = len(approx)

        circularity = (4 * np.pi * area) / (peri ** 2) if peri > 0 else 0.0

        shape = "UNKNOWN"
        if circularity > 0.75:
            shape = "CIRCLE"
        elif num_vertices == 3:
            shape = "TRIANGLE"
        elif num_vertices == 4:
            shape = "SQUARE"
        elif num_vertices == 8:
            shape = "OCTAGON"
        elif num_vertices > 4:
            shape = "CIRCLE"

        # Dominant color
        dominant_color = "RED" if red_ratio >= max(blue_ratio, yellow_ratio) else ("BLUE" if blue_ratio >= yellow_ratio else "YELLOW")

        return {
            "roi_found": True,
            "shape": shape,
            "num_vertices": num_vertices,
            "roi_image": roi_crop,
            "dominant_color": dominant_color,
            "color_ratios": {"red": red_ratio, "blue": blue_ratio, "yellow": yellow_ratio}
        }

detector = SignDetector()
