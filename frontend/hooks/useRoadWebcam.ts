import { useRef, useState, useCallback, useEffect } from 'react';

export type RoadCameraStatus =
  | 'CAMERA_PERMISSION_REQUIRED'
  | 'CAMERA_STARTING'
  | 'CAMERA_ACTIVE'
  | 'CAMERA_DENIED'
  | 'CAMERA_ERROR';

export interface UseRoadWebcamOptions {
  targetWidth?: number;
  targetHeight?: number;
  autoStart?: boolean;
}

export function useRoadWebcam(options: UseRoadWebcamOptions = {}) {
  const { targetWidth = 640, targetHeight = 480, autoStart = true } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStatus, setCameraStatus] = useState<RoadCameraStatus>('CAMERA_PERMISSION_REQUIRED');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      console.log('[RoadCamera] mediaDevices:', {
        hasMediaDevices: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices),
        hasGetUserMedia: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
        isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
        protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
      });

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const msg = 'Camera access requires a secure context (HTTPS or http://localhost). Current protocol is insecure.';
        console.error('[RoadCamera] Insecure context error:', msg);
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage(msg);
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const msg = 'navigator.mediaDevices.getUserMedia is not supported or unavailable in this browser environment.';
        console.error('[RoadCamera] Unsupported mediaDevices:', msg);
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage(msg);
        return;
      }

      setErrorMessage('');
      setCameraStatus('CAMERA_STARTING');

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: targetWidth },
          height: { ideal: targetHeight },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      console.log('[RoadCamera] getUserMedia requested with constraints:', constraints);

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn('[RoadCamera] Environment facing camera constraint failed, attempting fallback to default video device:', firstErr);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: targetWidth }, height: { ideal: targetHeight } },
            audio: false
          });
        } catch (secondErr: any) {
          console.warn('[RoadCamera] Standard resolution constraint failed, trying universal { video: true } fallback:', secondErr);
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      console.log('[RoadCamera] permission granted');
      const tracks = mediaStream.getVideoTracks();
      console.log('[RoadCamera] stream tracks:', tracks.map((t) => ({
        label: t.label,
        readyState: t.readyState,
        enabled: t.enabled,
        settings: typeof t.getSettings === 'function' ? t.getSettings() : {}
      })));

      setStream(mediaStream);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;

        await new Promise<void>((resolve) => {
          if (video.readyState >= 1) {
            resolve();
          } else {
            video.onloadedmetadata = () => resolve();
          }
        });

        console.log('[RoadCamera] video readyState:', video.readyState);

        await video.play();
        console.log('[RoadCamera] playback started');

        // Only mark ACTIVE if play() succeeded and video dimensions are > 0
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          console.log('[RoadCamera] video dimensions verified > 0:', `${video.videoWidth}x${video.videoHeight}`);
          setCameraStatus('CAMERA_ACTIVE');
        } else {
          await new Promise<void>((resolve) => {
            const check = () => {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                video.removeEventListener('playing', check);
                video.removeEventListener('resize', check);
                resolve();
              }
            };
            video.addEventListener('playing', check);
            video.addEventListener('resize', check);
            setTimeout(resolve, 1000);
          });

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('[RoadCamera] video dimensions verified after playback event:', `${video.videoWidth}x${video.videoHeight}`);
            setCameraStatus('CAMERA_ACTIVE');
          } else {
            console.error('[RoadCamera] Video dimensions are 0x0 despite active stream.');
            setCameraStatus('CAMERA_ERROR');
            setErrorMessage('Camera stream connected but frame dimensions are 0x0. Verify device video hardware.');
          }
        }
      }
    } catch (err: any) {
      const errName = err.name || 'UnknownError';
      const errMsg = err.message || String(err);
      console.error(`[RoadCamera] getUserMedia rejection error: [${errName}] ${errMsg}`, err);

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraStatus('CAMERA_DENIED');
        setErrorMessage(`Camera permission denied [${errName}]: ${errMsg}. Please allow camera access in browser settings.`);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage(`No video camera device found [${errName}]: ${errMsg}.`);
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage(`Camera device is in use by another application or tab [${errName}]: ${errMsg}.`);
      } else if (errName === 'OverconstrainedError') {
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage(`Requested camera constraint cannot be satisfied by device [${errName}]: ${errMsg}.`);
      } else if (errName === 'SecurityError') {
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage(`Camera access blocked due to security policy [${errName}]: ${errMsg}. Ensure HTTPS or secure context.`);
      } else {
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage(`Camera initialization failed [${errName}]: ${errMsg}`);
      }
    }
  }, [targetWidth, targetHeight]);

  const stopCamera = useCallback(() => {
    console.log('[RoadCamera] Stopping media tracks...');
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log('[RoadCamera] Track stopped:', track.label);
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('CAMERA_PERMISSION_REQUIRED');
  }, [stream]);

  // Auto-start on mount if autoStart is true
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
  }, [autoStart, startCamera]);

  // Clean up tracks on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        console.log('[RoadCamera] Component unmounting, stopping track...');
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    cameraStatus,
    errorMessage,
    startCamera,
    stopCamera
  };
}
