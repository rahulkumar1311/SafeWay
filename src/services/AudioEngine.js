// Web Audio API & Speech Synthesis Engine for Drive Safe

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.alertOscillator = null;
    this.alertGain = null;
    this.alertInterval = null;
    this.isMuted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stopAlert();
    }
  }

  // Stage 1: Pulsing High-Priority Alert Siren (5-second alarm)
  playStage1Alert() {
    if (this.isMuted) return;
    this.init();
    this.stopAlert();

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();

      let toggle = false;
      this.alertInterval = setInterval(() => {
        if (!this.audioCtx) return;
        toggle = !toggle;
        const freq = toggle ? 987.77 : 783.99; // B5 or G5
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      }, 180);

      this.alertOscillator = osc;
      this.alertGain = gain;
    } catch (e) {
      console.warn("Audio Context playback error:", e);
    }
  }

  stopAlert() {
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }
    if (this.alertOscillator) {
      try {
        this.alertOscillator.stop();
        this.alertOscillator.disconnect();
      } catch (e) {
        // ignore
      }
      this.alertOscillator = null;
    }
  }

  // Play success chime when driver re-engages
  playReengageSuccess() {
    if (this.isMuted) return;
    this.init();
    this.stopAlert();

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      // ignore
    }
  }

  // Emergency Siren Tone for Stage 2 & 3
  playEmergencySiren() {
    if (this.isMuted) return;
    this.init();
    this.stopAlert();

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      const now = this.audioCtx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.6);

      gain.gain.setValueAtTime(0.35, now);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);

      let step = 0;
      this.alertInterval = setInterval(() => {
        if (!this.audioCtx) return;
        step++;
        const freq = (step % 2 === 0) ? 440 : 880;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      }, 400);

      this.alertOscillator = osc;
      this.alertGain = gain;
    } catch (e) {
      console.warn("Siren error", e);
    }
  }

  // Voice Speech Announcement
  speak(text) {
    if (this.isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export const audioEngine = new AudioEngine();
