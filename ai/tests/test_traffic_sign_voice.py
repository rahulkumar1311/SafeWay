import time
import pytest
from common.config import settings
from traffic_sign.voice_alert import VoiceAlertSystem

def test_format_alert_message_stop_sign():
    vas = VoiceAlertSystem()
    msg = vas.format_alert_message("Stop Sign", "Stop completely", "Bring vehicle to a complete stop")
    assert "Stop sign ahead" in msg
    assert "complete stop" in msg

def test_format_alert_message_speed_limit():
    vas = VoiceAlertSystem()
    msg = vas.format_alert_message("Speed Limit 50", "Maximum speed limit is 50 km/h", "Maintain safe speed")
    assert "Speed alert" in msg
    assert "50 km/h" in msg

def test_format_alert_message_unknown_sign():
    vas = VoiceAlertSystem()
    msg = vas.format_alert_message("Unknown Sign", "Low confidence", "Observe road")
    assert "Unrecognized traffic sign" in msg

def test_voice_alert_cooldown():
    vas = VoiceAlertSystem()
    sign_type = "Yield"
    meaning = "Yield right of way"

    # First trigger -> returns alert text
    alert1 = vas.trigger_voice_alert(sign_type, meaning)
    assert alert1 is not None
    assert "Yield ahead" in alert1

    # Second trigger immediately -> suppressed due to cooldown -> returns None
    alert2 = vas.trigger_voice_alert(sign_type, meaning)
    assert alert2 is None

def test_voice_alert_disabled_config(monkeypatch):
    vas = VoiceAlertSystem()
    monkeypatch.setattr(settings, "ENABLE_VOICE_ALERTS", False)

    alert = vas.trigger_voice_alert("Pedestrian Crossing", "Pedestrian crossing ahead")
    assert alert is None
