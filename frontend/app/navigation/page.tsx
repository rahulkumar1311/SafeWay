'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation as NavIcon,
  MapPin,
  Play,
  Square,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldCheck,
  RotateCcw,
  School,
  Info,
  Car
} from 'lucide-react';
import JioMapContainer from '@/components/navigation/JioMapContainer';
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
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedProgress, setSimulatedProgress] = useState<number>(0);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);

  // Active 200m Distance-Based Hazard Alert State
  const [activeAdvisory, setActiveAdvisory] = useState<{
    feature: DemoMapFeature;
    distanceMeters: number;
  } | null>(null);

  // Single-Trigger per Hazard Pass Tracking
  const triggeredHazardSetRef = useRef<Set<string>>(new Set());
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Enable AudioContext on first user interaction for browser autoplay compliance
  const handleEnableAudio = () => {
    roadAudioAlerts.init();
    if (roadAudioAlerts.getMutedStatus() !== !isSoundOn) {
      // Keep engine in sync
      if (!isSoundOn && !roadAudioAlerts.getMutedStatus()) {
        roadAudioAlerts.toggleMute();
      }
    }
  };

  const toggleSound = () => {
    handleEnableAudio();
    const muted = roadAudioAlerts.toggleMute();
    setIsSoundOn(!muted);
  };

  const startSimulation = () => {
    handleEnableAudio();
    triggeredHazardSetRef.current.clear();
    setActiveAdvisory(null);
    setSimulatedProgress(0);
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    setActiveAdvisory(null);
  };

  const resetSimulation = () => {
    stopSimulation();
    startSimulation();
  };

  // Compute current vehicle position based on simulation progress
  const vehiclePos = getDemoVehiclePosition(simulatedProgress);

  // Route Simulation Ticker & 200m Distance Alert Engine
  useEffect(() => {
    if (isSimulating) {
      simulationIntervalRef.current = setInterval(() => {
        setSimulatedProgress((prev) => {
          if (prev >= 100) {
            stopSimulation();
            return 100;
          }
          return prev + 0.8; // Smooth 0.8% movement step
        });
      }, 300);
    }

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isSimulating]);

  // Distance-Based 200m Safety Point Evaluation
  useEffect(() => {
    if (!isSimulating) return;

    let currentClosestAdvisory: { feature: DemoMapFeature; distanceMeters: number } | null = null;

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

      // Trigger pre-warning when distance <= 200m AND vehicle is approaching (dist > 0)
      if (isAhead && dist <= 200 && dist > 5) {
        currentClosestAdvisory = { feature, distanceMeters: dist };

        // Single-Trigger Guard: Trigger voice/sound alert ONCE per hazard pass
        if (!triggeredHazardSetRef.current.has(feature.id)) {
          triggeredHazardSetRef.current.add(feature.id);

          if (isSoundOn) {
            roadAudioAlerts.playAlert('WARNING');
            roadAudioAlerts.playHazardVoiceAlert(feature.alertTitle, feature.voicePrompt);
          }
        }
        break;
      }
    }

    setActiveAdvisory(currentClosestAdvisory);
  }, [simulatedProgress, isSimulating, vehiclePos, isSoundOn]);

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
            Turn-by-turn route navigation with 200m distance-based safety warnings and voice advisories.
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

      {/* Destination & Simulation Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 font-mono">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <MapPin className="w-4 h-4 text-sky-600 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:bg-white focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {!isSimulating ? (
              <button
                onClick={startSimulation}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START ROUTE SIMULATION</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={stopSimulation}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>STOP</span>
                </button>
                <button
                  onClick={resetSimulation}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Route Simulation Progress Bar */}
        {isSimulating && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold">
                <Car className="w-3.5 h-3.5 text-sky-600" />
                <span>DEMO VEHICLE EN ROUTE</span>
              </span>
              <span className="font-bold text-sky-700">{Math.round(simulatedProgress)}% COMPLETED</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-sky-600 transition-all duration-300"
                style={{ width: `${simulatedProgress}%` }}
              />
            </div>
          </div>
        )}
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
