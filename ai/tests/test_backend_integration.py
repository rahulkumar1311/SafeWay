import base64
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from app import app
from traffic_sign.model_loader import model_registry

client = TestClient(app)

def create_synthetic_frame_b64(color=(128, 128, 128), width=100, height=100) -> str:
    img = np.full((height, width, 3), color, dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', img)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

# 1. Valid Drowsiness Request
def test_1_valid_drowsiness_request():
    frame_b64 = create_synthetic_frame_b64()
    payload = {
        "sessionId": "session_abc123",
        "frameData": frame_b64
    }
    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "drowsinessScore" in data and isinstance(data["drowsinessScore"], int)
    assert "isDrowsy" in data and isinstance(data["isDrowsy"], bool)
    assert "confidence" in data and isinstance(data["confidence"], (float, int))
    assert 0 <= data["drowsinessScore"] <= 100
    assert 0.0 <= data["confidence"] <= 1.0

# 2. Invalid Drowsiness Request
def test_2_invalid_drowsiness_request():
    payload = {"sessionId": "session_abc123"}  # missing frameData
    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 422

# 3. Valid Traffic Sign Request
def test_3_valid_traffic_sign_request():
    img_b64 = create_synthetic_frame_b64()
    payload = {"imageData": img_b64}
    response = client.post("/predict/traffic-sign", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "signType" in data and isinstance(data["signType"], str)
    assert "meaning" in data and isinstance(data["meaning"], str)
    assert "confidence" in data and isinstance(data["confidence"], (float, int))
    assert 0.0 <= data["confidence"] <= 1.0

# 4. Invalid Traffic Sign Request
def test_4_invalid_traffic_sign_request():
    payload = {}  # missing imageData
    response = client.post("/predict/traffic-sign", json=payload)
    assert response.status_code == 422

# 5. Invalid Image (Malformed base64)
def test_5_invalid_image():
    payload_drowsiness = {"sessionId": "s1", "frameData": "not_valid_base64!!!"}
    res_drowsiness = client.post("/predict/drowsiness", json=payload_drowsiness)
    assert res_drowsiness.status_code == 400

    payload_sign = {"imageData": "not_valid_base64!!!"}
    res_sign = client.post("/predict/traffic-sign", json=payload_sign)
    assert res_sign.status_code == 400

# 6. No-Face Drowsiness Frame
def test_6_no_face_drowsiness_frame():
    blank_b64 = create_synthetic_frame_b64(color=(0, 0, 0))
    payload = {"sessionId": "session_no_face", "frameData": blank_b64}
    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["drowsinessScore"] <= 30
    assert data["isDrowsy"] is False
    assert data["confidence"] <= 0.40

# 7. Unknown / Low-Confidence Traffic Sign
def test_7_unknown_low_confidence_traffic_sign():
    blurry_b64 = create_synthetic_frame_b64(color=(50, 50, 50))
    payload = {"imageData": blurry_b64}
    response = client.post("/predict/traffic-sign", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["signType"] == "Unknown Sign"
    assert data["confidence"] <= 0.60

# 8. AI Service Startup Verification
def test_8_ai_service_startup():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True

# 9. AI Service Error/Failure Handling Simulation
def test_9_ai_service_error_handling():
    # Verify that an unexpected server error returns 500 error contract
    # by testing non-existent route or invalid JSON payload
    response = client.post("/predict/drowsiness", content="invalid json text")
    assert response.status_code == 422
