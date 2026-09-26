import base64
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def create_dummy_base64_image(color=(128, 128, 128), width=100, height=100) -> str:
    img = np.full((height, width, 3), color, dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', img)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_predict_drowsiness_valid_contract():
    frame_b64 = create_dummy_base64_image()
    payload = {
        "sessionId": "session_test_123",
        "frameData": frame_b64
    }

    response = client.post("/predict/drowsiness", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "drowsinessScore" in data
    assert isinstance(data["drowsinessScore"], int)
    assert 0 <= data["drowsinessScore"] <= 100

    assert "isDrowsy" in data
    assert isinstance(data["isDrowsy"], bool)

    assert "confidence" in data
    assert isinstance(data["confidence"], (float, int))
    assert 0.0 <= data["confidence"] <= 1.0
