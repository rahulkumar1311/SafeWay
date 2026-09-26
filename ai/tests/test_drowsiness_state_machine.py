import time
import pytest
from drowsiness.state_machine import SessionStateMachine, AlertState
from common.config import settings

def test_state_machine_initial_normal():
    sm = SessionStateMachine("test_session_1")
    assert sm.current_state == AlertState.NORMAL

def test_state_machine_transition_normal_to_warning():
    sm = SessionStateMachine("test_session_2")
    # Score 45 for 1 frame -> transitions to WARNING
    state = sm.process_frame(drowsiness_score=45, is_drowsy_instant=False, consecutive_closed_frames=0, consecutive_yawn_frames=0)
    assert state == AlertState.WARNING

def test_state_machine_transition_warning_to_drowsy():
    sm = SessionStateMachine("test_session_3")
    sm.current_state = AlertState.WARNING
    # Sustained high score for CONSECUTIVE_DROWSY_FRAMES
    for _ in range(settings.CONSECUTIVE_DROWSY_FRAMES):
        state = sm.process_frame(drowsiness_score=75, is_drowsy_instant=True, consecutive_closed_frames=3, consecutive_yawn_frames=0)
    
    assert state == AlertState.DROWSY

def test_state_machine_transition_drowsy_to_alert():
    sm = SessionStateMachine("test_session_4")
    sm.current_state = AlertState.DROWSY
    # Sustained high score for CONSECUTIVE_ALERT_FRAMES
    for _ in range(settings.CONSECUTIVE_ALERT_FRAMES):
        state = sm.process_frame(drowsiness_score=90, is_drowsy_instant=True, consecutive_closed_frames=5, consecutive_yawn_frames=0)
    
    assert state == AlertState.ALERT

def test_state_machine_cooldown_prevention():
    sm = SessionStateMachine("test_session_5")
    sm.current_state = AlertState.ALERT
    sm.last_alert_time = time.time()  # set alert time to NOW

    # Frame with low score during cooldown window
    state = sm.process_frame(drowsiness_score=10, is_drowsy_instant=False, consecutive_closed_frames=0, consecutive_yawn_frames=0)
    # Should maintain ALERT state due to cooldown!
    assert state == AlertState.ALERT

def test_single_bad_frame_does_not_trigger_alert():
    sm = SessionStateMachine("test_session_6")
    sm.current_state = AlertState.NORMAL

    # Single high frame
    state = sm.process_frame(drowsiness_score=95, is_drowsy_instant=True, consecutive_closed_frames=1, consecutive_yawn_frames=0)
    # Should NOT trigger ALERT immediately from a single frame!
    assert state != AlertState.ALERT
