import time
import threading
from typing import Dict, Any, Optional
from common.config import settings
from common.logger import logger

class VoiceAlertSystem:
    """
    Decoupled Voice Alert & Speech Synthesis Engine for Traffic Signs.
    Converts traffic sign information into driver-friendly voice alerts with cooldown & async execution.
    """
    def __init__(self):
        self.last_alert_times: Dict[str, float] = {}

    def format_alert_message(self, sign_type: str, meaning: str, action: Optional[str] = None) -> str:
        """
        Formats signType, meaning, and action into a short, driver-friendly alert message.
        """
        if not sign_type or sign_type == "Unknown Sign":
            return "Notice: Unrecognized traffic sign ahead. Drive with caution."

        clean_type = sign_type.strip()
        clean_meaning = meaning.strip() if meaning else ""
        clean_action = action.strip() if action else ""

        if "Stop" in clean_type:
            return "Alert: Stop sign ahead. Bring vehicle to a complete stop."
        elif "Speed Limit" in clean_type:
            return f"Speed alert: {clean_meaning}. Maintain safe speed."
        elif "Yield" in clean_type:
            return "Yield ahead. Prepare to give right of way to oncoming traffic."
        elif "No Entry" in clean_type:
            return "Warning: No entry zone ahead. Do not enter."
        elif "Pedestrian" in clean_type:
            return "Caution: Pedestrian crossing ahead. Slow down and watch crosswalks."
        elif "Bump" in clean_type:
            return "Caution: Speed bump ahead. Reduce speed."
        elif "Traffic Light" in clean_type:
            return "Traffic signals ahead. Prepare to stop."

        if clean_action:
            return f"Alert: {clean_type} ahead. {clean_action}."
        elif clean_meaning:
            return f"Alert: {clean_type} ahead. {clean_meaning}."
        else:
            return f"Alert: {clean_type} ahead. Observe traffic conditions."

    def trigger_voice_alert(self, sign_type: str, meaning: str, action: Optional[str] = None) -> Optional[str]:
        """
        Triggers asynchronous local text-to-speech audio alert if enabled and not in cooldown window.
        Returns the formatted alert message text.
        """
        # 1. Check if voice alerts are enabled in config
        if not settings.ENABLE_VOICE_ALERTS:
            logger.debug("Voice alerts are disabled in configuration.")
            return None

        # 2. Check for unknown sign or empty sign
        if not sign_type or sign_type == "Unknown Sign":
            return None

        now = time.time()
        cooldown = settings.VOICE_ALERT_COOLDOWN_SECONDS

        # 3. Check Cooldown per signType
        last_time = self.last_alert_times.get(sign_type, 0.0)
        if (now - last_time) < cooldown:
            logger.info(f"Voice alert for '{sign_type}' suppressed due to cooldown ({cooldown}s).")
            return None

        self.last_alert_times[sign_type] = now

        # 4. Generate driver-friendly alert message
        alert_text = self.format_alert_message(sign_type, meaning, action)
        logger.info(f"Triggering Voice Alert: \"{alert_text}\"")

        # 5. Non-blocking asynchronous local text-to-speech execution
        thread = threading.Thread(
            target=self._speak_offline,
            args=(alert_text,),
            daemon=True
        )
        thread.start()

        return alert_text

    def _speak_offline(self, text: str):
        """
        Offline text-to-speech engine execution via pyttsx3 (running on background thread).
        """
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty('rate', 160) # Driver speech speed
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            logger.warning(f"Local offline TTS playback notice: {str(e)}")

voice_alert_system = VoiceAlertSystem()
