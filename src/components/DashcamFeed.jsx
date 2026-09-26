import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { realWebcamVisionEngine } from '../utils/realWebcamVisionEngine';
import { Camera, CameraOff, Square, Power } from 'lucide-react';

export const DashcamFeed = () => {
  const { 
    setEarScore, 
    setBlinkRate, 
    setYawnCount, 
    setFatigueLevel,
    setHeadTiltAngle,
    systemState
  } = useApp();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [webcamActive, setWebcamActive] = useState(false);

  // Store latest calculated telemetry metrics in Ref to prevent re-render cascades
  const metricsRef = useRef({ ear: 0.36, blinks: 0, yawns: 0, fatigue: 15, tilt: 0 });

  // Initialize WebCam Video Stream safely
  useEffect(() => {
    let streamInstance = null;

    if (cameraOn) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } 
        }).then(stream => {
          streamInstance = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
            setWebcamActive(true);
          }
        }).catch(err => {
          console.warn("Webcam camera access note:", err);
          setWebcamActive(false);
        });
      }
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
    }

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraOn]);

  // Real-Time WebCam Pixel Analysis & Canvas Loop (60 FPS)
  useEffect(() => {
    if (!cameraOn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const processCameraLoop = () => {
      // Analyze actual physical webcam pixels!
      const metrics = realWebcamVisionEngine.analyzeVideoFrame(videoRef.current, canvas);

      // Store live physical metrics in ref (No re-render loop inside rAF)
      metricsRef.current = {
        ear: metrics.earScore,
        blinks: metrics.blinkCount,
        yawns: metrics.yawnCount,
        fatigue: metrics.fatiguePercentage,
        tilt: metrics.headTilt,
        isEyeClosed: metrics.isEyeClosed
      };

      const width = canvas.width;
      const height = canvas.height;

      // Eye Sense Dynamic Pupil & Gaze Movement Tracking
      const gazeX = metrics.gazeX || 0;
      const gazeY = metrics.gazeY || 0;

      // Dynamic Camera Bounding Square Section (Translates dynamically with driver eye movement)
      const cx = (width / 2) + (gazeX * 4.2);
      const cy = (height / 2 - 10) + (gazeY * 3.5);

      // Draw Face Bounding Overlay Square Box
      const boxColor = metrics.isEyeClosed || systemState === 'STAGE_1_ALERT' || systemState === 'STAGE_2_DECELERATING'
        ? 'rgba(255, 23, 68, 0.9)'
        : 'rgba(0, 242, 254, 0.7)';

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = boxColor;

      const fw = 135;
      const fh = 175;
      const bLen = 20;

      ctx.beginPath();
      ctx.moveTo(cx - fw/2, cy - fh/2 + bLen);
      ctx.lineTo(cx - fw/2, cy - fh/2);
      ctx.lineTo(cx - fw/2 + bLen, cy - fh/2);

      ctx.moveTo(cx + fw/2 - bLen, cy - fh/2);
      ctx.lineTo(cx + fw/2, cy - fh/2);
      ctx.lineTo(cx + fw/2, cy - fh/2 + bLen);

      ctx.moveTo(cx - fw/2, cy + fh/2 - bLen);
      ctx.lineTo(cx - fw/2, cy + fh/2);
      ctx.lineTo(cx - fw/2 + bLen, cy + fh/2);

      ctx.moveTo(cx + fw/2 - bLen, cy + fh/2);
      ctx.lineTo(cx + fw/2, cy + fh/2);
      ctx.lineTo(cx + fw/2, cy + fh/2 - bLen);
      ctx.stroke();

      const leftEyeX = cx - 34;
      const rightEyeX = cx + 34;
      const eyeY = cy - 22;
      const eyeH = Math.max(2, metrics.earScore * 30);

      // 1. Eye Outline Contours
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(leftEyeX, eyeY, 14, eyeH, 0, 0, Math.PI * 2);
      ctx.ellipse(rightEyeX, eyeY, 14, eyeH, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Dynamic Eye Sense Pupils (Move inside square according to driver eye gaze)
      if (!metrics.isEyeClosed) {
        const pupilLeftX = leftEyeX + gazeX * 0.8;
        const pupilLeftY = eyeY + gazeY * 0.8;
        const pupilRightX = rightEyeX + gazeX * 0.8;
        const pupilRightY = eyeY + gazeY * 0.8;

        // Pupil Irises (Neon Cyan)
        ctx.fillStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(pupilLeftX, pupilLeftY, 5, 0, Math.PI * 2);
        ctx.arc(pupilRightX, pupilRightY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow

        // Inner pupil center (Dark dot)
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(pupilLeftX, pupilLeftY, 2.5, 0, Math.PI * 2);
        ctx.arc(pupilRightX, pupilRightY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye Sense Crosshair Target Reticles over Pupils
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.8)';
        ctx.lineWidth = 1;

        // Left Reticle Cross
        ctx.beginPath();
        ctx.moveTo(pupilLeftX - 9, pupilLeftY); ctx.lineTo(pupilLeftX + 9, pupilLeftY);
        ctx.moveTo(pupilLeftX, pupilLeftY - 9); ctx.lineTo(pupilLeftX, pupilLeftY + 9);
        // Right Reticle Cross
        ctx.moveTo(pupilRightX - 9, pupilRightY); ctx.lineTo(pupilRightX + 9, pupilRightY);
        ctx.moveTo(pupilRightX, pupilRightY - 9); ctx.lineTo(pupilRightX, pupilRightY + 9);
        ctx.stroke();

        // Eye Sense Gaze Direction Vector Lines
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        ctx.beginPath();
        ctx.moveTo(pupilLeftX, pupilLeftY);
        ctx.lineTo(pupilLeftX + gazeX * 2.5, pupilLeftY + gazeY * 2.5);
        ctx.moveTo(pupilRightX, pupilRightY);
        ctx.lineTo(pupilRightX + gazeX * 2.5, pupilRightY + gazeY * 2.5);
        ctx.stroke();
      }

      // 3. Eye Sense Status HUD Banner moving with camera square section
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(cx - 100, cy - fh/2 - 28, 200, 22);
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 100, cy - fh/2 - 28, 200, 22);

      ctx.fillStyle = '#00f2fe';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`EYE SENSE: X:${gazeX > 0 ? '+' : ''}${gazeX}px Y:${gazeY > 0 ? '+' : ''}${gazeY}px`, cx, cy - fh/2 - 13);
      ctx.textAlign = 'left';

      animationFrameId = requestAnimationFrame(processCameraLoop);
    };

    processCameraLoop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [cameraOn, systemState]);

  // Throttled React State Updater (Runs safely 4 times per second via setInterval)
  useEffect(() => {
    if (!cameraOn) return;
    const telemetryInterval = setInterval(() => {
      const { ear, blinks, yawns, fatigue, tilt } = metricsRef.current;
      setEarScore(ear);
      setBlinkRate(blinks);
      setYawnCount(yawns);
      setFatigueLevel(fatigue);
      setHeadTiltAngle(tilt);
    }, 250);

    return () => clearInterval(telemetryInterval);
  }, [cameraOn, setEarScore, setBlinkRate, setYawnCount, setFatigueLevel, setHeadTiltAngle]);

  return (
    <div className="glass-panel p-4 sm:p-5 rounded-3xl h-full flex flex-col justify-between space-y-4 relative overflow-hidden border-cyan-500/30 bg-slate-950/90 shadow-2xl">
      
      {/* Top Camera Header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Camera className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-extrabold text-white tracking-wide">Live Driver Camera Stream</span>
        </div>
        {cameraOn && (
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            REAL WEBCAM VISION
          </span>
        )}
      </div>

      {/* Main Video Container — Extended Till Bottom */}
      <div className="relative w-full flex-1 min-h-[520px] lg:h-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
        
        {cameraOn ? (
          <>
            {/* Live Camera Stream */}
            <video 
              ref={videoRef} 
              className={`absolute inset-0 w-full h-full object-cover ${webcamActive ? 'block' : 'hidden'}`}
              muted
              playsInline
            />

            {/* Real Driver Stream Fallback when webcam permission is pending */}
            {!webcamActive && (
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=650&q=80" 
                  alt="Real Driver Stream" 
                  className="w-full h-full object-cover opacity-90"
                />
              </div>
            )}

            {/* Real Canvas Facial Landmark Mesh Overlay */}
            <canvas 
              ref={canvasRef} 
              width={640} 
              height={480} 
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* Bottom-Mid RED SQUARE BUTTON to OFF Video */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1">
              <button
                onClick={() => setCameraOn(false)}
                className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-black rounded-2xl flex flex-col items-center justify-center border-2 border-red-400 shadow-[0_0_35px_rgba(255,23,68,0.8)] transition-all group"
                title="Click Red Square Button to Turn OFF Video"
              >
                <Square className="w-6 h-6 fill-white text-white group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase font-mono tracking-wider mt-0.5">OFF</span>
              </button>
            </div>
          </>
        ) : (
          /* Camera Turned OFF State */
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 z-10">
            <div className="p-6 rounded-3xl bg-slate-900 border-2 border-red-500/40 text-red-400 shadow-[0_0_30px_rgba(255,23,68,0.2)]">
              <CameraOff className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-white">Video Feed Turned OFF</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                Live camera stream and real-time detection paused. Click below to turn video stream back ON.
              </p>
            </div>

            {/* Square Button to Turn Video ON */}
            <button
              onClick={() => setCameraOn(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs tracking-wider uppercase border-2 border-emerald-400 shadow-[0_0_25px_rgba(0,230,118,0.4)] transition-all flex items-center gap-2 mt-2"
            >
              <Power className="w-5 h-5" />
              <span>TURN VIDEO ON</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
