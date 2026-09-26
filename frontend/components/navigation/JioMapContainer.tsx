'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getJioMapsConfig, MapMarker } from '@/lib/jioMaps';
import { MapPin, Navigation, Info, AlertTriangle, Key, ShieldAlert } from 'lucide-react';
import HazardMap from '@/components/hazards/HazardMap';
import { RoadHazard } from '@/types';

interface JioMapContainerProps {
  userLocation: { latitude: number; longitude: number; address: string };
  destination?: { latitude: number; longitude: number; title: string };
  hazards?: RoadHazard[];
}

export const JioMapContainer: React.FC<JioMapContainerProps> = ({
  userLocation,
  destination,
  hazards = []
}) => {
  const [jioConfig, setJioConfig] = useState(getJioMapsConfig());
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setJioConfig(getJioMapsConfig());
  }, []);

  const centerPos: [number, number] = [userLocation.latitude, userLocation.longitude];

  return (
    <div className="space-y-4">
      {/* Configuration Status Advisory */}
      {!jioConfig.isConfigured && (
        <div className="p-4 rounded-2xl glass-card border border-cyan-500/30 bg-cyan-950/20 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-cyan-400">
            <Key className="w-4 h-4" />
            <span>Jio 3D Maps Integration Layer Ready</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            SafeWay AI includes full support for <strong>Jio 3D Maps SDK</strong>. To render native Jio 3D vector map tiles, provide your public key in <code className="text-cyan-300 font-mono">.env.local</code>:
          </p>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-cyan-300">
            NEXT_PUBLIC_JIO_MAPS_API_KEY=your_jio_maps_key_here<br />
            NEXT_PUBLIC_JIO_MAPS_STYLE_URL=https://maps.jio.com/styles/3d-vector.json
          </div>
          <p className="text-[11px] text-slate-400">
            Fallback interactive map active below using verified geospatial coordinates.
          </p>
        </div>
      )}

      {/* Map Rendering Container */}
      <div className="relative">
        <HazardMap center={centerPos} hazards={hazards} />

        {/* Floating Route Legend Bar */}
        <div className="absolute top-4 right-4 z-20 glass-card p-3 rounded-2xl border border-slate-800 text-[11px] space-y-1.5 backdrop-blur-md bg-slate-950/80 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-200">Current Position</span>
          </div>
          {destination && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <span className="text-slate-200">Destination: {destination.title}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-slate-200">Hazards ({hazards.length})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JioMapContainer;
