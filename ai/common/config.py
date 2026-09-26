import os

class Settings:
    """
    Service Configuration & Drowsiness / Traffic Sign / Voice Alert Thresholds
    """
    APP_NAME: str = "SafeWay-AI Service"
    VERSION: str = "1.0.0"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENV: str = os.getenv("ENV", "development")

    # Drowsiness Algorithm Configurable Thresholds
    EAR_THRESHOLD: float = float(os.getenv("EAR_THRESHOLD", "0.21"))
    MAR_THRESHOLD: float = float(os.getenv("MAR_THRESHOLD", "0.50"))
    DROWSINESS_SCORE_THRESHOLD: int = int(os.getenv("DROWSINESS_SCORE_THRESHOLD", "70"))
    CONSECUTIVE_CLOSED_FRAMES_ALERT: int = int(os.getenv("CONSECUTIVE_CLOSED_FRAMES_ALERT", "3"))
    TEMPORAL_ALPHA: float = float(os.getenv("TEMPORAL_ALPHA", "0.35"))
    MAX_SESSION_INACTIVE_SECONDS: int = int(os.getenv("MAX_SESSION_INACTIVE_SECONDS", "300"))

    # State Machine Thresholds (Part 4)
    STATE_WARNING_THRESHOLD: int = int(os.getenv("STATE_WARNING_THRESHOLD", "40"))
    STATE_DROWSY_THRESHOLD: int = int(os.getenv("STATE_DROWSY_THRESHOLD", "70"))
    STATE_ALERT_THRESHOLD: int = int(os.getenv("STATE_ALERT_THRESHOLD", "85"))
    CONSECUTIVE_WARNING_FRAMES: int = int(os.getenv("CONSECUTIVE_WARNING_FRAMES", "2"))
    CONSECUTIVE_DROWSY_FRAMES: int = int(os.getenv("CONSECUTIVE_DROWSY_FRAMES", "3"))
    CONSECUTIVE_ALERT_FRAMES: int = int(os.getenv("CONSECUTIVE_ALERT_FRAMES", "4"))
    ALERT_COOLDOWN_SECONDS: float = float(os.getenv("ALERT_COOLDOWN_SECONDS", "5.0"))

    # Traffic Sign Model Settings & Thresholds (Part 5 & Part 6)
    TRAFFIC_SIGN_MIN_CONFIDENCE: float = float(os.getenv("TRAFFIC_SIGN_MIN_CONFIDENCE", "0.60"))
    TRAFFIC_SIGN_MODEL_TYPE: str = os.getenv("TRAFFIC_SIGN_MODEL_TYPE", "gtsrb_cv_feature_model")
    TRAFFIC_SIGN_MODEL_PATH: str = os.getenv("TRAFFIC_SIGN_MODEL_PATH", "traffic_sign/models/gtsrb_model.pkl")

    # Voice Alert Settings (Part 7)
    ENABLE_VOICE_ALERTS: bool = os.getenv("ENABLE_VOICE_ALERTS", "true").lower() in ("true", "1", "yes")
    VOICE_ALERT_COOLDOWN_SECONDS: float = float(os.getenv("VOICE_ALERT_COOLDOWN_SECONDS", "10.0"))

settings = Settings()
