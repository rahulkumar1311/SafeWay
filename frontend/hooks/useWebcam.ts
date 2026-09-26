import { useRef, useState, useCallback, useEffect } from 'react';

export type CameraStatus =
  | 'CAMERA_PERMISSION_REQUIRED'
  | 'CAMERA_STARTING'
  | 'CAMERA_ACTIVE'
  | 'CAMERA_DENIED'
  | 'CAMERA_ERROR'
  | 'CAMERA_SWITCH_FAILED'
  | 'USB_MOBILE_CAMERA_NOT_DETECTED'
  | 'USB_MOBILE_CAMERA_DISCONNECTED';

export type CameraSourceType = 'LAPTOP_CAMERA' | 'USB_MOBILE_CAMERA';
export type CameraRoleType = 'DRIVER_CAMERA' | 'ROAD_CAMERA';

export interface ActiveTrackInfo {
  deviceId: string;
  label: string;
  width: number;
  height: number;
  frameRate: number;
  readyState: string;
}

export interface UseWebcamOptions {
  fps?: number;
  jpegQuality?: number;
  targetWidth?: number;
  targetHeight?: number;
  onFrame?: (base64Frame: string) => Promise<void> | void;
}

export function useWebcam(options: UseWebcamOptions = {}) {
  const {
    fps = 1, // Default 1 FPS for AI sampling to prevent lag while keeping video preview smooth
    jpegQuality = 0.5,
    targetWidth = 480,
    targetHeight = 360,
    onFrame
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('CAMERA_PERMISSION_REQUIRED');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [cameraSource, setCameraSource] = useState<CameraSourceType>('LAPTOP_CAMERA');
  const [cameraRole, setCameraRole] = useState<CameraRoleType>('DRIVER_CAMERA');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeTrackInfo, setActiveTrackInfo] = useState<ActiveTrackInfo | null>(null);
  const [usbCameraDetected, setUsbCameraDetected] = useState<boolean>(false);
  const [usbDeviceLabel, setUsbDeviceLabel] = useState<string>('');

  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  // Clean device scanning without opening/stopping temporary media streams
  const scanDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      console.log('[Camera] Enumerate video devices:', videoInputs.map((d) => ({ id: d.deviceId, label: d.label || 'Webcam' })));

      const usbDev = videoInputs.find((d) => {
        const label = (d.label || '').toLowerCase();
        return (
          label.includes('droidcam') ||
          label.includes('usb') ||
          label.includes('mobile') ||
          label.includes('android') ||
          label.includes('phone') ||
          label.includes('external') ||
          label.includes('iriun') ||
          label.includes('uvc') ||
          label.includes('obs')
        );
      });

      const isUsbFound = Boolean(usbDev);
      setUsbCameraDetected(isUsbFound);
      setUsbDeviceLabel(usbDev ? usbDev.label || 'USB Mobile Camera' : '');

      return videoInputs;
    } catch (err) {
      console.warn('[Camera Scan Error]', err);
      return [];
    }
  }, []);

  // Centralized, idempotent stopCamera cleanup function
  const stopCamera = useCallback(() => {
    console.log('[Camera] Stopping MediaStream tracks and releasing camera...');
    isProcessingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log('[Camera] Stopping track:', track.label);
        track.stop();
      });
      streamRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setActiveTrackInfo(null);
    setCameraStatus('CAMERA_PERMISSION_REQUIRED');
  }, [stream]);

  // Main start/switch camera handler with 3-tier robust constraint cascade
  const startCameraWithDevice = useCallback(
    async (targetSource?: CameraSourceType, targetDeviceIdOverride?: string) => {
      const activeSource = targetSource || cameraSource;
      try {
        if (streamRef.current || stream) {
          stopCamera();
        }

        setErrorMessage('');
        setCameraStatus('CAMERA_STARTING');

        // Validation for secure context
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          const msg = 'Camera access requires a secure context (HTTPS or localhost).';
          setCameraStatus('CAMERA_ERROR');
          setErrorMessage(msg);
          return;
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          const msg = 'Webcam API (navigator.mediaDevices.getUserMedia) is not supported in this browser.';
          setCameraStatus('CAMERA_ERROR');
          setErrorMessage(msg);
          return;
        }

        const inputs = await scanDevices();

        let chosenDeviceId = targetDeviceIdOverride !== undefined ? targetDeviceIdOverride : selectedDeviceId;

        if (activeSource === 'USB_MOBILE_CAMERA') {
          const usbDev = inputs.find((d) => {
            const label = (d.label || '').toLowerCase();
            return (
              label.includes('droidcam') ||
              label.includes('usb') ||
              label.includes('mobile') ||
              label.includes('android') ||
              label.includes('phone') ||
              label.includes('external') ||
              label.includes('iriun') ||
              label.includes('uvc') ||
              label.includes('obs')
            );
          }) || (inputs.length > 1 ? inputs[1] : null);

          if (chosenDeviceId) {
            setSelectedDeviceId(chosenDeviceId);
          } else if (usbDev && usbDev.deviceId) {
            chosenDeviceId = usbDev.deviceId;
            setSelectedDeviceId(usbDev.deviceId);
          } else {
            console.warn('[Camera] USB Mobile Camera requested, but no USB/phone webcam device found.');
            setCameraStatus('USB_MOBILE_CAMERA_NOT_DETECTED');
            setErrorMessage('USB MOBILE CAMERA NOT DETECTED: Ensure DroidCam is active, or switch to Laptop Cam.');
            return;
          }
        } else {
          // Integrated Laptop Camera logic: Find laptop/built-in device or non-DroidCam input
          const laptopDev =
            inputs.find((d) => {
              const label = (d.label || '').toLowerCase();
              return (
                label.includes('integrated') ||
                label.includes('built-in') ||
                label.includes('facetime') ||
                label.includes('internal') ||
                label.includes('laptop') ||
                label.includes('hd camera') ||
                (label.includes('webcam') && !label.includes('droidcam'))
              );
            }) ||
            inputs.find((d) => {
              const label = (d.label || '').toLowerCase();
              return !label.includes('droidcam') && !label.includes('iriun') && !label.includes('obs');
            }) ||
            inputs[0];

          if (!chosenDeviceId && laptopDev?.deviceId) {
            chosenDeviceId = laptopDev.deviceId;
          }
          if (chosenDeviceId) {
            setSelectedDeviceId(chosenDeviceId);
          }
        }

        console.log(`[Camera] Requesting getUserMedia for '${activeSource}' deviceId: '${chosenDeviceId}'`);

        let newStream: MediaStream | null = null;
        let primaryErr: any = null;

        // Tier 1: Ideal device selection with target dimensions
        try {
          const tier1Constraints: MediaStreamConstraints = {
            video: chosenDeviceId
              ? { deviceId: { ideal: chosenDeviceId }, width: { ideal: targetWidth }, height: { ideal: targetHeight } }
              : { facingMode: 'user', width: { ideal: targetWidth }, height: { ideal: targetHeight } },
            audio: false
          };
          newStream = await navigator.mediaDevices.getUserMedia(tier1Constraints);
        } catch (e1) {
          primaryErr = e1;
          console.warn('[Camera] Tier 1 constraint failed, attempting Tier 2 (deviceId without resolution):', e1);
          // Tier 2: Device ID or facingMode without strict resolution limits
          try {
            const tier2Constraints: MediaStreamConstraints = {
              video: chosenDeviceId ? { deviceId: { ideal: chosenDeviceId } } : { facingMode: 'user' },
              audio: false
            };
            newStream = await navigator.mediaDevices.getUserMedia(tier2Constraints);
          } catch (e2) {
            console.warn('[Camera] Tier 2 constraint failed, attempting Tier 3 ({ video: true } universal fallback):', e2);
            // Tier 3: Universal WebRTC fallback (always opens system default laptop camera)
            try {
              newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            } catch (e3: any) {
              console.error('[Camera] All getUserMedia fallback tiers failed:', e3);
              const errName = e3?.name || primaryErr?.name || 'UnknownError';
              const errMsg = e3?.message || primaryErr?.message || String(e3);

              if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
                setCameraStatus('CAMERA_DENIED');
                setErrorMessage('Camera permission denied. Please enable camera access in browser site settings.');
              } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
                setCameraStatus('CAMERA_ERROR');
                setErrorMessage('Camera hardware is currently used by another app. Please close other camera tabs/apps.');
              } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
                setCameraStatus('CAMERA_ERROR');
                setErrorMessage('No video camera device was detected on your system.');
              } else {
                setCameraStatus('CAMERA_ERROR');
                setErrorMessage(`Unable to access camera (${errName}): ${errMsg}`);
              }
              return;
            }
          }
        }

        if (!newStream) {
          setCameraStatus('CAMERA_ERROR');
          setErrorMessage('Unable to access camera hardware: null MediaStream returned.');
          return;
        }

        const track = newStream.getVideoTracks()[0];
        if (!track) {
          setCameraStatus('CAMERA_ERROR');
          setErrorMessage('Unable to access camera: No video track returned by device.');
          return;
        }

        const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
        const activeDeviceId = settings.deviceId || chosenDeviceId || '';
        const activeLabel = track.label || (activeSource === 'USB_MOBILE_CAMERA' ? 'USB Mobile Camera' : 'Integrated Laptop Webcam');
        const activeWidth = settings.width || targetWidth;
        const activeHeight = settings.height || targetHeight;
        const activeFrameRate = settings.frameRate || 30;

        track.onended = () => {
          console.warn('[Camera] Video track ended/disconnected');
          stopCamera();
          if (activeSource === 'USB_MOBILE_CAMERA') {
            setCameraStatus('USB_MOBILE_CAMERA_DISCONNECTED');
            setErrorMessage('USB MOBILE CAMERA DISCONNECTED: Phone webcam stream was closed.');
          } else {
            setCameraStatus('CAMERA_ERROR');
            setErrorMessage('Camera stream was disconnected.');
          }
        };

        // Save active stream
        streamRef.current = newStream;
        setStream(newStream);

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = newStream;
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.setAttribute('muted', '');

          try {
            await video.play();
          } catch (playErr) {
            console.warn('[Camera] video.play() exception note:', playErr);
          }
        }

        setActiveTrackInfo({
          deviceId: activeDeviceId,
          label: activeLabel,
          width: activeWidth,
          height: activeHeight,
          frameRate: activeFrameRate,
          readyState: track.readyState
        });

        setCameraStatus('CAMERA_ACTIVE');

        // Refresh enumerated devices now that camera permission is granted
        scanDevices();
      } catch (err: any) {
        console.error('[Webcam Error]', err);
        stopCamera();
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage('Unable to access camera. Check browser permissions and close any other apps using the camera.');
      }
    },
    [cameraSource, selectedDeviceId, stream, stopCamera, scanDevices, targetWidth, targetHeight]
  );

  const startCamera = useCallback(() => {
    return startCameraWithDevice();
  }, [startCameraWithDevice]);

  // Handle camera source switch cleanly
  const changeCameraSource = useCallback(
    (newSource: CameraSourceType) => {
      stopCamera();
      setCameraSource(newSource);
      setSelectedDeviceId('');
      startCameraWithDevice(newSource, '');
    },
    [stopCamera, startCameraWithDevice]
  );

  // Handle device ID change cleanly
  const changeSelectedDevice = useCallback(
    (deviceId: string) => {
      stopCamera();
      setSelectedDeviceId(deviceId);
      startCameraWithDevice(cameraSource, deviceId);
    },
    [cameraSource, stopCamera, startCameraWithDevice]
  );

  // Scan devices on mount
  useEffect(() => {
    scanDevices();
    const handleDeviceChange = () => {
      scanDevices();
    };

    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
    return () => {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, [scanDevices]);

  // Optimized Ultra-Low Latency AI Frame Sampling Loop with Offscreen Canvas Downscaling
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (cameraStatus === 'CAMERA_ACTIVE') {
      const intervalMs = Math.max(300, Math.round(1000 / fps));
      intervalId = setInterval(async () => {
        if (!videoRef.current || !streamRef.current) return;
        if (isProcessingRef.current) return;

        const video = videoRef.current;

        if (
          video.paused ||
          video.ended ||
          video.readyState < 2 ||
          video.videoWidth === 0 ||
          video.videoHeight === 0
        ) {
          return;
        }

        // Initialize reusable offscreen canvas once to avoid DOM canvas allocation lag
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }

        const offscreen = offscreenCanvasRef.current;
        if (offscreen.width !== targetWidth) offscreen.width = targetWidth;
        if (offscreen.height !== targetHeight) offscreen.height = targetHeight;

        const ctx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Hardware-accelerated scaling directly into lightweight target dimensions
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Fast JPEG encoding on small canvas (< 1ms CPU time, ~15KB string)
        const base64Jpeg = offscreen.toDataURL('image/jpeg', jpegQuality);

        if (onFrameRef.current) {
          try {
            isProcessingRef.current = true;
            await onFrameRef.current(base64Jpeg);
          } catch (e) {
            // Ignored frame error
          } finally {
            isProcessingRef.current = false;
          }
        }
      }, intervalMs);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      isProcessingRef.current = false;
    };
  }, [cameraStatus, fps, jpegQuality, targetWidth, targetHeight]);

  // Clean up all tracks on unmount / route navigation
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log('[Camera] Hook unmounting, releasing stream tracks...');
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      isProcessingRef.current = false;
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    cameraStatus,
    errorMessage,
    cameraSource,
    setCameraSource: changeCameraSource,
    cameraRole,
    setCameraRole,
    videoDevices,
    selectedDeviceId,
    setSelectedDeviceId: changeSelectedDevice,
    activeTrackInfo,
    usbCameraDetected,
    usbDeviceLabel,
    scanDevices,
    startCamera,
    stopCamera
  };
}

export default useWebcam;

