import time
from typing import Dict, Any, List, Optional
from common.config import settings
from common.logger import logger

class SessionState:
    """
    Holds temporal frame state per driver session with wall-clock timestamp tracking.
    """
    def __init__(self, session_id: str):
        self.session_id: str = session_id
        self.consecutive_closed_frames: int = 0
        self.consecutive_yawn_frames: int = 0
        self.closed_since_timestamp: Optional[float] = None
        self.open_grace_frames: int = 0
        self.no_face_grace_frames: int = 0
        self.last_score: float = 0.0
        self.smoothed_score: float = 0.0
        self.frame_count: int = 0
        self.last_updated: float = time.time()

class TemporalTracker:
    """
    Tracks continuous eye-closure duration (ms) and drowsiness state across time for session IDs.
    """
    def __init__(self):
        self.sessions: Dict[str, SessionState] = {}

    def get_or_create_session(self, session_id: str) -> SessionState:
        now = time.time()
        self._cleanup_inactive_sessions(now)

        if session_id not in self.sessions:
            self.sessions[session_id] = SessionState(session_id)
        
        state = self.sessions[session_id]
        state.last_updated = now
        return state

    def update_state(
        self,
        session_id: str,
        is_closed: bool,
        is_yawning: bool,
        instantaneous_score: float,
        face_detected: bool = True
    ) -> Dict[str, Any]:
        """
        Updates consecutive frame counts and computes wall-clock timestamp eyeClosureDurationMs.
        """
        now = time.time()
        state = self.get_or_create_session(session_id)
        state.frame_count += 1

        if not face_detected:
            state.no_face_grace_frames += 1
            # Allow 2 frames of face loss before resetting closed eye timer
            if state.no_face_grace_frames > 2:
                state.consecutive_closed_frames = 0
                state.closed_since_timestamp = None
                state.open_grace_frames = 0
        else:
            state.no_face_grace_frames = 0
            if is_closed:
                state.consecutive_closed_frames += 1
                state.open_grace_frames = 0
                if state.closed_since_timestamp is None:
                    state.closed_since_timestamp = now
            else:
                state.open_grace_frames += 1
                state.consecutive_closed_frames = 0
                state.closed_since_timestamp = None

        eye_closure_duration_ms = 0
        if state.closed_since_timestamp is not None:
            eye_closure_duration_ms = int((now - state.closed_since_timestamp) * 1000)

        # Track consecutive yawn frames
        if face_detected and is_yawning:
            state.consecutive_yawn_frames += 1
        elif face_detected:
            state.consecutive_yawn_frames = 0

        # Compute Exponential Moving Average (EMA) for temporal smoothing
        alpha = settings.TEMPORAL_ALPHA
        if state.frame_count == 1:
            state.smoothed_score = instantaneous_score
        else:
            state.smoothed_score = (alpha * instantaneous_score) + ((1.0 - alpha) * state.smoothed_score)

        state.last_score = state.smoothed_score

        # Temporal bonus score for sustained eye closure (micro-sleep prevention)
        temporal_closure_bonus = 0.0
        if eye_closure_duration_ms >= 3000 or state.consecutive_closed_frames >= settings.CONSECUTIVE_CLOSED_FRAMES_ALERT:
            closure_mult = max(1, state.consecutive_closed_frames - settings.CONSECUTIVE_CLOSED_FRAMES_ALERT + 1)
            temporal_closure_bonus = min(50.0, max(25.0, closure_mult * 15.0))
        elif eye_closure_duration_ms >= 1500:
            temporal_closure_bonus = 25.0

        # Temporal bonus for repeated yawning
        temporal_yawn_bonus = 0.0
        if state.consecutive_yawn_frames >= 2:
            temporal_yawn_bonus = min(25.0, state.consecutive_yawn_frames * 10.0)

        accumulated_score = min(100.0, state.smoothed_score + temporal_closure_bonus + temporal_yawn_bonus)

        return {
            "consecutive_closed_frames": state.consecutive_closed_frames,
            "consecutive_yawn_frames": state.consecutive_yawn_frames,
            "eye_closure_duration_ms": eye_closure_duration_ms,
            "smoothed_score": round(accumulated_score, 1),
            "temporal_bonus": temporal_closure_bonus + temporal_yawn_bonus
        }

    def _cleanup_inactive_sessions(self, current_time: float):
        max_inactive = settings.MAX_SESSION_INACTIVE_SECONDS
        stale_ids = [
            sid for sid, state in self.sessions.items()
            if (current_time - state.last_updated) > max_inactive
        ]
        for sid in stale_ids:
            del self.sessions[sid]

temporal_tracker = TemporalTracker()
