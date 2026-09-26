'use client';

import React, { useEffect, useState, useId, useMemo, useRef, useCallback } from 'react';
import {
  Car,
  School,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Flag,
  ShieldCheck,
  Navigation,
  Compass,
  Volume2,
  VolumeX,
  Volume1,
  Sparkles
} from 'lucide-react';
import {
  DEMO_ROUTE_POINTS,
  DEMO_MAP_FEATURES,
  DemoMapFeature,
  calculateDistanceMeters,
  getDemoVehiclePosition,
  isAheadOfVehicle
} from '@/utils/geospatial';
import roadAudioAlerts from '@/utils/roadAudioAlerts';

interface SmartSafetyDemoMapProps {
  routeProgress?: number;
  onProgressChange?: (progress: number) => void;
  onMoveForward?: () => void;
  onMoveBackward?: () => void;
  onReset?: () => void;
  isSoundOn?: boolean;
  onToggleSound?: () => void;
  activeAdvisory?: {
    feature: DemoMapFeature;
    distanceMeters: number;
  } | null;
  compact?: boolean;
}

export const SmartSafetyDemoMap: React.FC<SmartSafetyDemoMapProps> = ({
  routeProgress: externalProgress,
  onProgressChange: externalProgressChange,
  onMoveForward: externalMoveForward,
  onMoveBackward: externalMoveBackward,
  onReset: externalReset,
  isSoundOn: externalSoundOn,
  onToggleSound: externalToggleSound,
  activeAdvisory: externalAdvisory,
  compact = false
}) => {
  // Self-contained internal state if props are not passed
  const [internalProgress, setInternalProgress] = useState<number>(0);
  const [internalSoundOn, setInternalSoundOn] = useState<boolean>(true);
  const [internalAdvisory, setInternalAdvisory] = useState<{
    feature: DemoMapFeature;
    distanceMeters: number;
  } | null>(null);

  const isControlled = externalProgress !== undefined;
  const routeProgress = isControlled ? externalProgress : internalProgress;
  const isSoundOn = externalSoundOn !== undefined ? externalSoundOn : internalSoundOn;

  // Single-Trigger per Hazard Pass Tracking
  const triggeredHazardSetRef = useRef<Set<string>>(new Set());

  const [mapModules, setMapModules] = useState<{
    MapContainer: any;
    TileLayer: any;
    Marker: any;
    Popup: any;
    Polyline: any;
    Circle: any;
    L: any;
  } | null>(null);

  const containerId = useId();

  // Enable AudioContext on first user interaction for browser autoplay compliance
  const handleEnableAudio = useCallback(() => {
    roadAudioAlerts.init();
  }, []);

  const handleToggleSound = () => {
    handleEnableAudio();
    if (externalToggleSound) {
      externalToggleSound();
    } else {
      const muted = roadAudioAlerts.toggleMute();
      setInternalSoundOn(!muted);
    }
  };

  const handleProgressChange = (val: number) => {
    handleEnableAudio();
    const clamped = Math.max(0, Math.min(100, val));
    if (externalProgressChange) {
      externalProgressChange(clamped);
    } else {
      setInternalProgress(clamped);
    }
  };

  const STEP_PERCENT = 5; // 5% per manual step
  const handleMoveForward = () => {
    handleEnableAudio();
    if (externalMoveForward) {
      externalMoveForward();
    } else {
      setInternalProgress((prev) => Math.min(100, Math.round((prev + STEP_PERCENT) * 10) / 10));
    }
  };

  const handleMoveBackward = () => {
    handleEnableAudio();
    if (externalMoveBackward) {
      externalMoveBackward();
    } else {
      setInternalProgress((prev) => Math.max(0, Math.round((prev - STEP_PERCENT) * 10) / 10));
    }
  };

  const handleReset = () => {
    if (externalReset) {
      externalReset();
    } else {
      setInternalProgress(0);
      setInternalAdvisory(null);
      triggeredHazardSetRef.current.clear();
    }
  };

  useEffect(() => {
    let isMounted = true;
    try {
      const RL = require('react-leaflet');
      const Leaflet = require('leaflet');

      if (Leaflet.Icon.Default.prototype._getIconUrl) {
        delete Leaflet.Icon.Default.prototype._getIconUrl;
      }
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
      });

      if (isMounted) {
        setMapModules({
          MapContainer: RL.MapContainer,
          TileLayer: RL.TileLayer,
          Marker: RL.Marker,
          Popup: RL.Popup,
          Polyline: RL.Polyline,
          Circle: RL.Circle,
          L: Leaflet
        });
      }
    } catch (err) {
      console.error('[SmartSafetyDemoMap] Leaflet initialization error:', err);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const vehiclePos = useMemo(() => getDemoVehiclePosition(routeProgress), [routeProgress]);

  // Calculate live distances to key demo landmarks
  const schoolFeature = DEMO_MAP_FEATURES.find((f) => f.type === 'school');
  const zebraFeature = DEMO_MAP_FEATURES.find((f) => f.type === 'zebra_crossing');

  const distToSchool = schoolFeature
    ? calculateDistanceMeters(vehiclePos.latitude, vehiclePos.longitude, schoolFeature.latitude, schoolFeature.longitude)
    : 0;

  const distToZebra = zebraFeature
    ? calculateDistanceMeters(vehiclePos.latitude, vehiclePos.longitude, zebraFeature.latitude, zebraFeature.longitude)
    : 0;

  const isSchoolWarningActive = distToSchool <= 200 && distToSchool > 5;
  const isZebraWarningActive = distToZebra <= 200 && distToZebra > 5;

  // Real 200m Proximity Evaluation & Alert Priority if not provided externally
  useEffect(() => {
    if (isControlled && externalAdvisory !== undefined) {
      return;
    }

    let currentClosestAdvisory: { feature: DemoMapFeature; distanceMeters: number } | null = null;
    let minDistance = Infinity;

    for (const feature of DEMO_MAP_FEATURES) {
      const dist = calculateDistanceMeters(
        vehiclePos.latitude,
        vehiclePos.longitude,
        feature.latitude,
        feature.longitude
      );

      const isAhead = isAheadOfVehicle(
        vehiclePos.latitude,
        vehiclePos.longitude,
        vehiclePos.heading,
        feature.latitude,
        feature.longitude,
        60
      );

      // Trigger warning when distance <= 200m AND vehicle is approaching ahead
      if (isAhead && dist <= 200 && dist > 5) {
        if (dist < minDistance) {
          minDistance = dist;
          currentClosestAdvisory = { feature, distanceMeters: dist };
        }
      } else if (!isAhead || dist > 200) {
        if (dist > 250) {
          triggeredHazardSetRef.current.delete(feature.id);
        }
      }
    }

    if (currentClosestAdvisory) {
      const featureId = currentClosestAdvisory.feature.id;
      if (!triggeredHazardSetRef.current.has(featureId)) {
        triggeredHazardSetRef.current.add(featureId);

        if (isSoundOn) {
          roadAudioAlerts.playAlert('WARNING');
          roadAudioAlerts.playHazardVoiceAlert(
            currentClosestAdvisory.feature.alertTitle,
            currentClosestAdvisory.feature.voicePrompt
          );
        }
      }
    }

    setInternalAdvisory(currentClosestAdvisory);
  }, [routeProgress, vehiclePos, isSoundOn, isControlled, externalAdvisory]);

  const activeAdvisory = externalAdvisory !== undefined ? externalAdvisory : internalAdvisory;

  if (!mapModules) {
    return (
      <div className="h-[440px] w-full rounded-3xl bg-[#FFFAF0] border border-slate-200 flex items-center justify-center text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span>Initializing Smart Safety Demo Map...</span>
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, L } = mapModules;

  // Custom Div Icons for high visual clarity
  const carIcon = L.divIcon({
    html: `
      <div style="transform: rotate(${vehiclePos.heading}deg); transition: transform 0.2s ease-out;" class="relative flex items-center justify-center cursor-pointer">
        <div class="w-10 h-10 rounded-full bg-sky-500/25 border-2 border-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/40 bg-white">
          <span style="font-size: 20px; line-height: 1;">🚗</span>
        </div>
        <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sky-500 border-2 border-white animate-ping"></div>
      </div>
    `,
    className: 'demo-vehicle-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const schoolIcon = L.divIcon({
    html: `
      <div class="flex flex-col items-center">
        <div class="w-9 h-9 rounded-2xl bg-amber-50 border-2 border-amber-500 text-amber-700 flex items-center justify-center shadow-md font-bold text-base">
          🏫
        </div>
        <div class="px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black font-mono shadow-xs mt-0.5 whitespace-nowrap">
          SCHOOL 200m
        </div>
      </div>
    `,
    className: 'school-hazard-icon',
    iconSize: [60, 50],
    iconAnchor: [30, 25]
  });

  const zebraIcon = L.divIcon({
    html: `
      <div class="flex flex-col items-center">
        <div class="w-9 h-9 rounded-2xl bg-rose-50 border-2 border-rose-500 text-rose-700 flex items-center justify-center shadow-md font-bold text-base">
          🚸
        </div>
        <div class="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black font-mono shadow-xs mt-0.5 whitespace-nowrap">
          CROSSWALK 200m
        </div>
      </div>
    `,
    className: 'zebra-hazard-icon',
    iconSize: [60, 50],
    iconAnchor: [30, 25]
  });

  const startIcon = L.divIcon({
    html: `
      <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs shadow-md font-bold">
        📍
      </div>
    `,
    className: 'start-point-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const endIcon = L.divIcon({
    html: `
      <div class="w-8 h-8 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white text-xs shadow-md font-bold">
        🏁
      </div>
    `,
    className: 'end-point-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  // Map center between route endpoints
  const centerPos: [number, number] = [25.5975, 85.1410];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5 font-mono">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Visual Route Simulation</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit uppercase tracking-tight">
            SMART SAFETY DEMO MAP
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed">
            Visual route simulation with 200m safety radius warning zones around upcoming school and pedestrian crossings.
          </p>
        </div>

        {/* Live Distance Badges & Sound Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span
            className={`px-3.5 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
              isSchoolWarningActive
                ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-400/40 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span>🏫 School:</span>
            <strong className={`font-black ${isSchoolWarningActive ? 'text-amber-900' : 'text-slate-900'}`}>
              {distToSchool}m
            </strong>
            {isSchoolWarningActive && (
              <span className="text-[9px] uppercase font-black bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                200m ALERT
              </span>
            )}
          </span>

          <span
            className={`px-3.5 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
              isZebraWarningActive
                ? 'bg-rose-100 border-rose-400 text-rose-950 ring-2 ring-rose-400/40 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span>🚸 Crosswalk:</span>
            <strong className={`font-black ${isZebraWarningActive ? 'text-rose-900' : 'text-slate-900'}`}>
              {distToZebra}m
            </strong>
            {isZebraWarningActive && (
              <span className="text-[9px] uppercase font-black bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-2xs">
                200m ALERT
              </span>
            )}
          </span>

          {/* Sound Mute/Unmute Quick Button */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border font-bold text-xs flex items-center transition-all cursor-pointer shadow-2xs ${
              isSoundOn
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
            }`}
            title={isSoundOn ? 'Voice & Audio Alerts ON' : 'Audio Muted'}
          >
            {isSoundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Prominent Active 200m Proximity Alert Banner */}
      {activeAdvisory && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-md shadow-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-6 h-6 fill-white text-amber-600" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black uppercase font-outfit text-amber-950">
                  {activeAdvisory.feature.alertTitle}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200/80 border border-amber-300 text-[10px] font-black text-amber-900 uppercase">
                  Active 200m Warning Zone
                </span>
              </div>
              <p className="text-xs font-sans text-amber-900 font-medium leading-relaxed">
                {activeAdvisory.feature.alertMessage}
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-amber-600 text-white rounded-xl font-mono text-xs font-black shrink-0 shadow-xs flex items-center gap-1.5 self-start sm:self-center">
            <span>{activeAdvisory.distanceMeters}m</span>
            <span className="text-[10px] opacity-80 uppercase font-sans">REMAINING</span>
          </div>
        </div>
      )}

      {/* Visual Leaflet Demo Map Container */}
      <div className="relative h-[360px] sm:h-[400px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
        <MapContainer
          key={containerId}
          center={centerPos}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Planned Demo Route Polyline */}
          <Polyline
            positions={DEMO_ROUTE_POINTS}
            pathOptions={{
              color: '#0284c7',
              weight: 6,
              opacity: 0.7,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />

          {/* 200m Safety Warning Radius Circle around School */}
          {schoolFeature && (
            <Circle
              center={[schoolFeature.latitude, schoolFeature.longitude]}
              radius={200}
              pathOptions={{
                color: '#f59e0b',
                fillColor: isSchoolWarningActive ? '#f59e0b' : '#fef3c7',
                fillOpacity: isSchoolWarningActive ? 0.35 : 0.15,
                weight: isSchoolWarningActive ? 3 : 1.5,
                dashArray: isSchoolWarningActive ? undefined : '5, 8'
              }}
            >
              <Popup>
                <div className="text-xs font-mono p-1">
                  <strong className="text-amber-700 block uppercase font-bold">🏫 School 200m Warning Zone</strong>
                  <div>Radius: 200m</div>
                  <div>Advisory Speed: 25 km/h</div>
                </div>
              </Popup>
            </Circle>
          )}

          {/* 200m Safety Warning Radius Circle around Zebra Crossing */}
          {zebraFeature && (
            <Circle
              center={[zebraFeature.latitude, zebraFeature.longitude]}
              radius={200}
              pathOptions={{
                color: '#ef4444',
                fillColor: isZebraWarningActive ? '#ef4444' : '#fee2e2',
                fillOpacity: isZebraWarningActive ? 0.35 : 0.15,
                weight: isZebraWarningActive ? 3 : 1.5,
                dashArray: isZebraWarningActive ? undefined : '5, 8'
              }}
            >
              <Popup>
                <div className="text-xs font-mono p-1">
                  <strong className="text-rose-700 block uppercase font-bold">🚸 Zebra Crossing 200m Warning Zone</strong>
                  <div>Radius: 200m</div>
                  <div>Advisory Speed: 20 km/h</div>
                </div>
              </Popup>
            </Circle>
          )}

          {/* Start Point Marker */}
          <Marker position={DEMO_ROUTE_POINTS[0]} icon={startIcon}>
            <Popup>
              <div className="text-xs font-mono p-1">
                <strong className="text-emerald-700 block font-bold">📍 Route Start Point</strong>
                <div>Gandhi Maidan, Patna</div>
              </div>
            </Popup>
          </Marker>

          {/* School Zone Marker */}
          {schoolFeature && (
            <Marker position={[schoolFeature.latitude, schoolFeature.longitude]} icon={schoolIcon}>
              <Popup>
                <div className="text-xs font-mono p-1 space-y-0.5">
                  <strong className="text-amber-800 block uppercase font-bold">🏫 {schoolFeature.name}</strong>
                  <div>Warning Distance: 200m</div>
                  <div>Speed Limit: {schoolFeature.advisorySpeedKmH} km/h</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Zebra Crossing Marker */}
          {zebraFeature && (
            <Marker position={[zebraFeature.latitude, zebraFeature.longitude]} icon={zebraIcon}>
              <Popup>
                <div className="text-xs font-mono p-1 space-y-0.5">
                  <strong className="text-rose-800 block uppercase font-bold">🚸 {zebraFeature.name}</strong>
                  <div>Warning Distance: 200m</div>
                  <div>Speed Limit: {zebraFeature.advisorySpeedKmH} km/h</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Destination Point Marker */}
          <Marker position={DEMO_ROUTE_POINTS[DEMO_ROUTE_POINTS.length - 1]} icon={endIcon}>
            <Popup>
              <div className="text-xs font-mono p-1">
                <strong className="text-purple-700 block font-bold">🏁 Destination Point</strong>
                <div>Patna Junction Railway Station</div>
              </div>
            </Popup>
          </Marker>

          {/* Live Dynamic Vehicle Marker (Moved by User Manual Controls) */}
          <Marker position={[vehiclePos.latitude, vehiclePos.longitude]} icon={carIcon}>
            <Popup>
              <div className="text-xs font-mono p-1 space-y-1">
                <strong className="text-sky-700 font-bold block uppercase">🚗 Live Demo Vehicle</strong>
                <div>Progress: {Math.round(routeProgress)}%</div>
                <div>Lat: {vehiclePos.latitude.toFixed(5)}</div>
                <div>Lng: {vehiclePos.longitude.toFixed(5)}</div>
                <div>Heading: {vehiclePos.heading}°</div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Legend Overlay */}
        <div className="absolute top-3 right-3 z-[1000] p-2.5 rounded-xl bg-white/95 border border-slate-200/80 shadow-md backdrop-blur-xs text-[10px] space-y-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-700 font-bold">🚗 Demo Vehicle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700">🏫 School (200m Zone)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-700">🚸 Crosswalk (200m Zone)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <span className="text-slate-700">🏁 Destination</span>
          </div>
        </div>
      </div>

      {/* Manual Vehicle Movement Controls: [← Move Back] [Slider] [Forward →] [Reset] */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-sky-600" />
            <span>MANUAL VEHICLE POSITION CONTROLS</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="font-bold text-sky-700 font-mono">{Math.round(routeProgress)}% COMPLETED</span>
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="Reset vehicle to 0%"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          </div>
        </div>

        {/* Step Buttons & Interactive Slider */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleMoveBackward}
            disabled={routeProgress <= 0}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              routeProgress <= 0
                ? 'bg-slate-200/60 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-xs'
            }`}
            title="Move Vehicle Backward by 1 Step"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>← Move Back</span>
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={routeProgress}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 outline-none shadow-inner"
              aria-label="Manual Route Progress Slider"
            />
          </div>

          <button
            type="button"
            onClick={handleMoveForward}
            disabled={routeProgress >= 100}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              routeProgress >= 100
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
            }`}
            title="Move Vehicle Forward by 1 Step"
          >
            <span>Forward →</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Waypoint Progression Bar */}
        <div className="grid grid-cols-4 gap-2 pt-1 text-[10px] text-center font-mono">
          <div className={`p-1.5 rounded-lg border transition-all ${routeProgress <= 15 ? 'bg-sky-50 border-sky-300 text-sky-800 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
            📍 START (0%)
          </div>
          <div className={`p-1.5 rounded-lg border transition-all ${routeProgress > 15 && routeProgress <= 55 ? 'bg-amber-50 border-amber-300 text-amber-800 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-500'}`}>
            🏫 SCHOOL (35%)
          </div>
          <div className={`p-1.5 rounded-lg border transition-all ${routeProgress > 55 && routeProgress <= 85 ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-xs' : 'bg-white border-slate-200 text-slate-500'}`}>
            🚸 CROSSWALK (65%)
          </div>
          <div className={`p-1.5 rounded-lg border transition-all ${routeProgress > 85 ? 'bg-purple-50 border-purple-300 text-purple-800 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}>
            🏁 DESTINATION (100%)
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartSafetyDemoMap;
