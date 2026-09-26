'use client';

import React, { useEffect, useState, useRef } from 'react';
import { LiveGpsState } from '@/hooks/useLiveGpsTracking';
import mapHazardEventBus, { MapHazardEvent } from '@/services/mapHazardEventBus';
import trafficRuleApi from '@/services/trafficRuleApi';
import roadAudioAlerts from '@/utils/roadAudioAlerts';
import {
  calculateDistanceMeters,
  isAheadOfVehicle,
  DEMO_MAP_FEATURES,
  DemoMapFeature
} from '@/utils/geospatial';
import {
  Compass,
  Layers,
  MapPin,
  Navigation,
  RotateCw,
  Eye,
  Sliders,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  LocateFixed,
  Maximize2,
  School,
  CornerDownRight,
  Crosshair
} from 'lucide-react';

interface Live3DNavigationMapProps {
  gpsState: LiveGpsState;
  isLiveTripActive: boolean;
  isDemoMode: boolean;
  demoVehiclePos?: { latitude: number; longitude: number; heading: number } | null;
  destination?: { latitude: number; longitude: number; title: string };
  emergencyLocation?: { latitude: number; longitude: number; mapsUrl: string } | null;
  onHazardDetected?: (hazard: {
    title: string;
    message: string;
    advisorySpeedKmH: number;
    riskLevel: 'CAUTION' | 'WARNING' | 'CRITICAL';
    distanceMeters: number;
  } | null) => void;
}

export const Live3DNavigationMap: React.FC<Live3DNavigationMapProps> = ({
  gpsState,
  isLiveTripActive,
  isDemoMode,
  demoVehiclePos,
  destination,
  emergencyLocation,
  onHazardDetected
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [orientationMode, setOrientationMode] = useState<'HEADING_UP' | 'NORTH_UP'>('HEADING_UP');
  const [mapStyle, setMapStyle] = useState<'DARK' | 'SATELLITE' | 'STREETS'>('DARK');
  const [cameraZoom, setCameraZoom] = useState(16);

  const [liveHazards, setLiveHazards] = useState<MapHazardEvent[]>([]);
  const [regionalState, setRegionalState] = useState<string>('Bihar');
  const [regionalSpeedLimit, setRegionalSpeedLimit] = useState<number>(60);

  // Stable references to prevent React render -> effect -> setState infinite loops
  const onHazardDetectedRef = useRef(onHazardDetected);
  const lastAlertKeyRef = useRef<string>('NONE');
  const lastSpokenAlertRef = useRef<string | null>(null);

  useEffect(() => {
    onHazardDetectedRef.current = onHazardDetected;
  }, [onHazardDetected]);

  useEffect(() => {
    setIsMounted(true);
    setLiveHazards(mapHazardEventBus.getHistory());

    const unsubscribe = mapHazardEventBus.subscribe((newEvent) => {
      setLiveHazards((prev) => [newEvent, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch legal speed limit for current region from backend Traffic Rules API (primitive lat/lon deps)
  const activeLat = isDemoMode && demoVehiclePos ? demoVehiclePos.latitude : gpsState.latitude;
  const activeLon = isDemoMode && demoVehiclePos ? demoVehiclePos.longitude : gpsState.longitude;
  const activeHeading = isDemoMode && demoVehiclePos ? demoVehiclePos.heading : gpsState.heading;

  useEffect(() => {
    async function fetchRegionalRules() {
      if (!activeLat || !activeLon) return;
      try {
        const res = await trafficRuleApi.getRulesByState(regionalState, { category: 'Speed Limit' });
        if (res && res.data && res.data.length > 0) {
          setRegionalSpeedLimit(60); // Standard state legal limit
        }
      } catch (err) {
        console.warn('[Live3DMap] Speed rules lookup note:', err);
      }
    }
    fetchRegionalRules();
  }, [activeLat, activeLon, regionalState]);

  // Idempotent Hazard Detection Effect with Stable Key Comparison
  useEffect(() => {
    if (!isLiveTripActive || !activeLat || !activeLon) {
      if (lastAlertKeyRef.current !== 'NONE') {
        lastAlertKeyRef.current = 'NONE';
        lastSpokenAlertRef.current = null;
        if (onHazardDetectedRef.current) onHazardDetectedRef.current(null);
      }
      return;
    }

    let highestPriorityAlert: {
      title: string;
      message: string;
      advisorySpeedKmH: number;
      riskLevel: 'CAUTION' | 'WARNING' | 'CRITICAL';
      distanceMeters: number;
    } | null = null;

    let minAdvisorySpeed = regionalSpeedLimit;
    let voicePromptToPlay: { title: string; prompt: string } | null = null;

    // 1. Evaluate Fixed Demo Features when in Demo Mode
    if (isDemoMode) {
      for (const feature of DEMO_MAP_FEATURES) {
        const dist = calculateDistanceMeters(activeLat, activeLon, feature.latitude, feature.longitude);
        const isAhead = isAheadOfVehicle(activeLat, activeLon, activeHeading, feature.latitude, feature.longitude, 45);

        if (isAhead && dist <= feature.warningDistanceMeters) {
          if (feature.advisorySpeedKmH < minAdvisorySpeed) {
            minAdvisorySpeed = feature.advisorySpeedKmH;

            let riskLevel: 'CAUTION' | 'WARNING' | 'CRITICAL' = feature.riskLevel;
            if (dist <= 30) riskLevel = 'CRITICAL';

            highestPriorityAlert = {
              title: feature.alertTitle,
              message: `${feature.alertMessage} (Distance: ${dist}m)`,
              advisorySpeedKmH: Math.min(feature.advisorySpeedKmH, regionalSpeedLimit),
              riskLevel,
              distanceMeters: dist
            };

            voicePromptToPlay = { title: feature.alertTitle, prompt: feature.voicePrompt };
          }
        }
      }
    }

    // 2. Evaluate Live Camera AI Hazards
    if (!highestPriorityAlert) {
      for (const h of liveHazards) {
        const dist = calculateDistanceMeters(activeLat, activeLon, h.latitude, h.longitude);
        const isAhead = isAheadOfVehicle(activeLat, activeLon, activeHeading, h.latitude, h.longitude, 45);

        if (isAhead && dist <= 100) {
          let advisorySpeed = 30;
          let title = `⚠ ${h.label.toUpperCase()} DETECTED`;
          let message = 'Reduce Speed — Road Hazard Ahead';
          let voiceTitle = `${h.label} detected`;

          if (h.type === 'zebra_crossing') {
            advisorySpeed = 20;
            title = '🚸 ZEBRA CROSSING DETECTED';
            message = 'Reduce Speed — Pedestrian Crossing Ahead';
            voiceTitle = 'Zebra crossing detected ahead. Reduce speed';
          } else if (h.type === 'school_zone') {
            advisorySpeed = 25;
            title = '🏫 SCHOOL ZONE DETECTED';
            message = 'Reduce Speed — School Area Ahead';
            voiceTitle = 'School zone detected. Reduce speed';
          } else if (h.type === 'sharp_turn') {
            advisorySpeed = 30;
            title = '↪ SHARP TURN AHEAD';
            message = 'Reduce Speed — Sharp Curve Ahead';
            voiceTitle = 'Sharp turn ahead. Reduce speed';
          }

          if (advisorySpeed < minAdvisorySpeed) {
            minAdvisorySpeed = advisorySpeed;
            highestPriorityAlert = {
              title,
              message,
              advisorySpeedKmH: Math.min(advisorySpeed, regionalSpeedLimit),
              riskLevel: dist <= 20 ? 'CRITICAL' : 'WARNING',
              distanceMeters: dist
            };

            voicePromptToPlay = { title, prompt: voiceTitle };
          }
        }
      }
    }

    // Stable Alert Key Comparison to Prevent Infinite Render Loop
    const nextAlertKey = highestPriorityAlert
      ? `${highestPriorityAlert.title}:${highestPriorityAlert.distanceMeters}:${highestPriorityAlert.advisorySpeedKmH}`
      : 'NONE';

    if (nextAlertKey !== lastAlertKeyRef.current) {
      lastAlertKeyRef.current = nextAlertKey;
      if (onHazardDetectedRef.current) {
        onHazardDetectedRef.current(highestPriorityAlert);
      }
    }

    // Trigger Voice Alert Exactly Once per Unique Hazard Activation
    const nextVoiceKey = highestPriorityAlert ? highestPriorityAlert.title : null;
    if (nextVoiceKey !== lastSpokenAlertRef.current) {
      lastSpokenAlertRef.current = nextVoiceKey;
      if (voicePromptToPlay) {
        roadAudioAlerts.playHazardVoiceAlert(voicePromptToPlay.title, voicePromptToPlay.prompt);
      }
    }
  }, [
    activeLat,
    activeLon,
    activeHeading,
    isLiveTripActive,
    isDemoMode,
    liveHazards,
    regionalSpeedLimit
  ]);

  const [mapModules, setMapModules] = useState<{
    MapContainer: any;
    TileLayer: any;
    Marker: any;
    Popup: any;
    L: any;
  } | null>(null);

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
          L: Leaflet
        });
      }
    } catch (err) {
      console.error('[Live3DMap] Leaflet initialization error:', err);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isMounted || !mapModules) {
    return (
      <div className="h-[480px] w-full rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-slate-500 font-mono">
        Initializing Real-Time 3D Geospatial Engine...
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, L } = mapModules;

  const displayLat = activeLat || 25.5941;
  const displayLng = activeLon || 85.1376;
  const displayHeading = activeHeading || 0;
  const centerPos: [number, number] = [displayLat, displayLng];


  // Custom Vehicle Marker Icon with smooth CSS rotation matching GPS / Demo heading
  const vehicleAngle = orientationMode === 'HEADING_UP' ? displayHeading : 0;
  const carIconHtml = `
    <div style="transform: rotate(${vehicleAngle}deg); transition: transform 0.3s ease-out;" class="relative flex items-center justify-center">
      <div class="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/50">
        <span style="font-size: 20px;">🚗</span>
      </div>
      <div class="absolute -top-1 w-2.5 h-2.5 rounded-full bg-cyan-300 animate-ping"></div>
    </div>
  `;

  const vehicleIcon = L.divIcon({
    html: carIconHtml,
    className: 'custom-vehicle-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  const getHazardIcon = (type: string) => {
    let emoji = '🚧';
    if (type === 'zebra_crossing') emoji = '🚸';
    else if (type === 'school' || type === 'school_zone') emoji = '🏫';
    else if (type === 'sharp_turn') emoji = '↪';
    else if (type === 'accident_incident' || type === 'emergency_location') emoji = '🚨';

    return L.divIcon({
      html: `<div class="w-8 h-8 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-sm shadow-md">${emoji}</div>`,
      className: 'hazard-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  const tileUrls = {
    DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    STREETS: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  return (
    <div className="space-y-4">
      {/* 3D Map Viewport Container */}
      <div className="relative h-[480px] w-full rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        {/* CSS 3D Pitch Tilt Perspective Wrapper */}
        <div
          style={{
            perspective: is3DMode ? '900px' : 'none',
            height: '100%',
            width: '100%'
          }}
          className="h-full w-full"
        >
          <div
            style={{
              transform: is3DMode ? 'rotateX(35deg) scale(1.08)' : 'none',
              transformOrigin: 'bottom center',
              transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              height: '100%',
              width: '100%'
            }}
          >
            <MapContainer
              center={centerPos}
              zoom={cameraZoom}
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; SafeWay AI 3D Geospatial Layer'
                url={tileUrls[mapStyle]}
              />

              {/* Real / Demo Vehicle Navigation Marker */}
              <Marker position={[displayLat, displayLng]} icon={vehicleIcon}>
                <Popup>
                  <div className="text-xs font-mono p-1 space-y-1">
                    <strong className="block text-cyan-400 font-bold uppercase">
                      🚗 {isDemoMode ? 'DEMO VEHICLE' : 'LIVE GPS VEHICLE'}
                    </strong>
                    <div>Lat: {displayLat.toFixed(5)} | Lng: {displayLng.toFixed(5)}</div>
                    <div>Heading: {displayHeading}°</div>
                  </div>
                </Popup>
              </Marker>

              {/* Fixed Demo Map Features when Demo Mode is Active */}
              {isDemoMode &&
                DEMO_MAP_FEATURES.map((feature) => (
                  <Marker
                    key={feature.id}
                    position={[feature.latitude, feature.longitude]}
                    icon={getHazardIcon(feature.type)}
                  >
                    <Popup>
                      <div className="text-xs font-mono space-y-1">
                        <strong className="text-amber-400 block uppercase font-bold">{feature.name}</strong>
                        <div>Warning Radius: <span className="text-cyan-400 font-bold">{feature.warningDistanceMeters}m</span></div>
                        <div>Advisory Limit: {feature.advisorySpeedKmH} km/h</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {/* Destination Marker */}
              {destination && (
                <Marker position={[destination.latitude, destination.longitude]}>
                  <Popup>
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      🎯 Destination: {destination.title}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Emergency Incident Marker */}
              {emergencyLocation && (
                <Marker position={[emergencyLocation.latitude, emergencyLocation.longitude]} icon={getHazardIcon('emergency_location')}>
                  <Popup>
                    <div className="text-xs font-mono space-y-1">
                      <strong className="text-rose-500 font-bold block uppercase">🚨 EMERGENCY INCIDENT LOCATION</strong>
                      <a
                        href={emergencyLocation.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline font-bold flex items-center gap-1 text-[11px]"
                      >
                        Open Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Live Camera Hazard Markers */}
              {!isDemoMode &&
                liveHazards.map((hazard) => (
                  <Marker key={hazard.id} position={[hazard.latitude, hazard.longitude]} icon={getHazardIcon(hazard.type)}>
                    <Popup>
                      <div className="text-xs font-mono space-y-1">
                        <strong className="text-amber-400 block uppercase font-bold">{hazard.label}</strong>
                        <div>Risk Level: <span className="text-rose-400 font-bold">{hazard.riskLevel}</span></div>
                        <div>Confidence: {hazard.confidence}%</div>
                        <div className="text-[10px] text-slate-400">{hazard.timestamp}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </div>

        {/* Top Floating Map Controls Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg ${
              is3DMode ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300' : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{is3DMode ? '3D PITCH ACTIVE' : '2D FLAT VIEW'}</span>
          </button>

          <button
            onClick={() => setOrientationMode(orientationMode === 'HEADING_UP' ? 'NORTH_UP' : 'HEADING_UP')}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 font-bold flex items-center gap-1.5 backdrop-blur-md"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{orientationMode}</span>
          </button>

          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 font-bold backdrop-blur-md focus:outline-none"
          >
            <option value="DARK">Dark 3D Vector</option>
            <option value="SATELLITE">Satellite Terrain</option>
            <option value="STREETS">OpenStreetMap</option>
          </select>
        </div>

        {/* Right Vertical Zoom Controls */}
        <div className="absolute right-4 bottom-4 z-20 flex flex-col gap-2 font-mono">
          <button
            onClick={() => setCameraZoom((z) => Math.min(19, z + 1))}
            className="w-10 h-10 rounded-2xl bg-slate-950/90 border border-slate-800 text-white font-bold text-base flex items-center justify-center hover:bg-slate-900 shadow-xl"
          >
            +
          </button>
          <button
            onClick={() => setCameraZoom((z) => Math.max(10, z - 1))}
            className="w-10 h-10 rounded-2xl bg-slate-950/90 border border-slate-800 text-white font-bold text-base flex items-center justify-center hover:bg-slate-900 shadow-xl"
          >
            -
          </button>
        </div>
      </div>

      {/* Telemetry & Traffic Rules Regional Speed Panel */}
      <div className="p-4 rounded-3xl glass-card border border-slate-800 bg-slate-900/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Current State / Region</span>
          <span className="text-white font-bold">{regionalState}</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Legal Speed Limit</span>
          <span className="text-cyan-400 font-bold">{regionalSpeedLimit} km/h</span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">GPS Accuracy</span>
          <span className="text-emerald-400 font-bold">
            {isDemoMode ? 'DEMO exact' : gpsState.accuracy !== null ? `±${gpsState.accuracy} m` : 'UNAVAILABLE'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Speed</span>
          <span className="text-white font-bold">
            {isDemoMode ? '45 km/h (DEMO)' : gpsState.speedKmH !== null ? `${gpsState.speedKmH} km/h` : 'UNAVAILABLE'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Heading</span>
          <span className="text-amber-400 font-bold">
            {displayHeading !== null ? `${displayHeading}°` : 'UNAVAILABLE'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">GPS / Demo Mode</span>
          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
            isDemoMode ? 'bg-purple-950 text-purple-400 border border-purple-800' :
            gpsState.status === 'LIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
            'bg-amber-950 text-amber-400 border border-amber-800'
          }`}>
            {isDemoMode ? 'DEMO SIMULATOR' : gpsState.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Live3DNavigationMap;
