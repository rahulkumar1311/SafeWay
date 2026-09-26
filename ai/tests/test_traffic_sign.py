import base64
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def create_synthetic_stop_sign_b64() -> str:
    img = np.zeros((128, 128, 3), dtype=np.uint8)
    pts = np.array([[38, 10], [90, 10], [118, 38], [118, 90], [90, 118], [38, 118], [10, 90], [10, 38]], np.int32)
    pts = pts.reshape((-1, 1, 2))
    cv2.fillPoly(img, [pts], (0, 0, 220)) # Red in BGR
    
    _, buffer = cv2.imencode('.jpg', img)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

def create_synthetic_speed_limit_b64() -> str:
    img = np.full((128, 128, 3), (240, 240, 240), dtype=np.uint8)
    cv2.circle(img, (64, 64), 55, (0, 0, 220), 12) # Red ring
    # Draw dark inner digits
    cv2.putText(img, "40", (35, 75), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (10, 10, 10), 3)
    
    _, buffer = cv2.imencode('.jpg', img)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

def test_predict_traffic_sign_valid_contract():
    img_b64 = create_synthetic_stop_sign_b64()
    payload = {"imageData": img_b64}

    response = client.post("/predict/traffic-sign", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "signType" in data
    assert isinstance(data["signType"], str)
    assert len(data["signType"]) > 0

    assert "meaning" in data
    assert isinstance(data["meaning"], str)
    assert len(data["meaning"]) > 0

    assert "confidence" in data
    assert isinstance(data["confidence"], (float, int))
    assert 0.0 <= data["confidence"] <= 1.0

def test_predict_traffic_sign_speed_limit():
    img_b64 = create_synthetic_speed_limit_b64()
    payload = {"imageData": img_b64}

    response = client.post("/predict/traffic-sign", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Speed Limit" in data["signType"]
    assert "speed limit" in data["meaning"].lower()

def test_predict_traffic_sign_invalid_base64():
    payload = {"imageData": "not_a_valid_base64_image!!!"}
    response = client.post("/predict/traffic-sign", json=payload)
    assert response.status_code == 400
    assert "Invalid image payload" in response.json()["detail"]

def test_predict_traffic_sign_missing_image_data():
    payload = {}
    response = client.post("/predict/traffic-sign", json=payload)
    assert response.status_code == 422
