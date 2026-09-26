import base64
import cv2
import numpy as np
from typing import Optional
from common.logger import logger

def decode_base64_image(base64_str: str) -> np.ndarray:
    """
    Safely validates and decodes a base64 encoded image payload into an OpenCV BGR numpy array.
    Raises ValueError if payload is missing, malformed, or cannot be decoded as an image.
    """
    if not base64_str or not isinstance(base64_str, str) or not base64_str.strip():
        logger.warning("Base64 string is empty or invalid type.")
        raise ValueError("frameData must be a non-empty base64 encoded string")

    # Strip header if present e.g. "data:image/jpeg;base64,"
    raw_b64 = base64_str.strip()
    if "," in raw_b64:
        raw_b64 = raw_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_b64, validate=True)
    except Exception as e:
        logger.error(f"Base64 decoding failed: {str(e)}")
        raise ValueError(f"Invalid base64 encoding: {str(e)}")

    if not image_bytes:
        raise ValueError("Decoded image buffer is empty")

    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        logger.error(f"OpenCV imdecode error: {str(e)}")
        raise ValueError("Failed to decode image buffer with OpenCV")

    if img is None or img.size == 0:
        logger.warning("Decoded image matrix is None or empty.")
        raise ValueError("Invalid image content or unsupported image format")

    return img
