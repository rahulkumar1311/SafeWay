/**
 * Real-Time Map & Road Safety Event Bus
 * Broadcasts camera hazard detections and emergency locations directly to the Live 3D Map.
 */

export interface MapHazardEvent {
  id: string;
  type: 'zebra_crossing' | 'school_zone' | 'sharp_turn' | 'road_hazard' | 'traffic_sign' | 'accident_incident' | 'emergency_location';
  label: string;
  latitude: number;
  longitude: number;
  confidence: number;
  riskLevel: 'CAUTION' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  mapsUrl?: string;
}

type EventCallback = (event: MapHazardEvent) => void;

class MapHazardEventBus {
  private listeners: Set<EventCallback> = new Set();
  private hazardHistory: MapHazardEvent[] = [];

  public subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public publish(event: MapHazardEvent) {
    this.hazardHistory = [event, ...this.hazardHistory.slice(0, 49)];
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn('[MapEventBus] Listener callback error:', err);
      }
    });
  }

  public getHistory(): MapHazardEvent[] {
    return [...this.hazardHistory];
  }

  public clearHistory() {
    this.hazardHistory = [];
  }
}

export const mapHazardEventBus = new MapHazardEventBus();
export default mapHazardEventBus;
