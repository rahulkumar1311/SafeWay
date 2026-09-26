/**
 * Web Audio API Alert Synthesizer & Speech Alert Engine for Road Safety Dashboard
 * Provides browser-safe sound alerts & synthesized voice prompts for CAUTION, WARNING, CRITICAL, and CAMERA_BLOCKED.
 * Features debouncing (plays once every 6 seconds per unique alert) and Mute / Unmute controls.
 */

class RoadAudioAlertEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastAlertTimestampMap: Map<string, number> = new Map();

  public init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMutedStatus(): boolean {
    return this.isMuted;
  }

  public playHazardVoiceAlert(hazardTitle: string, hazardMessage: string) {
    if (this.isMuted) return;

    const nowMs = Date.now();
    const lastPlayed = this.lastAlertTimestampMap.get(hazardTitle) || 0;

    // Debounce voice alerts: repeat same hazard max once every 6000ms (6 seconds)
    if (nowMs - lastPlayed < 6000) return;
    this.lastAlertTimestampMap.set(hazardTitle, nowMs);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Clear queued speech
        const speechText = `${hazardTitle}. ${hazardMessage}`;
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[RoadAudio] Speech synthesis note:', err);
      }
    }
  }

  public playAlert(level: 'NORMAL' | 'CAUTION' | 'WARNING' | 'CRITICAL' | 'CAMERA_BLOCKED') {
    if (this.isMuted || level === 'NORMAL') return;

    const nowMs = Date.now();
    const lastPlayed = this.lastAlertTimestampMap.get(level) || 0;
    const intervalMs =
      level === 'CAMERA_BLOCKED' ? 1000 :
      level === 'CRITICAL' ? 1200 :
      level === 'WARNING' ? 2500 : 4000;

    if (nowMs - lastPlayed < intervalMs) return;
    this.lastAlertTimestampMap.set(level, nowMs);

    if (!this.ctx) this.init();
    if (!this.ctx) return;

    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;

      if (level === 'CAUTION') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (level === 'WARNING') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (level === 'CRITICAL') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (level === 'CAMERA_BLOCKED') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.linearRampToValueAtTime(500, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch (err) {
      console.warn('[RoadAudio] Alert audio playback note:', err);
    }
  }
}

export const roadAudioAlerts = new RoadAudioAlertEngine();
export default roadAudioAlerts;
