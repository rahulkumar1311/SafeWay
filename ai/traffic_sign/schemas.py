from pydantic import BaseModel, Field
from typing import Optional

class TrafficSignRequest(BaseModel):
    imageData: str = Field(
        ...,
        description="Base64 encoded image string"
    )

class TrafficSignResponse(BaseModel):
    signType: str = Field(
        ...,
        description="Detected traffic sign category"
    )
    meaning: str = Field(
        ...,
        description="Sign description and audio alert"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score (0.0 to 1.0)"
    )
    recommendedAction: Optional[str] = Field(
        default=None,
        description="Recommended driver action for the recognized traffic sign"
    )
    voiceAlertText: Optional[str] = Field(
        default=None,
        description="Driver-friendly spoken text for audio alert synthesis"
    )
