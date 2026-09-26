import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  AlertTriangle, 
  Volume2, 
  CheckCircle2, 
  Mic, 
  Eye, 
  Keyboard, 
  Hand,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Stage1AlertModal = () => {
  const { systemState, stage1Countdown, reengageDriver } = useApp();
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  // Spacebar keypress listener for quick re-engagement
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (systemState === 'STAGE_1_ALERT' && e.code === 'Space') {
        e.preventDefault();
        triggerSuccess('Spacebar Press');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [systemState]);

  const triggerSuccess = (method) => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#00e676', '#00f2fe', '#ffffff']
    });
    reengageDriver(method);
  };

  const handleVoiceSim = () => {
    setIsListeningVoice(true);
    setTimeout(() => {
      setIsListeningVoice(false);
      triggerSuccess('Voice Command ("I am awake")');
    }, 1000);
  };

  if (systemState !== 'STAGE_1_ALERT') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl transition-all duration-300">
      
      {/* Pulsing Red Hazard Alert Border */}
      <div className="absolute inset-2 sm:inset-6 rounded-3xl border-4 border-red-500 pointer-events-none animate-[pulse-red_0.9s_infinite]"></div>

      <div className="glass-panel max-w-xl w-full p-7 sm:p-10 rounded-3xl border-red-500/70 bg-slate-950/95 shadow-[0_0_80px_rgba(255,23,68,0.5)] text-center space-y-7 relative overflow-hidden">
        
        {/* Header Warning */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-red-500/20 border border-red-500 text-red-300 text-xs font-black tracking-wider uppercase animate-bounce shadow-[0_0_20px_rgba(255,23,68,0.4)]">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>STAGE 1: DROWSINESS ALERT ACTIVE</span>
        </div>

        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            WAKE UP / RE-ENGAGE NOW
          </h2>
          <p className="text-slate-300 text-sm mt-1.5 leading-relaxed">
            In-car audio warning active! Please confirm alertness within 5 seconds.
          </p>
        </div>

        {/* 5-Second Circular Gauge Countdown */}
        <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="60"
              className="stroke-slate-900"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="72"
              cy="72"
              r="60"
              className="stroke-red-500 transition-all duration-1000 ease-linear shadow-[0_0_20px_#ff1744]"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray="376.99"
              strokeDashoffset={376.99 - (376.99 * stage1Countdown) / 5}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-black text-red-400 font-mono tracking-tighter">{stage1Countdown}</span>
            <span className="text-[10px] font-black text-slate-400 tracking-widest font-mono">SECONDS</span>
          </div>
        </div>

        {/* 4 Re-engagement Options */}
        <div className="space-y-3.5">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider font-mono">
            Re-engage Driver (Tap Any Trigger)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Action 1: Tap Button */}
            <button
              onClick={() => triggerSuccess('Manual HUD Tap')}
              className="glass-button glass-button-success justify-center py-3.5 text-sm font-black shadow-lg"
            >
              <Hand className="w-5 h-5 text-emerald-300" />
              <span>TAP: "I'M AWAKE"</span>
            </button>

            {/* Action 2: Spacebar */}
            <button
              onClick={() => triggerSuccess('Spacebar Press')}
              className="glass-button justify-center py-3.5 text-sm font-black bg-slate-900 border-slate-700 hover:border-cyan-400"
            >
              <Keyboard className="w-5 h-5 text-cyan-300" />
              <span>PRESS [SPACEBAR]</span>
            </button>

            {/* Action 3: Voice Command */}
            <button
              onClick={handleVoiceSim}
              disabled={isListeningVoice}
              className="glass-button justify-center py-3.5 text-sm font-black bg-purple-950/50 border-purple-500/60 hover:border-purple-400 text-purple-200"
            >
              <Mic className={`w-5 h-5 text-purple-300 ${isListeningVoice ? 'animate-ping' : ''}`} />
              <span>{isListeningVoice ? 'Listening...' : 'VOICE: "I AM AWAKE"'}</span>
            </button>

            {/* Action 4: Double Blink */}
            <button
              onClick={() => triggerSuccess('Double Blink Eye Tracking')}
              className="glass-button justify-center py-3.5 text-sm font-black bg-teal-950/50 border-teal-500/60 hover:border-teal-400 text-teal-200"
            >
              <Eye className="w-5 h-5 text-teal-300" />
              <span>EYE: DOUBLE BLINK</span>
            </button>

          </div>
        </div>

        {/* Warning info note */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-400 font-mono">
          Timeout escalates to <strong className="text-red-400">Stage 2: Safe Shoulder Pull-over & Deceleration</strong>.
        </div>

      </div>

    </div>
  );
};

