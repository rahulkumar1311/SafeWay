import time
from enum import Enum
from typing import Dict, Any, Optional
from common.config import settings
from common.logger import logger

class AlertState(str, Enum):
    NORMAL = "ATTENTIVE"
    ATTENTIVE = "ATTENTIVE"
    FACE_NOT_DETECTED = "FACE_NOT_DETECTED"
    EYES_CLOSING = "EYES_CLOSING"
    EYE_CLOSURE_WARNING = "WARNING"
    WARNING = "WARNING"
    DROWSY = "DROWSY"
    ALERT = "ALERT"
    RECOVERED = "RECOVERED"
    ERROR = "ERROR"

class SessionStateMachine:
    """
    State machine for a single driver session tracking continuous eye states:
    FACE_NOT_DETECTED ➔ ATTENTIVE ➔ WARNING / EYES_CLOSING ➔ DROWSY ➔ ALERT ➔ RECOVERED
    Prevents alert spamming via cooldown timer.
    """
    def __init__(self, session_id: str):
        self.session_id: str = session_id
        self.current_state: AlertState = AlertState.ATTENTIVE
        self.consecutive_high_frames: int = 0
        self.consecutive_low_frames: int = 0
        self.last_alert_time: float = 0.0
        self.had_alert: bool = False
        self.last_alert_event: Optional[str] = None

    def process_frame(
        self,
        drowsiness_score: int,
        is_drowsy_instant: bool,
        consecutive_closed_frames: int,
        consecutive_yawn_frames: int,
        face_detected: bool = True
    ) -> AlertState:
        """
        Evaluates frame metrics against state transition rules & cooldown to determine new state.
        """
        now = time.time()
        time_since_last_alert = now - self.last_alert_time
        self.last_alert_event = None

        if not face_detected:
            self.current_state = AlertState.FACE_NOT_DETECTED
            self.consecutive_high_frames = 0
            self.consecutive_low_frames = 0
            return self.current_state

        # ALERT Cooldown window protection
        if self.current_state == AlertState.ALERT:
            if time_since_last_alert < settings.ALERT_COOLDOWN_SECONDS:
                return AlertState.ALERT
            if drowsiness_score < settings.STATE_DROWSY_THRESHOLD and consecutive_closed_frames == 0:
                self.consecutive_low_frames += 1
                if self.consecutive_low_frames >= 2:
                    self.current_state = AlertState.RECOVERED
                    self.consecutive_low_frames = 0
                return self.current_state

        # Evaluation based on score and consecutive closed frames
        if drowsiness_score >= settings.STATE_ALERT_THRESHOLD or consecutive_closed_frames >= settings.CONSECUTIVE_ALERT_FRAMES:
            self.consecutive_high_frames += 1
            if self.current_state == AlertState.DROWSY and self.consecutive_high_frames >= settings.CONSECUTIVE_ALERT_FRAMES:
                self.current_state = AlertState.ALERT
                self.last_alert_event = "PROLONGED_EYE_CLOSURE_ALERT"
                self.last_alert_time = now
                self.had_alert = True
                self.consecutive_high_frames = 0
            elif self.current_state == AlertState.WARNING and self.consecutive_high_frames >= settings.CONSECUTIVE_DROWSY_FRAMES:
                self.current_state = AlertState.DROWSY
                self.last_alert_event = "PROLONGED_EYE_CLOSURE_ALERT"
                self.consecutive_high_frames = 0
            elif self.current_state == AlertState.DROWSY:
                self.current_state = AlertState.DROWSY
            else:
                self.current_state = AlertState.WARNING

        elif drowsiness_score >= settings.STATE_DROWSY_THRESHOLD or consecutive_closed_frames >= settings.CONSECUTIVE_CLOSED_FRAMES_ALERT:
            if self.current_state == AlertState.DROWSY:
                self.current_state = AlertState.DROWSY
            else:
                self.consecutive_high_frames += 1
                if self.consecutive_high_frames >= settings.CONSECUTIVE_WARNING_FRAMES:
                    self.current_state = AlertState.DROWSY
                    self.last_alert_event = "EYE_CLOSURE_WARNING"
                    self.consecutive_high_frames = 0
                else:
                    self.current_state = AlertState.WARNING

        elif drowsiness_score >= settings.STATE_WARNING_THRESHOLD or consecutive_closed_frames > 0 or consecutive_yawn_frames >= 2:
            if self.current_state == AlertState.DROWSY:
                self.current_state = AlertState.DROWSY
            else:
                self.current_state = AlertState.WARNING
                self.consecutive_high_frames = 0

        else:
            if consecutive_closed_frames == 0:
                self.consecutive_high_frames = 0
                self.current_state = AlertState.ATTENTIVE

        logger.info(f"[Alert] Session '{self.session_id}' state: {self.current_state} | Score: {drowsiness_score} | Closed frames: {consecutive_closed_frames}")
        return self.current_state


class DrowsinessAlertSystem:
    """
    Manager for per-session Drowsiness State Machines.
    """
    def __init__(self):
        self.session_machines: Dict[str, SessionStateMachine] = {}

    def get_or_create_machine(self, session_id: str) -> SessionStateMachine:
        if session_id not in self.session_machines:
            self.session_machines[session_id] = SessionStateMachine(session_id)
        return self.session_machines[session_id]

    def evaluate_state(
        self,
        session_id: str,
        drowsiness_score: int,
        is_drowsy_instant: bool,
        consecutive_closed_frames: int,
        consecutive_yawn_frames: int,
        face_detected: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluates state transition for a session and returns state dict ("state", "alertEvent").
        """
        machine = self.get_or_create_machine(session_id)
        state_enum = machine.process_frame(
            drowsiness_score=drowsiness_score,
            is_drowsy_instant=is_drowsy_instant,
            consecutive_closed_frames=consecutive_closed_frames,
            consecutive_yawn_frames=consecutive_yawn_frames,
            face_detected=face_detected
        )
        return {
            "state": state_enum.value,
            "alertEvent": machine.last_alert_event
        }

alert_system = DrowsinessAlertSystem()


