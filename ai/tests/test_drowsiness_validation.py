import base64
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def create_synthetic_image_b64(color=(128, 128, 128), width=100, height=100) -> str:
    img = np.full((height, width, 3), color, dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', img)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

def test_drowsiness_valid_request():
    img_b64 = create_synthetic_image_b64()
    payload = {
        "sessionId": "session_valid_123",
        "frameData": img_b64
    }
    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "drowsinessScore" in data
    assert 0 <= data["drowsinessScore"] <= 100
    assert "isDrowsy" in data
    assert isinstance(data["isDrowsy"], bool)
    assert "confidence" in data
    assert 0.0 <= data["confidence"] <= 1.0

def test_drowsiness_missing_frame_data():
    payload = {"sessionId": "session_123"}
    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 422

def test_drowsiness_invalid_base64_string():
    payload = {
        "sessionId": "session_123",
        "frameData": "not_a_valid_base64_string!!!"
    }
    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 400
    assert "Invalid image payload" in response.json()["detail"]

def test_drowsiness_empty_frame_data():
    payload = {
        "sessionId": "session_123",
        "frameData": "   "
    }
    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 400
    assert "Invalid image payload" in response.json()["detail"]
