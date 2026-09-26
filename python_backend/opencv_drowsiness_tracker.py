"""
Drive Safe — Python OpenCV + MediaPipe Real-Time Drowsiness Detection Engine

Requires:
    pip install opencv-python mediapipe numpy
"""

import math
import time

try:
    import cv2
    import numpy as np
    import mediapipe as mp
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


# Landmark Indices for Eyes & Mouth
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH = [13, 14, 78, 308]

def distance(p1, p2):
    return math.hypot(p1.x - p2.x, p1.y - p2.y)

def calculate_ear(landmarks, eye_indices):
    p1 = landmarks[eye_indices[0]]
    p2 = landmarks[eye_indices[1]]
    p3 = landmarks[eye_indices[2]]
    p4 = landmarks[eye_indices[3]]
    p5 = landmarks[eye_indices[4]]
    p6 = landmarks[eye_indices[5]]

    v1 = distance(p2, p6)
    v2 = distance(p3, p5)
    h = distance(p1, p4)
    if h == 0:
        return 0.35
    return (v1 + v2) / (2.0 * h)

def calculate_mar(landmarks, mouth_indices):
    p_top = landmarks[mouth_indices[0]]
    p_bot = landmarks[mouth_indices[1]]
    p_left = landmarks[mouth_indices[2]]
    p_right = landmarks[mouth_indices[3]]

    vert = distance(p_top, p_bot)
    horiz = distance(p_left, p_right)
    if horiz == 0:
        return 0.15
    return vert / horiz

def run_opencv_tracker():
    if not OPENCV_AVAILABLE:
        print("OpenCV or MediaPipe package is not available. Please install dependencies.")
        return

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open video device.")
        return

    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5, min_tracking_confidence=0.5)

    print("Drive Safe OpenCV Tracker Running... Press 'q' to exit.")

    blink_count = 0
    yawn_count = 0
    eye_closed = False

    while cap.isOpened():
        success, image = cap.read()
        if not success:
            break

        image = cv2.flip(image, 1)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_image)

        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                landmarks = face_landmarks.landmark
                left_ear = calculate_ear(landmarks, LEFT_EYE)
                right_ear = calculate_ear(landmarks, RIGHT_EYE)
                avg_ear = (left_ear + right_ear) / 2.0
                mar = calculate_mar(landmarks, MOUTH)

                if avg_ear < 0.20:
                    if not eye_closed:
                        eye_closed = True
                        blink_count += 1
                    cv2.putText(image, "DROWSINESS ALERT!", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)
                else:
                    eye_closed = False

                if mar > 0.55:
                    cv2.putText(image, "YAWNING DETECTED", (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)

                cv2.putText(image, f"EAR: {avg_ear:.2f}", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(image, f"Blinks: {blink_count}", (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        cv2.imshow('Drive Safe OpenCV Real Feed', image)
        if (cv2.waitKey(5) & 0xFF) == ord('q'):
            break

    face_mesh.close()
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_opencv_tracker()

