'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Navigation as NavIcon,
  MapPin,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldCheck,
  RotateCcw,
  Car,
  ChevronLeft,
  ChevronRight,
  Square
} from 'lucide-react';
import JioMapContainer from '@/components/navigation/JioMapContainer';
import SmartSafetyDemoMap from '@/components/navigation/SmartSafetyDemoMap';
import roadAudioAlerts from '@/utils/roadAudioAlerts';
import {
  DEMO_MAP_FEATURES,
  DemoMapFeature,
  calculateDistanceMeters,
  getDemoVehiclePosition,
  isAheadOfVehicle
} from '@/utils/geospatial';

export default function NavigationPage() {
  const [destination, setDestination] = useState<string>('Patna Junction Railway Station');
  const [routeProgress, setRouteProgress] = useState<number>(0);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);

  // Active 200m Distance-Based Hazard Alert State
  const [activeAdvisory, setActiveAdvisory] = useState<{
    feature: DemoMapFeature;
    distanceMeters: number;
  } | null>(null);

  // Single-Trigger per Hazard Pass Tracking
  const triggeredHazardSetRef = useRef<Set<string>>(new Set());

  // Enable AudioContext on first user interaction for browser autoplay compliance
  const handleEnableAudio = useCallback(() => {
    roadAudioAlerts.init();
    if (roadAudioAlerts.getMutedStatus() !== !isSoundOn) {
      if (!isSoundOn && !roadAudioAlerts.getMutedStatus()) {
        roadAudioAlerts.toggleMute();
      }
    }
  }, [isSoundOn]);

  const toggleSound = () => {
    handleEnableAudio();
    const muted = roadAudioAlerts.toggleMute();
    setIsSoundOn(!muted);
  };

  // Manual Step Controls (One click = Exactly one route step)
  const STEP_PERCENT = 5; // 5% per manual step for smooth waypoint progression

  const handleMoveForward = () => {
    handleEnableAudio();
    setRouteProgress((prev) => Math.min(100, Math.round((prev + STEP_PERCENT) * 10) / 10));
  };

  const handleMoveBackward = () => {
    handleEnableAudio();
    setRouteProgress((prev) => Math.max(0, Math.round((prev - STEP_PERCENT) * 10) / 10));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleEnableAudio();
    const val = Number(e.target.value);
    setRouteProgress(Math.max(0, Math.min(100, val)));
  };

  const handleReset = () => {
    setRouteProgress(0);
    setActiveAdvisory(null);
    triggeredHazardSetRef.current.clear();
  };

  // Compute current vehicle position based on manual route progress
  const vehiclePos = getDemoVehiclePosition(routeProgress);

  // Distance-Based 200m Safety Point Evaluation with Closest Priority
  useEffect(() => {
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

      // Trigger pre-warning when distance <= 200m AND vehicle is approaching ahead
      if (isAhead && dist <= 200 && dist > 5) {
        if (dist < minDistance) {
          minDistance = dist;
          currentClosestAdvisory = { feature, distanceMeters: dist };
        }
      } else if (!isAhead || dist > 200) {
        // If vehicle has moved away from the 200m warning zone, allow re-triggering when re-entering
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

    setActiveAdvisory(currentClosestAdvisory);
  }, [routeProgress, vehiclePos, isSoundOn]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <NavIcon className="w-4 h-4" />
            <span>3D Geospatial Route Guidance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit">
            Smart 3D Navigation & Route Advisory
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Manual driving simulator with 200m distance-based safety warnings and voice advisories.
          </p>
        </div>

        {/* Sound ON/OFF Toggle Button */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              isSoundOn
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
            title="Toggle Sound Alerts"
          >
            {isSoundOn ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>🔊 Sound ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>🔇 Sound OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Destination & Manual Navigation Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 font-mono">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="lg:col-span-2 relative">
            <MapPin className="w-4 h-4 text-sky-600 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white focus:border-sky-500 outline-none transition-all"
            />
          </div>

          {/* Manual Step Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMoveBackward}
              disabled={routeProgress <= 0}
              className={`w-1/2 py-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                routeProgress <= 0
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
              }`}
              title="Move Back One Step"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>← Move Back</span>
            </button>

            <button
              type="button"
              onClick={handleMoveForward}
              disabled={routeProgress >= 100}
              className={`w-1/2 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                routeProgress >= 100
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
              }`}
              title="Move Forward One Step"
            >
              <span>Forward →</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Manual Route Progress Slider Control */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-bold">
              <Car className="w-3.5 h-3.5 text-sky-600" />
              <span>DEMO VEHICLE MANUAL POSITION</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sky-700">{Math.round(routeProgress)}% COMPLETED</span>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                title="Reset to 0%"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMoveBackward}
              disabled={routeProgress <= 0}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
              title="Step backward"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={routeProgress}
                onChange={handleSliderChange}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600 outline-none"
                aria-label="Route Progress Slider"
              />
            </div>

            <button
              type="button"
              onClick={handleMoveForward}
              disabled={routeProgress >= 100}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
              title="Step forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Prominent 200m Distance-Based Safety Advisory Card */}
      {activeAdvisory && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm space-y-2 animate-fade-in font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="text-sm font-black uppercase font-outfit">
                {activeAdvisory.feature.alertTitle}
              </span>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-200/80 text-amber-900 border border-amber-300">
              {activeAdvisory.distanceMeters}m AHEAD
            </span>
          </div>
          <p className="text-xs font-sans text-amber-800 font-semibold leading-relaxed">
            {activeAdvisory.feature.alertMessage}
          </p>
        </div>
      )}

      {/* Main 3D Map Container */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 font-mono">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
            <span>JIO 3D MAP & ROUTE SIMULATOR</span>
          </div>
          <span className="text-slate-500 font-bold">Patna, Bihar Region</span>
        </div>

        <JioMapContainer
          userLocation={{
            latitude: vehiclePos.latitude,
            longitude: vehiclePos.longitude,
            address: 'Patna Route'
          }}
          destination={{
            latitude: 25.6010,
            longitude: 85.1445,
            title: destination
          }}
          hazards={[]}
        />
      </div>

      {/* Interactive SMART SAFETY DEMO MAP Section */}
      <SmartSafetyDemoMap
        routeProgress={routeProgress}
        onProgressChange={(p) => setRouteProgress(p)}
        onMoveForward={handleMoveForward}
        onMoveBackward={handleMoveBackward}
        onReset={handleReset}
        isSoundOn={isSoundOn}
        activeAdvisory={activeAdvisory}
      />

      {/* Driver Advisory Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3 font-sans">
        <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          <strong>SafeWay.AI Safety Disclaimer:</strong> SafeWay.AI provides real-time driver safety advisories and road warnings. The platform does not control vehicle steering, brakes, accelerator, or ECU systems. Drivers remain responsible for vehicle control.
        </p>
      </div>
    </div>
  );
}
