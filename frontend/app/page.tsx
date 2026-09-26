'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Eye,
  BookOpen,
  Navigation as NavIcon,
  AlertTriangle,
  PhoneCall,
  ArrowRight,
  Shield,
  Activity,
  Cpu,
  Car,
  Volume2,
  VolumeX,
  Compass,
  Radio,
  MapPin
} from 'lucide-react';
import SmartSafetyDemoMap from '@/components/navigation/SmartSafetyDemoMap';
import TrafficRuleQuickDirectory from '@/components/traffic/TrafficRuleQuickDirectory';
import LandingSafetyTelemetry from '@/components/landing/LandingSafetyTelemetry';
import roadAudioAlerts from '@/utils/roadAudioAlerts';
import {
  DEMO_MAP_FEATURES,
  DemoMapFeature,
  calculateDistanceMeters,
  getDemoVehiclePosition,
  isAheadOfVehicle
} from '@/utils/geospatial';

export default function LandingPage() {
  // Manual route progress state (0 to 100%) for Smart Safety Demo Map
  const [routeProgress, setRouteProgress] = useState<number>(0);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);

  // Active 200m Distance-Based Hazard Alert State
  const [activeAdvisory, setActiveAdvisory] = useState<{
    feature: DemoMapFeature;
    distanceMeters: number;
  } | null>(null);

  // Single-Trigger per Hazard Entry
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
  const STEP_PERCENT = 5;

  const handleMoveForward = () => {
    handleEnableAudio();
    setRouteProgress((prev) => Math.min(100, Math.round((prev + STEP_PERCENT) * 10) / 10));
  };

  const handleMoveBackward = () => {
    handleEnableAudio();
    setRouteProgress((prev) => Math.max(0, Math.round((prev - STEP_PERCENT) * 10) / 10));
  };

  const handleProgressChange = (val: number) => {
    handleEnableAudio();
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

      // Trigger warning when distance <= 200m AND vehicle is approaching ahead
      if (isAhead && dist <= 200 && dist > 5) {
        if (dist < minDistance) {
          minDistance = dist;
          currentClosestAdvisory = { feature, distanceMeters: dist };
        }
      } else if (!isAhead || dist > 200) {
        // Allow re-triggering if vehicle leaves 200m radius
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
    <div className="space-y-8 sm:space-y-10 animate-fade-in pb-16 font-sans">
      {/* 1. Hero Section */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 font-mono text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>SAFEWAY.AI PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-outfit leading-tight">
            Intelligent Road Safety & Driver Assistance Platform
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Real-time computer vision, driver fatigue monitoring, Motor Vehicles Act rules directory, geospatial hazard mapping, and V2V emergency mesh.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1 font-mono">
            <Link
              href="/dashboard"
              className="px-6 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/20 transition-all hover:scale-105"
            >
              <span>LAUNCH OPERATIONS DASHBOARD</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/drowsiness"
              className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4 text-sky-600" />
              <span>DRIVER MONITOR</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Main SafeWay.AI Operations Dashboard Layout (Left: Traffic Rules, Center: Smart Safety Demo Map, Right: Safety Telemetry) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit">
              Live Operations & Route Simulation
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Interactive 200m safety radius detection, Motor Vehicles Act directory, and driver perception telemetry.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT COLUMN (3 cols on lg): Compact Traffic Rule Directory */}
          <div className="lg:col-span-3 flex flex-col">
            <TrafficRuleQuickDirectory />
          </div>

          {/* CENTER / MAIN COLUMN (6 cols on lg): SMART SAFETY DEMO MAP */}
          <div className="lg:col-span-6 flex flex-col">
            <SmartSafetyDemoMap
              routeProgress={routeProgress}
              onProgressChange={handleProgressChange}
              onMoveForward={handleMoveForward}
              onMoveBackward={handleMoveBackward}
              onReset={handleReset}
              isSoundOn={isSoundOn}
              onToggleSound={toggleSound}
              activeAdvisory={activeAdvisory}
            />
          </div>

          {/* RIGHT COLUMN (3 cols on lg): Live Safety Telemetry & Monitoring Suite */}
          <div className="lg:col-span-3 flex flex-col">
            <LandingSafetyTelemetry />
          </div>
        </div>
      </section>

      {/* 3. Primary Feature Showcase Grid */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between border-t border-slate-200 pt-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit">
              Platform Safety Modules
            </h2>
            <p className="text-xs text-slate-500">
              Select a module below to launch live perception or management tools.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Operations Dashboard Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center font-bold">
                <Car className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Operations Dashboard</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Central HMI telemetry cockpit featuring 3D vehicle canvas, speed advisories, camera feed, and V2V mesh.
              </p>
            </div>
            <Link href="/dashboard" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Drowsiness Monitor Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Drowsiness Monitor</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Computer vision landmark tracking computing Eye Aspect Ratio (EAR) and eye closure alerts.
              </p>
            </div>
            <Link href="/drowsiness" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <span>Launch Monitor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Traffic Rules Directory Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Traffic Rules Directory</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Government-verified Motor Vehicles Act rules, state-wise penalty fines, and speed guidelines.
              </p>
            </div>
            <Link href="/traffic-rules" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>Explore Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Smart Navigation Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <NavIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Smart Navigation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                3D route guidance overlaid with real-time hazard markers and dynamic speed limit advisories.
              </p>
            </div>
            <Link href="/navigation" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              <span>Start Navigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Road Hazards Map Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Road Hazards Map</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Crowdsourced hazard reporting network mapping potholes, accidents, and low visibility zones.
              </p>
            </div>
            <Link href="/hazards" className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              <span>View Hazard Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Emergency SOS Card */}
          <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-rose-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-outfit">Emergency SOS</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated crash impact detection dispatching live GPS coordinates to contacts & emergency services.
              </p>
            </div>
            <Link href="/emergency" className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
              <span>Configure SOS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
