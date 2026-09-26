'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { NearbyVehicle } from '@/hooks/useV2VNetwork';
import { Play, Square, RotateCcw, ArrowLeft, ArrowRight, Gauge, Sliders, ShieldCheck, AlertTriangle } from 'lucide-react';

export interface DetectedRoadObject {
  id: string;
  type: 'CAR' | 'PEDESTRIAN' | 'BICYCLE' | 'TRUCK' | 'OBSTACLE' | 'TRAFFIC_SIGN';
  label: string;
  distanceMeters: number;
  confidence: number;
  directionAngle?: number;
}

export type VehicleSafetyMode = 'NORMAL' | 'PULLING_OVER' | 'STOPPED';

interface Cockpit3DVehicleViewProps {
  heading?: number;
  detectedObjects?: DetectedRoadObject[];
  nearbyV2VVehicles?: NearbyVehicle[];
  threatLevel?: 'SAFE' | 'CAUTION' | 'WARNING' | 'CRITICAL';
  speedKmH?: number | null;
  onSpeedChange?: (speed: number) => void;
  onHeadingChange?: (heading: number) => void;
  isDrowsy?: boolean;
  emergencyPullOver?: boolean;
}

export const Cockpit3DVehicleView: React.FC<Cockpit3DVehicleViewProps> = ({
  heading = 0,
  detectedObjects = [],
  nearbyV2VVehicles = [],
  threatLevel = 'SAFE',
  speedKmH = 0,
  onSpeedChange,
  onHeadingChange,
  isDrowsy = false,
  emergencyPullOver = false
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Manual Vehicle Movement Controls State (Default to MANUAL CONTROL = true)
  const [manualMode, setManualMode] = useState<boolean>(true);
  const [manualSpeed, setManualSpeedState] = useState<number>(0);
  const [manualHeading, setManualHeadingState] = useState<number>(heading || 0);
  const [steerAngle, setSteerAngleState] = useState<number>(0);

  // Emergency Pull-Over Safety Mode State
  const [safetyMode, setSafetyMode] = useState<VehicleSafetyMode>('NORMAL');
  const safetyModeRef = useRef<VehicleSafetyMode>('NORMAL');

  const manualSpeedRef = useRef(0);
  const manualHeadingRef = useRef(heading || 0);
  const steerAngleRef = useRef(0);
  const currentCarXRef = useRef(0);
  const targetCarXRef = useRef(0);

  const setManualSpeed = useCallback((valOrFn: number | ((prev: number) => number)) => {
    setManualSpeedState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const clamped = Math.max(0, Math.min(130, Math.round(next)));
      manualSpeedRef.current = clamped;
      if (onSpeedChange) onSpeedChange(clamped);
      return clamped;
    });
  }, [onSpeedChange]);

  const setManualHeading = useCallback((valOrFn: number | ((prev: number) => number)) => {
    setManualHeadingState((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const normalized = (Math.round(next) % 360 + 360) % 360;
      manualHeadingRef.current = normalized;
      if (onHeadingChange) onHeadingChange(normalized);
      return normalized;
    });
  }, [onHeadingChange]);

  const setSteerAngle = useCallback((val: number) => {
    steerAngleRef.current = val;
    setSteerAngleState(val);
  }, []);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const carMeshRef = useRef<THREE.Group | null>(null);
  const roadMeshRef = useRef<THREE.Mesh | null>(null);
  const taillightMeshRef = useRef<THREE.Mesh | null>(null);
  const radarGroupRef = useRef<THREE.Group | null>(null);
  const objectGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const propsRef = useRef({ heading, detectedObjects, nearbyV2VVehicles, threatLevel, speedKmH, manualMode, isDrowsy, emergencyPullOver });
  useEffect(() => {
    propsRef.current = { heading, detectedObjects, nearbyV2VVehicles, threatLevel, speedKmH, manualMode, isDrowsy, emergencyPullOver };
  }, [heading, detectedObjects, nearbyV2VVehicles, threatLevel, speedKmH, manualMode, isDrowsy, emergencyPullOver]);

  // Keyboard Driving Controls: Arrow Keys / WASD / Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!manualMode) return;
      const targetTag = (e.target as HTMLElement)?.tagName || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return;

      const isEmergencyActive = Boolean(propsRef.current.isDrowsy || propsRef.current.emergencyPullOver);

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        // Prevent acceleration during active emergency pull-over
        if (safetyModeRef.current !== 'NORMAL' && isEmergencyActive) return;
        setManualSpeed((prev) => Math.min(130, prev + 4));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setManualSpeed((prev) => Math.max(0, prev - 8));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (safetyModeRef.current === 'PULLING_OVER') return;
        setSteerAngle(-25);
        setManualHeading((prev) => prev - 4);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (safetyModeRef.current === 'PULLING_OVER') return;
        setSteerAngle(25);
        setManualHeading((prev) => prev + 4);
      } else if (e.key === ' ') {
        e.preventDefault();
        setManualSpeed(0); // Emergency Handbrake / Stop
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'].includes(e.key)) {
        if (safetyModeRef.current === 'NORMAL') {
          setSteerAngle(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [manualMode, setManualSpeed, setManualHeading, setSteerAngle]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xfffaf0, 0.035);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 5.5, 9.5);
    camera.lookAt(0, 0.8, -2);
    cameraRef.current = camera;

    // 3. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x0284c7, 1.6);
    dirLight.position.set(5, 12, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const vehicleSpotlight = new THREE.SpotLight(0x0284c7, 2.5, 15, Math.PI / 4, 0.5);
    vehicleSpotlight.position.set(0, 4, 2);
    vehicleSpotlight.target.position.set(0, 0, -5);
    scene.add(vehicleSpotlight);
    scene.add(vehicleSpotlight.target);

    // 5. Stylized Low-Poly EV Vehicle Model
    const carGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(1.6, 0.7, 3.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0369a1,
      emissiveIntensity: 0.2
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.55;
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    const cabinGeo = new THREE.BoxGeometry(1.3, 0.5, 1.8);
    const cabinMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      transmission: 0.8
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(0, 1.05, -0.2);
    carGroup.add(cabinMesh);

    const lightGeo = new THREE.BoxGeometry(1.4, 0.08, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const headlightMesh = new THREE.Mesh(lightGeo, lightMat);
    headlightMesh.position.set(0, 0.6, -1.71);
    carGroup.add(headlightMesh);

    const tailGeo = new THREE.BoxGeometry(1.4, 0.08, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const taillightMesh = new THREE.Mesh(tailGeo, tailMat);
    taillightMesh.position.set(0, 0.6, 1.71);
    carGroup.add(taillightMesh);
    taillightMeshRef.current = taillightMesh;

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelMeshes: THREE.Mesh[] = [];
    const positions = [
      [-0.85, 0.35, 1.1],
      [0.85, 0.35, 1.1],
      [-0.85, 0.35, -1.1],
      [0.85, 0.35, -1.1]
    ];
    positions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, y, z);
      carGroup.add(wheel);
      wheelMeshes.push(wheel);
    });

    scene.add(carGroup);
    carMeshRef.current = carGroup;

    // 6. 3D Road Surface (16 units wide: x from -8 to +8)
    const roadGeo = new THREE.PlaneGeometry(16, 40);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -10);
    road.receiveShadow = true;
    scene.add(road);
    roadMeshRef.current = road;

    const grid = new THREE.GridHelper(40, 20, 0x0284c7, 0xcbd5e1);
    grid.position.set(0, 0.02, -10);
    scene.add(grid);

    // 7. 3D Safety Radar Rings
    const radarGroup = new THREE.Group();
    const radarColors = [0x16a34a, 0xd97706, 0xea580c, 0xdc2626];
    const radii = [2.5, 4.5, 6.5, 8.5];

    radii.forEach((radius, index) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.04, radius, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: radarColors[index],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      radarGroup.add(ring);
    });
    scene.add(radarGroup);
    radarGroupRef.current = radarGroup;

    const objectGroup = new THREE.Group();
    scene.add(objectGroup);
    objectGroupRef.current = objectGroup;

    // 8. Animation & Render Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const currentProps = propsRef.current;

      const isEmergency = Boolean(currentProps.isDrowsy || currentProps.emergencyPullOver);

      // --- EMERGENCY PULL-OVER STATE MACHINE ---
      if (isEmergency) {
        if (safetyModeRef.current === 'NORMAL') {
          safetyModeRef.current = 'PULLING_OVER';
          setSafetyMode('PULLING_OVER');
        }

        // Target right shoulder position (5.0m on the 16m road)
        targetCarXRef.current = 5.0;

        // Smooth natural deceleration
        if (manualSpeedRef.current > 0) {
          const nextSpeed = Math.max(0, manualSpeedRef.current - 0.5);
          manualSpeedRef.current = nextSpeed;
          if (onSpeedChange) onSpeedChange(Math.round(nextSpeed));
          setManualSpeedState(Math.round(nextSpeed));
        }

        // Smooth lateral shift toward the right side
        currentCarXRef.current = THREE.MathUtils.lerp(currentCarXRef.current, targetCarXRef.current, 0.025);

        // Steering animation while pulling over (steer right then straighten)
        const laneDist = targetCarXRef.current - currentCarXRef.current;
        if (laneDist > 0.25) {
          steerAngleRef.current = THREE.MathUtils.lerp(steerAngleRef.current, 18, 0.1);
        } else {
          steerAngleRef.current = THREE.MathUtils.lerp(steerAngleRef.current, 0, 0.1);
        }

        // Check if stopped on safe shoulder
        if (manualSpeedRef.current <= 0.1 && Math.abs(currentCarXRef.current - targetCarXRef.current) < 0.3) {
          manualSpeedRef.current = 0;
          steerAngleRef.current = 0;
          if (safetyModeRef.current !== 'STOPPED') {
            safetyModeRef.current = 'STOPPED';
            setSafetyMode('STOPPED');
          }
        }
      } else {
        // Emergency cleared (driver alert)
        if (safetyModeRef.current === 'PULLING_OVER') {
          targetCarXRef.current = 0;
          currentCarXRef.current = THREE.MathUtils.lerp(currentCarXRef.current, targetCarXRef.current, 0.035);
          if (Math.abs(currentCarXRef.current) < 0.2) {
            safetyModeRef.current = 'NORMAL';
            setSafetyMode('NORMAL');
          }
        } else if (safetyModeRef.current === 'STOPPED') {
          // Keep stopped until user manually accelerates
          if (manualSpeedRef.current > 0) {
            targetCarXRef.current = 0;
            currentCarXRef.current = THREE.MathUtils.lerp(currentCarXRef.current, targetCarXRef.current, 0.035);
            if (Math.abs(currentCarXRef.current) < 0.2) {
              safetyModeRef.current = 'NORMAL';
              setSafetyMode('NORMAL');
            }
          }
        } else {
          targetCarXRef.current = 0;
          currentCarXRef.current = THREE.MathUtils.lerp(currentCarXRef.current, targetCarXRef.current, 0.05);
        }
      }

      // Determine active speed and heading based on manual control mode
      const isManual = currentProps.manualMode;
      const currentSpeed = isManual ? manualSpeedRef.current : (currentProps.speedKmH || 0);
      const currentHead = isManual ? manualHeadingRef.current : (currentProps.heading || 0);
      const currentSteer = steerAngleRef.current;

      if (carMeshRef.current) {
        // Update Lateral Position (X coordinate on road)
        carMeshRef.current.position.x = currentCarXRef.current;

        // Subtle engine idle or road vibration proportional to speed
        const bobFactor = currentSpeed > 0 ? Math.sin(elapsedTime * (currentSpeed * 0.15 + 4)) * 0.04 : 0.01;
        carMeshRef.current.position.y = 0.04 + bobFactor;

        // Steering angle turn tilt + heading rotation
        const targetRotY = THREE.MathUtils.degToRad(-currentHead % 360) + THREE.MathUtils.degToRad(currentSteer * 0.35);
        carMeshRef.current.rotation.y = THREE.MathUtils.lerp(carMeshRef.current.rotation.y, targetRotY, 0.12);

        // Body roll when turning
        const targetRollZ = THREE.MathUtils.degToRad(-currentSteer * 0.15);
        carMeshRef.current.rotation.z = THREE.MathUtils.lerp(carMeshRef.current.rotation.z, targetRollZ, 0.1);

        // Rotate wheel meshes when moving
        if (currentSpeed > 0) {
          wheelMeshes.forEach((w) => {
            w.rotation.x += (currentSpeed * 0.015);
          });
        }
      }

      // NO AUTOMATIC MOVEMENT WHEN SPEED IS 0! Road moves ONLY when currentSpeed > 0.
      if (grid) {
        if (currentSpeed > 0) {
          const speedFactor = currentSpeed * 0.04;
          grid.position.z = (grid.position.z + speedFactor * 0.05) % 2;
        }
      }

      if (radarGroupRef.current) {
        radarGroupRef.current.rotation.y = elapsedTime * 0.4;
      }

      if (objectGroupRef.current) {
        objectGroupRef.current.clear();

        const objectsToRender: DetectedRoadObject[] = [...currentProps.detectedObjects];

        currentProps.nearbyV2VVehicles.forEach((v, idx) => {
          objectsToRender.push({
            id: `v2v_${v.vehicleId}_${idx}`,
            type: 'CAR',
            label: `V2V: ${v.vehicleId}`,
            distanceMeters: Math.min(30, v.distanceMeters || 15),
            confidence: 0.95,
            directionAngle: 0
          });
        });

        objectsToRender.forEach((obj, idx) => {
          const dist = Math.min(15, Math.max(3, obj.distanceMeters * 0.3));
          const angle = ((obj.directionAngle || (idx * 60 - 60)) * Math.PI) / 180;
          const x = Math.sin(angle) * dist;
          const z = -Math.cos(angle) * dist;

          let objColor = 0x0284c7;
          if (obj.type === 'PEDESTRIAN' || obj.type === 'OBSTACLE') objColor = 0xdc2626;
          else if (obj.type === 'TRAFFIC_SIGN') objColor = 0xd97706;

          const objGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
          const objMat = new THREE.MeshStandardMaterial({
            color: objColor,
            wireframe: true,
            emissive: objColor,
            emissiveIntensity: 0.5
          });
          const objMesh = new THREE.Mesh(objGeo, objMat);
          objMesh.position.set(x, 0.6, z);

          objMesh.position.y = 0.6 + Math.sin(elapsedTime * 4 + idx) * 0.1;
          objectGroupRef.current?.add(objMesh);
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth || width;
      const newH = container.clientHeight || height;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      scene.clear();
    };
  }, []);

  const activeSpeed = manualMode ? manualSpeed : (speedKmH || 0);
  const activeHeading = manualMode ? manualHeading : (heading || 0);
  const isEmergencyActive = Boolean(isDrowsy || emergencyPullOver);

  return (
    <div className="relative w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden bg-[#FFFAF0] border border-slate-200 shadow-sm flex flex-col items-center justify-between p-3 font-mono">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Bar: HUD Info & Drive Mode Switcher */}
      <div className="relative z-10 w-full flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 bg-white/90 border border-slate-200/80 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-ping" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">3D COCKPIT RADAR</span>
          <span className="text-[10px] text-slate-400">|</span>
          <span className="text-[11px] font-bold text-sky-700 uppercase">THREAT: {threatLevel}</span>
        </div>

        {/* Dynamic Emergency Pull-Over HUD Banner */}
        {safetyMode === 'PULLING_OVER' && (
          <div className="flex items-center gap-2 bg-rose-600 border border-rose-400 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg text-white font-bold text-xs animate-pulse">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span>⚠ EMERGENCY PULL-OVER: VEHICLE MOVING TO SAFE SHOULDER</span>
          </div>
        )}

        {safetyMode === 'STOPPED' && (
          <div className="flex items-center gap-2 bg-rose-700 border border-rose-500 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg text-white font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-white shrink-0" />
            <span>⚠ VEHICLE SAFELY STOPPED: SAFETY MODE ACTIVE</span>
          </div>
        )}

        {/* Manual vs Auto Drive Mode Switcher */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl backdrop-blur-md shadow-md text-xs font-bold">
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              manualMode ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>MANUAL CONTROL</span>
          </button>
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              !manualMode ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>AUTO SENSORS</span>
          </button>
        </div>
      </div>

      {/* Middle Floating Keyboard Hints (Only in Manual Mode) */}
      {manualMode && safetyMode === 'NORMAL' && (
        <div className="relative z-10 pointer-events-none text-[10px] bg-slate-900/85 text-slate-200 border border-slate-700/80 px-3 py-1 rounded-full backdrop-blur-md font-mono flex items-center gap-2 shadow-xs">
          <span className="text-sky-400 font-bold">KEYBOARD DRIVING:</span>
          <span>[W / ▲ Gas]</span>
          <span>[S / ▼ Brake]</span>
          <span>[A/D or ◄/► Steer]</span>
          <span>[Space Park]</span>
        </div>
      )}

      {/* Bottom Manual Driving Control Dashboard Overlay */}
      <div className="relative z-10 w-full max-w-2xl bg-white/95 border border-slate-200/90 rounded-xl p-3 backdrop-blur-md shadow-md space-y-2 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Active Speed & Heading Telemetry Badge */}
          <div className="flex items-center gap-3 font-bold text-slate-800">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">SPEED:</span>
              <span className="text-xl font-black text-sky-700 font-outfit">{activeSpeed}</span>
              <span className="text-[10px] text-slate-600">km/h</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">HEADING:</span>
              <span className="text-sm font-bold text-slate-900 font-outfit">{activeHeading}°</span>
            </div>
            {manualMode && activeSpeed === 0 && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                safetyMode === 'STOPPED'
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}>
                {safetyMode === 'STOPPED' ? '● SAFELY PARKED ON SHOULDER' : '● VEHICLE STATIONARY'}
              </span>
            )}
          </div>

          {/* Interactive Steering & Pedal Buttons */}
          {manualMode && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={safetyMode === 'PULLING_OVER'}
                onMouseDown={() => { setSteerAngle(-25); setManualHeading((prev) => prev - 5); }}
                onMouseUp={() => setSteerAngle(0)}
                onTouchStart={() => { setSteerAngle(-25); setManualHeading((prev) => prev - 5); }}
                onTouchEnd={() => setSteerAngle(0)}
                onClick={() => setManualHeading((prev) => prev - 5)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-slate-700 flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Steer Left (A / Left Arrow)"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-sky-600" />
                <span>LEFT</span>
              </button>

              <button
                type="button"
                disabled={safetyMode === 'PULLING_OVER'}
                onMouseDown={() => { setSteerAngle(25); setManualHeading((prev) => prev + 5); }}
                onMouseUp={() => setSteerAngle(0)}
                onTouchStart={() => { setSteerAngle(25); setManualHeading((prev) => prev + 5); }}
                onTouchEnd={() => setSteerAngle(0)}
                onClick={() => setManualHeading((prev) => prev + 5)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 font-bold text-slate-700 flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Steer Right (D / Right Arrow)"
              >
                <span>RIGHT</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
              </button>

              <button
                type="button"
                onClick={() => setManualSpeed((prev) => Math.max(0, prev - 10))}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Brake / Slow Down (S / Down Arrow)"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>BRAKE</span>
              </button>

              <button
                type="button"
                disabled={safetyMode !== 'NORMAL' && isEmergencyActive}
                onClick={() => setManualSpeed((prev) => Math.min(130, prev + 10))}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Accelerate / Gas (W / Up Arrow)"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>ACCELERATE</span>
              </button>

              <button
                type="button"
                onClick={() => { setManualSpeed(0); setManualHeading(0); setSteerAngle(0); targetCarXRef.current = 0; }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all cursor-pointer"
                title="Reset Speed & Steering to 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Interactive Manual Speed Slider Bar */}
        {manualMode && (
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 shrink-0">MANUAL ACCELERATOR SLIDER:</span>
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              disabled={safetyMode !== 'NORMAL' && isEmergencyActive}
              value={manualSpeed}
              onChange={(e) => setManualSpeed(Number(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-600 disabled:opacity-50"
            />
            <span className="text-[10px] font-extrabold text-sky-700 shrink-0 min-w-[45px] text-right font-outfit">
              {manualSpeed} KM/H
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cockpit3DVehicleView;
