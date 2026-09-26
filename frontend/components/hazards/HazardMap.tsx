import React, { useEffect, useState, useId } from 'react';
import { RoadHazard } from '@/types';
import { NearbyVehicle } from '@/hooks/useV2VNetwork';

interface HazardMapProps {
  center: [number, number];
  hazards: RoadHazard[];
  nearbyVehicles?: NearbyVehicle[];
}

export const HazardMap: React.FC<HazardMapProps> = ({ center, hazards, nearbyVehicles = [] }) => {
  const [mapModules, setMapModules] = useState<{
    MapContainer: any;
    TileLayer: any;
    Marker: any;
    Popup: any;
    L: any;
  } | null>(null);

  const containerId = useId();

  useEffect(() => {
    let isMounted = true;
    try {
      const RL = require('react-leaflet');
      const Leaflet = require('leaflet');

      // Fix default marker icon paths once safely
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
      console.error('[Leaflet] Module initialization error:', err);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  if (!mapModules) {
    return (
      <div className="h-[420px] w-full rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-slate-500 font-mono">
        Loading Interactive Hazard & V2V Map...
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = mapModules;

  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden border border-slate-800 relative z-10">
      <MapContainer
        key={containerId}
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Driver Current Position */}
        <Marker position={center}>
          <Popup>
            <div className="text-xs font-sans font-bold text-cyan-600">
              Your SafeWay Vehicle (Host)
            </div>
          </Popup>
        </Marker>

        {/* Nearby Active SafeWay V2V Vehicles */}
        {nearbyVehicles.map((v) => {
          const lat = v.latitude;
          const lng = v.longitude;
          if (!lat || !lng) return null;

          const isEmergency = v.status === 'EMERGENCY' || v.status === 'HELP_NEEDED';
          const isWarning = v.status === 'WARNING';

          return (
            <Marker key={v.vehicleId} position={[lat, lng]}>
              <Popup>
                <div className="text-xs font-sans space-y-1">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isEmergency ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <strong className="block text-slate-900 font-bold uppercase">{v.vehicleId}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                    <div>Status: <strong className={isEmergency ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}>{v.status}</strong></div>
                    <div>Distance: <strong>{v.distanceMeters} m ({v.direction})</strong></div>
                    <div>Speed: <strong>{v.speed} km/h</strong></div>
                    <div className="text-[10px] text-slate-400 pt-0.5">Updated: {new Date(v.lastSeen).toLocaleTimeString()}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Nearby Hazard Markers */}
        {hazards.map((h) => {
          const lat = h.latitude || h.location?.coordinates?.[1];
          const lng = h.longitude || h.location?.coordinates?.[0];
          if (!lat || !lng) return null;
          return (
            <Marker key={h._id || `${lat}-${lng}`} position={[lat, lng]}>
              <Popup>
                <div className="text-xs font-sans space-y-1">
                  <strong className="text-purple-600 block uppercase font-bold">{h.type}</strong>
                  <p>{h.description}</p>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Severity: {h.severity}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default HazardMap;

