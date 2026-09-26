from pydantic import BaseModel, Field
from typing import Optional

class DrowsinessRequest(BaseModel):
    sessionId: Optional[str] = Field(
        default="default_session",
        description="Camera session identifier"
    )
    frameData: str = Field(
        ...,
        description="Base64 encoded image frame"
    )

class DrowsinessResponse(BaseModel):
    drowsinessScore: int = Field(
        ...,
        ge=0,
        le=100,
        description="Drowsiness score between 0 and 100"
    )
    isDrowsy: bool = Field(
        ...,
        description="True if driver is detected as drowsy"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence level (0.0 to 1.0)"
    )
    alertState: str = Field(
        default="ATTENTIVE",
        description="Driver state: FACE_NOT_DETECTED, ATTENTIVE, EYE_CLOSURE_WARNING, DROWSY, RECOVERED, ERROR"
    )
    faceDetected: bool = Field(
        default=True,
        description="True if driver face detected in frame"
    )
    eyesDetected: bool = Field(
        default=True,
        description="True if driver eyes detected in face ROI"
    )
    leftEAR: Optional[float] = Field(
        default=None,
        description="Left Eye Aspect Ratio"
    )
    rightEAR: Optional[float] = Field(
        default=None,
        description="Right Eye Aspect Ratio"
    )
    ear: Optional[float] = Field(
        default=None,
        description="Average Eye Aspect Ratio"
    )
    eyeState: str = Field(
        default="OPEN",
        description="Eye state: OPEN, CLOSING, CLOSED, UNKNOWN"
    )
    eyeClosureDurationMs: int = Field(
        default=0,
        description="Duration of continuous eye closure in milliseconds"
    )
    riskLevel: str = Field(
        default="LOW",
        description="Risk level: LOW, MEDIUM, HIGH"
    )
    alert: bool = Field(
        default=False,
        description="True if drowsiness warning/alert is active"
    )
    alertEvent: Optional[str] = Field(
        default=None,
        description="Alert event name when threshold is crossed"
    )
