import { useState, useCallback } from 'react';

export function useAudioAlerts() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceGuidance, setVoiceGuidance] = useState(true);

  // Synthesize alarm tone via Web Audio API
  const playAlertSound = useCallback(
    (freq = 880, type: OscillatorType = 'sine', duration = 0.5) => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        console.warn('Audio synthesis failed:', e);
      }
    },
    [soundEnabled]
  );

  // Spoken voice guidance via Web Speech Synthesis API
  const speakAlert = useCallback(
    (text: string) => {
      if (!voiceGuidance || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Voice synthesis error:', e);
      }
    },
    [voiceGuidance]
  );

  return {
    soundEnabled,
    setSoundEnabled,
    voiceGuidance,
    setVoiceGuidance,
    playAlertSound,
    speakAlert
  };
}
