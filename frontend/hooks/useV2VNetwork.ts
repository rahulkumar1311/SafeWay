import { useState, useEffect, useRef, useCallback } from 'react';
import mapHazardEventBus from '@/services/mapHazardEventBus';

export interface NearbyVehicle {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'NORMAL' | 'WARNING' | 'EMERGENCY' | 'HELP_NEEDED';
  distanceMeters: number;
  direction: string;
  lastSeen: number;
}

export interface V2VSafetyAlert {
  id: string;
  type: string;
  sourceVehicleId: string;
  latitude: number;
  longitude: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  distanceMeters: number;
  direction: string;
}

export interface IncomingHelpRequest {
  requestId: string;
  requestVehicleId: string;
  requestSessionId: string;
  latitude: number;
  longitude: number;
  message: string;
  timestamp: string;
  distanceMeters: number;
  direction: string;
}

export interface UseV2VNetworkOptions {
  vehicleId?: string;
  latitude: number | null;
  longitude: number | null;
  speedKmH?: number | null;
  heading?: number | null;
  driverStatus?: 'NORMAL' | 'WARNING' | 'EMERGENCY' | 'HELP_NEEDED';
}

export function useV2VNetwork(options: UseV2VNetworkOptions) {
  const {
    vehicleId = 'SAFEWAY_VEHICLE_101',
    latitude,
    longitude,
    speedKmH = 0,
    heading = 0,
    driverStatus = 'NORMAL'
  } = options;

  const [v2vStatus, setV2vStatusState] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('OFFLINE');
  const [nearbyVehicles, setNearbyVehicles] = useState<NearbyVehicle[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<V2VSafetyAlert[]>([]);
  const [activeHelpRequest, setActiveHelpRequest] = useState<IncomingHelpRequest | null>(null);
  const [helpResponseStatus, setHelpResponseStatus] = useState<string | null>(null);

  // Stable Refs
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const optionsRef = useRef({ vehicleId, latitude, longitude, speedKmH, heading, driverStatus });
  useEffect(() => {
    optionsRef.current = { vehicleId, latitude, longitude, speedKmH, heading, driverStatus };
  }, [vehicleId, latitude, longitude, speedKmH, heading, driverStatus]);

  // Idempotent state updater preventing React maximum update depth loops
  const setV2vStatus = useCallback((nextStatus: 'CONNECTING' | 'ONLINE' | 'OFFLINE') => {
    if (!isMountedRef.current) return;
    setV2vStatusState((prev) => (prev === nextStatus ? prev : nextStatus));
  }, []);

  const getWsUrl = useCallback(() => {
    if (typeof window === 'undefined') return 'ws://127.0.0.1:5000/v2v';
    const host = window.location.hostname || '127.0.0.1';
    const port = process.env.NEXT_PUBLIC_WS_PORT || '5000';
    return `ws://${host}:${port}/v2v`;
  }, []);

  const handleIncomingMessage = useCallback((event: MessageEvent) => {
    if (!isMountedRef.current) return;

    try {
      const payload = JSON.parse(event.data);
      if (!payload || !payload.type) return;

      switch (payload.type) {
        case 'REGISTER_SUCCESS':
        case 'NEARBY_VEHICLES_UPDATE':
          if (Array.isArray(payload.nearbyVehicles)) {
            setNearbyVehicles(payload.nearbyVehicles);
          }
          break;

        case 'SAFETY_EVENT_ALERT':
          if (payload.event) {
            const alert: V2VSafetyAlert = payload.event;
            setSafetyAlerts((prev) => [alert, ...prev.slice(0, 19)]);

            mapHazardEventBus.publish({
              id: alert.id,
              type: alert.type === 'ACCIDENT_DETECTED' ? 'accident_incident' : 'road_hazard',
              label: `⚠️ V2V: ${alert.message} (${alert.distanceMeters}m ${alert.direction})`,
              latitude: alert.latitude,
              longitude: alert.longitude,
              confidence: 0.95,
              riskLevel: alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
              timestamp: alert.timestamp
            });
          }
          break;

        case 'INCOMING_HELP_REQUEST':
          setActiveHelpRequest({
            requestId: payload.requestId,
            requestVehicleId: payload.requestVehicleId,
            requestSessionId: payload.requestSessionId,
            latitude: payload.latitude,
            longitude: payload.longitude,
            message: payload.message,
            timestamp: payload.timestamp,
            distanceMeters: payload.distanceMeters,
            direction: payload.direction
          });
          break;

        case 'HELP_OFFER_ACCEPTED':
          setHelpResponseStatus(payload.message || 'Vehicle nearby accepted your help request.');
          setTimeout(() => {
            if (isMountedRef.current) setHelpResponseStatus(null);
          }, 10000);
          break;

        case 'HELP_REQUEST_CANCELLED':
          setActiveHelpRequest((prev) => (prev?.requestId === payload.requestId ? null : prev));
          break;
      }
    } catch (err) {
      console.warn('[V2V Network] Message parse note:', err);
    }
  }, []);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const wsUrl = getWsUrl();
    setV2vStatus('CONNECTING');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        reconnectCountRef.current = 0;
        setV2vStatus('ONLINE');

        const cur = optionsRef.current;
        if (cur.latitude !== null && cur.longitude !== null) {
          ws.send(
            JSON.stringify({
              type: 'REGISTER_VEHICLE',
              vehicleId: cur.vehicleId,
              latitude: cur.latitude,
              longitude: cur.longitude,
              speed: cur.speedKmH || 0,
              heading: cur.heading || 0,
              status: cur.driverStatus
            })
          );
        }
      };

      ws.onmessage = (evt) => handleIncomingMessage(evt);

      ws.onerror = () => {
        // Handled cleanly by onclose
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!isMountedRef.current) return;

        setV2vStatus('OFFLINE');

        // Bounded reconnect up to 5 attempts (2s, 4s, 8s, 16s, 32s)
        if (reconnectCountRef.current < 5) {
          const delay = Math.min(32000, Math.pow(2, reconnectCountRef.current + 1) * 1000);
          reconnectCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) connect();
          }, delay);
        }
      };
    } catch (err: any) {
      setV2vStatus('OFFLINE');
    }
  }, [getWsUrl, handleIncomingMessage, setV2vStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const cur = optionsRef.current;
        if (cur.latitude !== null && cur.longitude !== null) {
          wsRef.current.send(
            JSON.stringify({
              type: 'LOCATION_UPDATE',
              vehicleId: cur.vehicleId,
              latitude: cur.latitude,
              longitude: cur.longitude,
              speed: cur.speedKmH || 0,
              heading: cur.heading || 0,
              status: cur.driverStatus
            })
          );
        }
      }
    }, 3000);

    return () => {
      isMountedRef.current = false;
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const broadcastSafetyEvent = useCallback(
    (type: string, message: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH') => {
      const cur = optionsRef.current;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || cur.latitude === null || cur.longitude === null) {
        return false;
      }

      wsRef.current.send(
        JSON.stringify({
          type: 'BROADCAST_SAFETY_EVENT',
          event: {
            id: `v2v_evt_${Date.now()}`,
            type,
            latitude: cur.latitude,
            longitude: cur.longitude,
            severity,
            message,
            timestamp: new Date().toISOString()
          }
        })
      );
      return true;
    },
    []
  );

  const requestHelp = useCallback(
    (message = 'Emergency! Driver requires assistance.') => {
      const cur = optionsRef.current;
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || cur.latitude === null || cur.longitude === null) {
        return false;
      }

      wsRef.current.send(
        JSON.stringify({
          type: 'HELP_REQUEST',
          requestId: `help_${Date.now()}`,
          vehicleId: cur.vehicleId,
          latitude: cur.latitude,
          longitude: cur.longitude,
          message
        })
      );
      return true;
    },
    []
  );

  const acceptHelp = useCallback((requestId: string, requestVehicleId: string, requestSessionId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'HELP_ACCEPTED',
        requestId,
        requestVehicleId,
        requestSessionId
      })
    );
    setActiveHelpRequest(null);
  }, []);

  const cancelHelp = useCallback((requestId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'HELP_CANCELLED',
        requestId
      })
    );
    setActiveHelpRequest(null);
  }, []);

  const manualReconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    connect();
  }, [connect]);

  return {
    vehicleId,
    v2vStatus,
    nearbyVehicles,
    safetyAlerts,
    activeHelpRequest,
    helpResponseStatus,
    broadcastSafetyEvent,
    requestHelp,
    acceptHelp,
    cancelHelp,
    reconnect: manualReconnect
  };
}

export default useV2VNetwork;
