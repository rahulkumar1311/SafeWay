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

export type CameraSourceType = 'LAPTOP_CAMERA' | 'USB_MOBILE_CAMERA' | 'IP_STREAM';
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
  const imgStreamRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('CAMERA_PERMISSION_REQUIRED');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ipStreamUrl, setIpStreamUrl] = useState<string>('http://192.168.1.100:4747/video');

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

  // Clean device scanning: enumerates all videoinput devices with label discovery
  const scanDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoInputs = devices.filter((d) => d.kind === 'videoinput');

      // If device labels are empty (camera permission not yet requested in browser session),
      // briefly request a lightweight user media stream to populate device labels accurately.
      if (videoInputs.length > 0 && videoInputs.every((d) => !d.label)) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          tempStream.getTracks().forEach((t) => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          videoInputs = devices.filter((d) => d.kind === 'videoinput');
        } catch {
          // Permissions will be requested on startCamera
        }
      }

      setVideoDevices(videoInputs);

      // Detect USB/DroidCam/External Camera
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
    isProcessingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      setStream(null);
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
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

  // Main start/switch camera handler with exact device matching & candidate fallback tiers
  const startCameraWithDevice = useCallback(
    async (targetSource?: CameraSourceType, targetDeviceIdOverride?: string) => {
      const activeSource = targetSource || cameraSource;
      try {
        // 1. Fully release any existing active camera stream before requesting a new one
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
          streamRef.current = null;
        }
        if (videoRef.current) {
          try {
            videoRef.current.pause();
          } catch {}
          videoRef.current.srcObject = null;
        }
        setStream(null);

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

        // Scan for available devices
        let inputs = await scanDevices();

        // If inputs is empty or devices have no labels, prompt for a brief getUserMedia stream
        if (inputs.length === 0 || inputs.every((d) => !d.label)) {
          try {
            const probeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            probeStream.getTracks().forEach((t) => t.stop());
            inputs = await scanDevices();
          } catch (probeErr) {
            console.warn('[Drowsiness Camera] Permission probe note:', probeErr);
          }
        }

        console.log(`[Drowsiness Camera] Available cameras (${inputs.length}):`);
        inputs.forEach((d, idx) => {
          console.log(`  [${idx}] "${d.label}" (id: ${d.deviceId})`);
        });

        let chosenDeviceId = targetDeviceIdOverride !== undefined ? targetDeviceIdOverride : selectedDeviceId;
        let candidateDevices: MediaDeviceInfo[] = [];

        if (activeSource === 'LAPTOP_CAMERA') {
          // Identify laptop/integrated camera vs DroidCam
          const laptopDevs = inputs.filter((d) => {
            const label = (d.label || '').toLowerCase();
            return (
              label.includes('integrated') ||
              label.includes('built-in') ||
              label.includes('facetime') ||
              label.includes('internal') ||
              label.includes('laptop') ||
              label.includes('hd user facing') ||
              label.includes('hd webcam') ||
              label.includes('hd camera') ||
              (label.includes('webcam') && !label.includes('droidcam') && !label.includes('iriun') && !label.includes('obs'))
            );
          });

          const nonDroidDevs = inputs.filter((d) => {
            const label = (d.label || '').toLowerCase();
            return label.length > 0 && !label.includes('droidcam') && !label.includes('iriun') && !label.includes('obs') && !label.includes('virtual');
          });

          candidateDevices = [...laptopDevs, ...nonDroidDevs];

          if (chosenDeviceId) {
            const matchingDev = inputs.find((d) => d.deviceId === chosenDeviceId);
            if (matchingDev) candidateDevices.unshift(matchingDev);
          }
          if (candidateDevices.length > 0) {
            chosenDeviceId = candidateDevices[0].deviceId;
            setSelectedDeviceId(chosenDeviceId);
          }
        } else if (activeSource === 'USB_MOBILE_CAMERA') {
          // Find all matching DroidCam / USB phone video candidates
          const droidCamDevs = inputs.filter((d) => {
            const label = (d.label || '').toLowerCase();
            return (
              label.includes('droidcam') ||
              label.includes('usb') ||
              label.includes('mobile') ||
              label.includes('android') ||
              label.includes('phone') ||
              label.includes('external') ||
              label.includes('source') ||
              label.includes('iriun') ||
              label.includes('uvc') ||
              label.includes('obs')
            );
          });

          candidateDevices = droidCamDevs.length > 0 ? droidCamDevs : inputs.filter((d) => !(d.label || '').toLowerCase().includes('integrated'));

          if (chosenDeviceId) {
            const matchingDev = inputs.find((d) => d.deviceId === chosenDeviceId);
            if (matchingDev) candidateDevices.unshift(matchingDev);
          }

          if (candidateDevices.length > 0) {
            chosenDeviceId = candidateDevices[0].deviceId;
            setSelectedDeviceId(chosenDeviceId);
          } else {
            setCameraStatus('USB_MOBILE_CAMERA_NOT_DETECTED');
            setErrorMessage('DroidCam USB camera detected but no matching video device was found. Please ensure DroidCam Client is running.');
            return;
          }
        }

        console.log(`[Drowsiness Camera] Target Source: ${activeSource} | Initial candidate: '${chosenDeviceId || 'system default'}'`);

        let newStream: MediaStream | null = null;
        let lastError: any = null;

        // Try candidate devices sequentially until one produces a live stream
        for (const candidate of candidateDevices) {
          try {
            console.log(`[Drowsiness Camera] Attempting to open device: "${candidate.label}" (${candidate.deviceId})`);
            const constraints: MediaStreamConstraints = {
              video: {
                deviceId: { exact: candidate.deviceId },
                width: { ideal: targetWidth },
                height: { ideal: targetHeight }
              },
              audio: false
            };
            const candidateStream = await navigator.mediaDevices.getUserMedia(constraints);
            const track = candidateStream.getVideoTracks()[0];
            if (track && track.readyState === 'live') {
              newStream = candidateStream;
              chosenDeviceId = candidate.deviceId;
              setSelectedDeviceId(candidate.deviceId);
              console.log(`[Drowsiness Camera] Successfully acquired live stream from "${candidate.label}"`);
              break;
            } else {
              candidateStream.getTracks().forEach((t) => t.stop());
            }
          } catch (candErr) {
            lastError = candErr;
            console.warn(`[Drowsiness Camera] Device "${candidate.label}" open attempt note:`, candErr);
          }
        }

        // Generic fallback if candidate devices failed
        if (!newStream) {
          try {
            console.log('[Drowsiness Camera] Attempting universal getUserMedia fallback...');
            const fallbackConstraints: MediaStreamConstraints = {
              video: {
                facingMode: activeSource === 'LAPTOP_CAMERA' ? 'user' : undefined,
                width: { ideal: targetWidth },
                height: { ideal: targetHeight }
              },
              audio: false
            };
            newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          } catch (eFallback: any) {
            console.error('[Drowsiness Camera] All getUserMedia tiers failed:', eFallback);
            const errName = eFallback?.name || lastError?.name || 'UnknownError';
            const errMsg = eFallback?.message || lastError?.message || String(eFallback);

            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
              setCameraStatus('CAMERA_DENIED');
              setErrorMessage('Camera access was denied. Please allow camera permissions in browser site settings.');
            } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
              setCameraStatus('CAMERA_ERROR');
              setErrorMessage('Camera hardware is currently in use by another application or tab.');
            } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
              setCameraStatus('CAMERA_ERROR');
              setErrorMessage('No video camera device was detected on your system.');
            } else if (errName === 'OverconstrainedError') {
              setCameraStatus('CAMERA_ERROR');
              setErrorMessage('Camera constraints are not supported by the selected device.');
            } else {
              setCameraStatus('CAMERA_ERROR');
              setErrorMessage(`Unable to access camera (${errName}): ${errMsg}`);
            }
            return;
          }
        }

        if (!newStream) {
          setCameraStatus('CAMERA_ERROR');
          setErrorMessage('Unable to access camera hardware: No media stream returned.');
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
        const activeLabel = track.label || (activeSource === 'USB_MOBILE_CAMERA' ? 'DroidCam Video' : 'Integrated Laptop Webcam');
        const activeWidth = settings.width || targetWidth;
        const activeHeight = settings.height || targetHeight;
        const activeFrameRate = settings.frameRate || 30;

        track.onended = () => {
          console.warn('[Drowsiness Camera] Video track ended/disconnected');
          stopCamera();
          if (activeSource === 'USB_MOBILE_CAMERA') {
            setCameraStatus('USB_MOBILE_CAMERA_DISCONNECTED');
            setErrorMessage('DroidCam USB camera disconnected: Stream was closed.');
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

          // Wait until video has received data and readyState is sufficient before marking ACTIVE
          await new Promise<void>((resolve) => {
            if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
              resolve();
              return;
            }
            const onReady = () => {
              video.removeEventListener('loadedmetadata', onReady);
              video.removeEventListener('playing', onReady);
              resolve();
            };
            video.addEventListener('loadedmetadata', onReady);
            video.addEventListener('playing', onReady);
            setTimeout(resolve, 500); // Guard timeout
          });

          try {
            await video.play();
          } catch (playErr) {
            console.warn('[Drowsiness Camera] video.play() note:', playErr);
          }
        }

        const currentReadyState = track.readyState;
        const videoDimensions = `${videoRef.current?.videoWidth || activeWidth}x${videoRef.current?.videoHeight || activeHeight}`;

        console.log(`[Drowsiness Camera] Selected camera: "${activeLabel}"`);
        console.log(`[Drowsiness Camera] Track state: ${currentReadyState}`);
        console.log(`[Drowsiness Camera] Video dimensions: ${videoDimensions}`);

        setActiveTrackInfo({
          deviceId: activeDeviceId,
          label: activeLabel,
          width: activeWidth,
          height: activeHeight,
          frameRate: activeFrameRate,
          readyState: currentReadyState
        });

        // Set status to ACTIVE now that frames are actually ready
        setCameraStatus('CAMERA_ACTIVE');

        // Re-scan devices so all real device labels are refreshed in dropdown
        scanDevices();
      } catch (err: any) {
        console.error('[Drowsiness Camera Error]', err);
        stopCamera();
        setCameraStatus('CAMERA_ERROR');
        setErrorMessage('Unable to initialize camera. Please check permissions.');
      }
    },
    [cameraSource, selectedDeviceId, stopCamera, scanDevices, targetWidth, targetHeight]
  );

  const startCamera = useCallback(() => {
    return startCameraWithDevice();
  }, [startCameraWithDevice]);

  // Handle DroidCam / IP Webcam direct stream URL
  const startIpStream = useCallback(
    (url: string) => {
      stopCamera();
      const validUrl = url.trim() || 'http://192.168.1.100:4747/video';
      setIpStreamUrl(validUrl);
      setCameraSource('IP_STREAM');
      setCameraStatus('CAMERA_ACTIVE');
      setActiveTrackInfo({
        deviceId: 'ip-stream',
        label: `DroidCam WiFi Stream (${validUrl})`,
        width: targetWidth,
        height: targetHeight,
        frameRate: 30,
        readyState: 'live'
      });
    },
    [stopCamera, targetWidth, targetHeight]
  );

  // Handle camera source switch cleanly
  const changeCameraSource = useCallback(
    (newSource: CameraSourceType) => {
      stopCamera();
      setCameraSource(newSource);
      setSelectedDeviceId('');
      if (newSource === 'IP_STREAM') {
        startIpStream(ipStreamUrl);
      } else {
        startCameraWithDevice(newSource, '');
      }
    },
    [stopCamera, startCameraWithDevice, startIpStream, ipStreamUrl]
  );

  // Handle device ID change cleanly with automatic source alignment
  const changeSelectedDevice = useCallback(
    (deviceId: string) => {
      stopCamera();
      setSelectedDeviceId(deviceId);

      // Determine matching camera source from device label
      const dev = videoDevices.find((d) => d.deviceId === deviceId);
      const label = (dev?.label || '').toLowerCase();
      const isUsb =
        label.includes('droidcam') ||
        label.includes('usb') ||
        label.includes('mobile') ||
        label.includes('android') ||
        label.includes('phone') ||
        label.includes('external') ||
        label.includes('iriun') ||
        label.includes('uvc') ||
        label.includes('obs');

      const matchingSource: CameraSourceType = isUsb ? 'USB_MOBILE_CAMERA' : 'LAPTOP_CAMERA';
      setCameraSource(matchingSource);
      startCameraWithDevice(matchingSource, deviceId);
    },
    [videoDevices, stopCamera, startCameraWithDevice]
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

  // Optimized Ultra-Low Latency AI Frame Sampling Loop for both WebRTC and DroidCam IP Stream
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (cameraStatus === 'CAMERA_ACTIVE') {
      const intervalMs = Math.max(300, Math.round(1000 / fps));
      intervalId = setInterval(async () => {
        if (isProcessingRef.current) return;

        // Initialize reusable offscreen canvas once to avoid DOM canvas allocation lag
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }

        const offscreen = offscreenCanvasRef.current;
        if (offscreen.width !== targetWidth) offscreen.width = targetWidth;
        if (offscreen.height !== targetHeight) offscreen.height = targetHeight;

        const ctx = offscreen.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        if (cameraSource === 'IP_STREAM') {
          const img = imgStreamRef.current;
          if (!img || !img.complete || img.naturalWidth === 0) return;
          try {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          } catch {
            return;
          }
        } else {
          const video = videoRef.current;
          if (
            !video ||
            !streamRef.current ||
            video.paused ||
            video.ended ||
            video.readyState < 2 ||
            video.videoWidth === 0 ||
            video.videoHeight === 0
          ) {
            return;
          }

          // Hardware-accelerated scaling directly into lightweight target dimensions
          try {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          } catch {
            return;
          }
        }

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
  }, [cameraStatus, cameraSource, fps, jpegQuality, targetWidth, targetHeight]);

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
    imgStreamRef,
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
    ipStreamUrl,
    setIpStreamUrl,
    startIpStream,
    scanDevices,
    startCamera,
    stopCamera
  };
}

export default useWebcam;
