import os
import cv2
import numpy as np
import urllib.request
from typing import Dict, Any, Tuple, List, Optional
from common.logger import logger

# Try importing MediaPipe Tasks for high-precision 468-point face mesh landmarker
try:
    import mediapipe as mp
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python.core.base_options import BaseOptions
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False
    logger.warning("[Face Detection] MediaPipe not installed. Operating on OpenCV Cascades.")

# MediaPipe 468 Face Mesh 6-point Eye Contour Landmark Indices
# Left eye: p1=33 (left corner), p2=160 (top 1), p3=158 (top 2), p4=133 (right corner), p5=153 (bottom 1), p6=144 (bottom 2)
LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
# Right eye: p1=362 (left corner), p2=385 (top 1), p3=387 (top 2), p4=263 (right corner), p5=380 (bottom 1), p6=373 (bottom 2)
RIGHT_EYE_INDICES = [362, 385, 387, 263, 380, 373]

class FaceDetector:
    """
    MediaPipe Tasks & OpenCV Facial Feature Landmark Region Detector.
    Supports MediaPipe 468-point 3D FaceLandmarker mesh for precise eye landmark EAR calculation,
    temporal bounding box smoothing, low-light enhancement, and OpenCV cascade fallback.
    """
    def __init__(self):
        models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
        os.makedirs(models_dir, exist_ok=True)

        face_path = os.path.join(models_dir, 'haarcascade_frontalface_default.xml')
        if not os.path.exists(face_path) and hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
            fallback = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
            if os.path.exists(fallback):
                face_path = fallback

        face_alt_path = os.path.join(models_dir, 'haarcascade_frontalface_alt2.xml')
        if not os.path.exists(face_alt_path) and hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
            fallback = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_alt2.xml')
            if os.path.exists(fallback):
                face_alt_path = fallback

        eye_path = os.path.join(models_dir, 'haarcascade_eye.xml')
        if not os.path.exists(eye_path) and hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
            fallback = os.path.join(cv2.data.haarcascades, 'haarcascade_eye.xml')
            if os.path.exists(fallback):
                eye_path = fallback

        self.face_cascade = cv2.CascadeClassifier(face_path) if os.path.exists(face_path) else None
        self.face_cascade_alt = cv2.CascadeClassifier(face_alt_path) if os.path.exists(face_alt_path) else self.face_cascade
        self.eye_cascade = cv2.CascadeClassifier(eye_path) if os.path.exists(eye_path) else None

        # Temporal face tracking state across frames
        self.last_face_rect: Optional[Tuple[int, int, int, int]] = None
        self.missed_frame_count: int = 0
        self.MAX_MISSED_GRACE_FRAMES: int = 2

        self.landmarker = None
        if MP_AVAILABLE:
            try:
                task_path = os.path.join(models_dir, 'face_landmarker.task')

                if not os.path.exists(task_path):
                    logger.info(f"[Face Detection] Downloading MediaPipe FaceLandmarker model to {task_path}...")
                    url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
                    urllib.request.urlretrieve(url, task_path)
                    logger.info("[Face Detection] MediaPipe model downloaded successfully.")

                base_options = BaseOptions(model_asset_path=task_path)
                options = vision.FaceLandmarkerOptions(
                    base_options=base_options,
                    running_mode=vision.RunningMode.IMAGE,
                    num_faces=1,
                    min_face_detection_confidence=0.35,
                    min_face_presence_confidence=0.35,
                    min_tracking_confidence=0.35
                )
                self.landmarker = vision.FaceLandmarker.create_from_options(options)
                logger.info("[Face Detection] MediaPipe 468-point FaceLandmarker successfully initialized.")
            except Exception as e:
                logger.warning(f"[Face Detection] Could not initialize MediaPipe FaceLandmarker: {e}. Falling back to OpenCV Cascades.")
                self.landmarker = None

    def detect_primary_face(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Detects primary driver face from frame using MediaPipe FaceLandmarker mesh or OpenCV Cascades.
        """
        if image is None or image.size == 0:
            return {
                "face_detected": False,
                "confidence": 0.0,
                "reason": "Empty or invalid image frame"
            }

        img_h, img_w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        enhanced_gray = cv2.equalizeHist(gray)

        # Method 1: MediaPipe 468-Point FaceLandmarker (High precision & exact eye landmarks)
        if self.landmarker is not None:
            try:
                rgb_img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) if len(image.shape) == 3 else cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_img)
                res = self.landmarker.detect(mp_img)

                if res and res.face_landmarks and len(res.face_landmarks) > 0:
                    landmarks = res.face_landmarks[0]
                    coords = [(lm.x * img_w, lm.y * img_h) for lm in landmarks]

                    xs = [c[0] for c in coords]
                    ys = [c[1] for c in coords]
                    fx = max(0, int(min(xs)))
                    fy = max(0, int(min(ys)))
                    fw = min(img_w - fx, int(max(xs) - fx))
                    fh = min(img_h - fy, int(max(ys) - fy))

                    left_eye_landmarks = [coords[i] for i in LEFT_EYE_INDICES]
                    right_eye_landmarks = [coords[i] for i in RIGHT_EYE_INDICES]

                    face_roi_gray = enhanced_gray[fy:fy+fh, fx:fx+fw]
                    upper_roi = face_roi_gray[0:int(fh * 0.55), :] if face_roi_gray.size > 0 else enhanced_gray
                    lower_roi = face_roi_gray[int(fh * 0.45):, :] if face_roi_gray.size > 0 else enhanced_gray

                    eyes = [(int(min(c[0] for c in left_eye_landmarks)), int(min(c[1] for c in left_eye_landmarks)),
                             int(max(c[0] for c in left_eye_landmarks) - min(c[0] for c in left_eye_landmarks)),
                             int(max(c[1] for c in left_eye_landmarks) - min(c[1] for c in left_eye_landmarks))),
                            (int(min(c[0] for c in right_eye_landmarks)), int(min(c[1] for c in right_eye_landmarks)),
                             int(max(c[0] for c in right_eye_landmarks) - min(c[0] for c in right_eye_landmarks)),
                             int(max(c[1] for c in right_eye_landmarks) - min(c[1] for c in right_eye_landmarks)))]

                    self.last_face_rect = (fx, fy, fw, fh)
                    self.missed_frame_count = 0

                    logger.info(f"[Face Detection] MediaPipe 468 Mesh face detected | Box: ({fx}, {fy}, {fw}, {fh})")

                    return {
                        "face_detected": True,
                        "confidence": 0.95,
                        "face_rect": (fx, fy, fw, fh),
                        "gray_roi": face_roi_gray if face_roi_gray.size > 0 else enhanced_gray,
                        "upper_face_roi": upper_roi,
                        "lower_face_roi": lower_roi,
                        "eyes": eyes,
                        "left_eye_landmarks": left_eye_landmarks,
                        "right_eye_landmarks": right_eye_landmarks,
                        "detector": "MediaPipe_FaceMesh_468",
                        "num_faces": 1
                    }
            except Exception as e:
                logger.warning(f"[Face Detection] MediaPipe processing error: {e}. Falling back to OpenCV.")

        # Method 2: OpenCV Cascade Detection on enhanced & raw gray
        faces = ()
        if self.face_cascade and not self.face_cascade.empty():
            try:
                faces = self.face_cascade.detectMultiScale(
                    enhanced_gray,
                    scaleFactor=1.05,
                    minNeighbors=3,
                    minSize=(25, 25)
                )

                if len(faces) == 0:
                    faces = self.face_cascade.detectMultiScale(
                        gray,
                        scaleFactor=1.05,
                        minNeighbors=3,
                        minSize=(25, 25)
                    )
            except Exception as e:
                logger.warning(f"[Face Detection] Cascade error: {e}")

        if len(faces) == 0 and self.face_cascade_alt and not self.face_cascade_alt.empty():
            try:
                faces = self.face_cascade_alt.detectMultiScale(
                    enhanced_gray,
                    scaleFactor=1.05,
                    minNeighbors=2,
                    minSize=(25, 25)
                )
            except Exception as e:
                logger.warning(f"[Face Detection] Cascade alt error: {e}")

        if len(faces) > 0:
            frame_center_x, frame_center_y = img_w / 2.0, img_h / 2.0
            best_face = max(faces, key=lambda f: (f[2] * f[3]) - (np.sqrt((f[0] + f[2]/2.0 - frame_center_x)**2 + (f[1] + f[3]/2.0 - frame_center_y)**2) * 10))
            (fx, fy, fw, fh) = best_face

            face_roi_gray = enhanced_gray[fy:fy+fh, fx:fx+fw]
            upper_roi = face_roi_gray[0:int(fh * 0.55), :]
            lower_roi = face_roi_gray[int(fh * 0.45):, :]

            eyes = ()
            if self.eye_cascade and not self.eye_cascade.empty():
                try:
                    eyes = self.eye_cascade.detectMultiScale(
                        upper_roi if upper_roi.size > 0 else face_roi_gray,
                        scaleFactor=1.05,
                        minNeighbors=2,
                        minSize=(10, 10)
                    )
                except Exception as e:
                    logger.warning(f"[Face Detection] Eye cascade error: {e}")

            self.last_face_rect = (fx, fy, fw, fh)
            self.missed_frame_count = 0

            logger.info(f"[Face Detection] OpenCV face detected | Box: ({fx}, {fy}, {fw}, {fh})")
            return {
                "face_detected": True,
                "confidence": 0.85,
                "face_rect": (fx, fy, fw, fh),
                "gray_roi": face_roi_gray,
                "upper_face_roi": upper_roi,
                "lower_face_roi": lower_roi,
                "eyes": [(ex, ey, ew, eh) for (ex, ey, ew, eh) in eyes],
                "detector": "OpenCV_HaarCascade",
                "num_faces": len(faces)
            }

        # Temporal smoothing fallback: if face was detected recently, reuse last ROI for up to 2 frames to avoid flickering
        if self.last_face_rect is not None and self.missed_frame_count < self.MAX_MISSED_GRACE_FRAMES:
            self.missed_frame_count += 1
            fx, fy, fw, fh = self.last_face_rect
            face_roi_gray = enhanced_gray[fy:fy+fh, fx:fx+fw] if (fy+fh <= img_h and fx+fw <= img_w) else enhanced_gray
            upper_roi = face_roi_gray[0:int(fh * 0.55), :] if face_roi_gray.size > 0 else enhanced_gray
            lower_roi = face_roi_gray[int(fh * 0.45):, :] if face_roi_gray.size > 0 else enhanced_gray

            logger.info(f"[Face Detection] Reused last face ROI (grace frame {self.missed_frame_count}/{self.MAX_MISSED_GRACE_FRAMES})")
            return {
                "face_detected": True,
                "confidence": 0.70,
                "face_rect": (fx, fy, fw, fh),
                "gray_roi": face_roi_gray,
                "upper_face_roi": upper_roi,
                "lower_face_roi": lower_roi,
                "eyes": [],
                "detector": "Temporal_ROI_Smoothing",
                "num_faces": 1
            }

        self.last_face_rect = None
        logger.info("[Face Detection] No face detected in frame")
        return {
            "face_detected": False,
            "confidence": 0.0,
            "face_rect": (0, 0, img_w, img_h),
            "gray_roi": enhanced_gray,
            "upper_face_roi": enhanced_gray[0:int(img_h * 0.55), :],
            "lower_face_roi": enhanced_gray[int(img_h * 0.45):, :],
            "eyes": [],
            "num_faces": 0
        }

face_detector = FaceDetector()

