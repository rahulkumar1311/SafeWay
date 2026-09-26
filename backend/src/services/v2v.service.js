import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../config/env.js';

/**
 * Calculates Haversine distance in meters between two geographic points (lat1, lon1) and (lat2, lon2).
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes cardinal relative direction from point 1 to point 2.
 */
export function calculateCardinalDirection(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLon = (lon2 - lon1) * rad;
  const y = Math.sin(dLon) * Math.cos(lat2 * rad);
  const x =
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
    Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

  if (brng >= 337.5 || brng < 22.5) return 'Ahead (North)';
  if (brng >= 22.5 && brng < 67.5) return 'Ahead Right (NE)';
  if (brng >= 67.5 && brng < 112.5) return 'Right (East)';
  if (brng >= 112.5 && brng < 157.5) return 'Behind Right (SE)';
  if (brng >= 157.5 && brng < 202.5) return 'Behind (South)';
  if (brng >= 202.5 && brng < 247.5) return 'Behind Left (SW)';
  if (brng >= 247.5 && brng < 292.5) return 'Left (West)';
  if (brng >= 292.5 && brng < 337.5) return 'Ahead Left (NW)';
  return 'Ahead';
}

class V2VService {
  constructor() {
    this.sessions = new Map(); // sessionId -> SessionObject
    this.cleanupInterval = null;
  }

  /**
   * Initializes WebSocket Server on HTTP server instance
   */
  init(server) {
    const wss = new WebSocketServer({ noServer: true });

    console.log('[V2V Network] WebSocket Server initialized on HTTP upgrade path (/v2v)');

    server.on('upgrade', (request, socket, head) => {
      try {
        const urlHost = request.headers.host || 'localhost';
        const pathname = new URL(request.url, `http://${urlHost}`).pathname;

        if (pathname === '/v2v' || pathname === '/api/v2v' || pathname === '/v2v/' || pathname === '/api/v2v/') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      } catch (err) {
        console.warn('[V2V Network Upgrade Warning]', err.message);
      }
    });

    wss.on('connection', (ws, req) => {
      const sessionId = `v2v_session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      ws.sessionId = sessionId;

      console.log(`[V2V Network] New vehicle connected | Session: ${sessionId}`);

      ws.on('message', (message) => {
        try {
          const rawStr = message.toString();
          const payload = JSON.parse(rawStr);
          this.handleClientMessage(ws, payload);
        } catch (err) {
          console.warn(`[V2V Network] Invalid WebSocket message payload from session ${sessionId}:`, err.message);
          this.sendJson(ws, {
            type: 'ERROR',
            message: 'Invalid JSON payload structure'
          });
        }
      });

      ws.on('close', () => {
        console.log(`[V2V Network] Connection closed | Session: ${sessionId}`);
        this.removeSession(sessionId);
      });

      ws.on('error', (err) => {
        console.error(`[V2V Network Error] Session ${sessionId}:`, err.message);
      });
    });

    // Start 10-second cleanup interval for stale vehicle sessions (>30s inactivity)
    this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 10000);
  }

  /**
   * Routes incoming client messages to handlers
   */
  handleClientMessage(ws, payload) {
    if (!payload || !payload.type) {
      return this.sendJson(ws, { type: 'ERROR', message: 'Missing event type' });
    }

    switch (payload.type) {
      case 'REGISTER_VEHICLE':
        this.registerVehicle(ws, payload);
        break;
      case 'LOCATION_UPDATE':
        this.updateLocation(ws, payload);
        break;
      case 'BROADCAST_SAFETY_EVENT':
        this.broadcastSafetyEvent(ws, payload);
        break;
      case 'HELP_REQUEST':
        this.handleHelpRequest(ws, payload);
        break;
      case 'HELP_ACCEPTED':
        this.handleHelpAccepted(ws, payload);
        break;
      case 'HELP_CANCELLED':
        this.handleHelpCancelled(ws, payload);
        break;
      case 'PING':
        this.sendJson(ws, { type: 'PONG', timestamp: Date.now() });
        break;
      default:
        console.warn(`[V2V Network] Unknown message type: ${payload.type}`);
    }
  }

  /**
   * Registers new vehicle session
   */
  registerVehicle(ws, payload) {
    const { vehicleId, latitude, longitude, speed = 0, heading = 0, status = 'NORMAL', capabilities = ['DROWSINESS_AI', 'SAFETY_CAMERA'] } = payload;

    if (!vehicleId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return this.sendJson(ws, { type: 'ERROR', message: 'Invalid vehicleId or GPS coordinates' });
    }

    const validLat = Math.max(-90, Math.min(90, latitude));
    const validLon = Math.max(-180, Math.min(180, longitude));

    const sessionObj = {
      sessionId: ws.sessionId,
      vehicleId,
      latitude: validLat,
      longitude: validLon,
      speed: Number(speed) || 0,
      heading: Number(heading) || 0,
      status: String(status).toUpperCase(),
      capabilities,
      lastSeen: Date.now(),
      ws
    };

    this.sessions.set(ws.sessionId, sessionObj);

    console.log(`[V2V Network] Registered Vehicle: ${vehicleId} at (${validLat}, ${validLon})`);

    // Return success to registrant with list of nearby vehicles
    const nearby = this.findNearbyVehicles(ws.sessionId, validLat, validLon);
    this.sendJson(ws, {
      type: 'REGISTER_SUCCESS',
      sessionId: ws.sessionId,
      vehicleId,
      radiusMeters: config.v2vRadiusMeters,
      nearbyVehicles: nearby
    });

    // Notify nearby peers
    this.notifyNearbyPeers(ws.sessionId);
  }

  /**
   * Updates vehicle GPS location heartbeat
   */
  updateLocation(ws, payload) {
    const session = this.sessions.get(ws.sessionId);
    if (!session) {
      return this.registerVehicle(ws, payload);
    }

    const { latitude, longitude, speed = session.speed, heading = session.heading, status = session.status } = payload;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      session.latitude = Math.max(-90, Math.min(90, latitude));
      session.longitude = Math.max(-180, Math.min(180, longitude));
    }
    session.speed = Number(speed) || 0;
    session.heading = Number(heading) || 0;
    session.status = String(status).toUpperCase();
    session.lastSeen = Date.now();

    const nearby = this.findNearbyVehicles(ws.sessionId, session.latitude, session.longitude);
    this.sendJson(ws, {
      type: 'NEARBY_VEHICLES_UPDATE',
      nearbyVehicles: nearby
    });

    this.notifyNearbyPeers(ws.sessionId);
  }

  /**
   * Broadcasts safety event (ACCIDENT, ROAD_HAZARD, ROAD_BLOCKED, etc.) to nearby vehicles
   */
  broadcastSafetyEvent(ws, payload) {
    const session = this.sessions.get(ws.sessionId);
    const { event } = payload;

    if (!event || !event.type) {
      return this.sendJson(ws, { type: 'ERROR', message: 'Missing safety event body' });
    }

    const eventLat = typeof event.latitude === 'number' ? event.latitude : (session ? session.latitude : null);
    const eventLon = typeof event.longitude === 'number' ? event.longitude : (session ? session.longitude : null);

    if (eventLat === null || eventLon === null) {
      return this.sendJson(ws, { type: 'ERROR', message: 'Event location required' });
    }

    const radius = config.v2vRadiusMeters;
    let broadcastCount = 0;

    console.log(`[V2V Broadcast] Safety Event '${event.type}' from ${session ? session.vehicleId : 'Unknown'} at (${eventLat}, ${eventLon})`);

    this.sessions.forEach((targetSession, targetSessionId) => {
      if (targetSessionId === ws.sessionId) return; // Do not send back to self
      if (Date.now() - targetSession.lastSeen > 30000) return; // Ignore stale sessions

      const dist = calculateDistanceMeters(eventLat, eventLon, targetSession.latitude, targetSession.longitude);

      if (dist <= radius) {
        const direction = calculateCardinalDirection(targetSession.latitude, targetSession.longitude, eventLat, eventLon);

        this.sendJson(targetSession.ws, {
          type: 'SAFETY_EVENT_ALERT',
          event: {
            id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            type: event.type,
            sourceVehicleId: session ? session.vehicleId : 'SAFEWAY_VEHICLE',
            latitude: eventLat,
            longitude: eventLon,
            severity: event.severity || 'HIGH',
            message: event.message || 'Road safety alert reported nearby',
            timestamp: event.timestamp || new Date().toISOString(),
            distanceMeters: dist,
            direction
          }
        });
        broadcastCount++;
      }
    });

    this.sendJson(ws, {
      type: 'BROADCAST_SENT',
      event: event.type,
      recipients: broadcastCount
    });
  }

  /**
   * Handles Emergency HELP_REQUEST
   */
  handleHelpRequest(ws, payload) {
    const session = this.sessions.get(ws.sessionId);
    const lat = payload.latitude || (session ? session.latitude : null);
    const lon = payload.longitude || (session ? session.longitude : null);

    if (lat === null || lon === null) {
      return this.sendJson(ws, { type: 'ERROR', message: 'GPS coordinates required for Help Request' });
    }

    const requestId = payload.requestId || `help_${Date.now()}`;
    const vehicleId = session ? session.vehicleId : (payload.vehicleId || 'DRIVER_IN_NEED');
    const radius = config.v2vRadiusMeters;
    let recipients = 0;

    console.log(`[V2V Help Request] Vehicle ${vehicleId} requested help at (${lat}, ${lon})`);

    this.sessions.forEach((targetSession, targetSessionId) => {
      if (targetSessionId === ws.sessionId) return;
      if (Date.now() - targetSession.lastSeen > 30000) return;

      const dist = calculateDistanceMeters(lat, lon, targetSession.latitude, targetSession.longitude);

      if (dist <= radius) {
        const direction = calculateCardinalDirection(targetSession.latitude, targetSession.longitude, lat, lon);

        this.sendJson(targetSession.ws, {
          type: 'INCOMING_HELP_REQUEST',
          requestId,
          requestVehicleId: vehicleId,
          requestSessionId: ws.sessionId,
          latitude: lat,
          longitude: lon,
          message: payload.message || 'Driver requested nearby assistance',
          timestamp: new Date().toISOString(),
          distanceMeters: dist,
          direction
        });
        recipients++;
      }
    });

    this.sendJson(ws, {
      type: 'HELP_REQUEST_SENT',
      requestId,
      notifiedVehicles: recipients
    });
  }

  /**
   * Handles HELP_ACCEPTED response from nearby helper driver
   */
  handleHelpAccepted(ws, payload) {
    const helperSession = this.sessions.get(ws.sessionId);
    const targetSessionId = payload.requestSessionId;
    const targetVehicleId = payload.requestVehicleId;

    let targetWs = null;
    if (targetSessionId && this.sessions.has(targetSessionId)) {
      targetWs = this.sessions.get(targetSessionId).ws;
    } else if (targetVehicleId) {
      this.sessions.forEach((s) => {
        if (s.vehicleId === targetVehicleId) targetWs = s.ws;
      });
    }

    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      const helperId = helperSession ? helperSession.vehicleId : 'NEARBY_SAFEWAY_VEHICLE';
      this.sendJson(targetWs, {
        type: 'HELP_OFFER_ACCEPTED',
        requestId: payload.requestId,
        helperVehicleId: helperId,
        message: `Vehicle ${helperId} has accepted your help request and is navigating to your location.`
      });
      console.log(`[V2V Help Accepted] Helper ${helperId} accepted request ${payload.requestId}`);
    }
  }

  /**
   * Handles HELP_CANCELLED by requesting driver
   */
  handleHelpCancelled(ws, payload) {
    const session = this.sessions.get(ws.sessionId);
    const radius = config.v2vRadiusMeters;

    this.sessions.forEach((targetSession, targetSessionId) => {
      if (targetSessionId === ws.sessionId) return;
      if (Date.now() - targetSession.lastSeen > 30000) return;

      if (session) {
        const dist = calculateDistanceMeters(session.latitude, session.longitude, targetSession.latitude, targetSession.longitude);
        if (dist <= radius) {
          this.sendJson(targetSession.ws, {
            type: 'HELP_REQUEST_CANCELLED',
            requestId: payload.requestId,
            vehicleId: session.vehicleId
          });
        }
      }
    });
  }

  /**
   * Finds nearby active vehicles within radius
   */
  findNearbyVehicles(callerSessionId, lat, lon) {
    const nearby = [];
    const radius = config.v2vRadiusMeters;
    const now = Date.now();

    this.sessions.forEach((session, sid) => {
      if (sid === callerSessionId) return;
      if (now - session.lastSeen > 30000) return;

      const dist = calculateDistanceMeters(lat, lon, session.latitude, session.longitude);
      if (dist <= radius) {
        const direction = calculateCardinalDirection(lat, lon, session.latitude, session.longitude);
        nearby.push({
          vehicleId: session.vehicleId,
          latitude: session.latitude,
          longitude: session.longitude,
          speed: session.speed,
          heading: session.heading,
          status: session.status,
          distanceMeters: dist,
          direction,
          lastSeen: session.lastSeen
        });
      }
    });

    return nearby;
  }

  /**
   * Notifies nearby peers of location updates
   */
  notifyNearbyPeers(sessionId) {
    const caller = this.sessions.get(sessionId);
    if (!caller) return;

    const radius = config.v2vRadiusMeters;
    const now = Date.now();

    this.sessions.forEach((session, sid) => {
      if (sid === sessionId) return;
      if (now - session.lastSeen > 30000) return;

      const dist = calculateDistanceMeters(caller.latitude, caller.longitude, session.latitude, session.longitude);
      if (dist <= radius) {
        const updatedNearby = this.findNearbyVehicles(sid, session.latitude, session.longitude);
        this.sendJson(session.ws, {
          type: 'NEARBY_VEHICLES_UPDATE',
          nearbyVehicles: updatedNearby
        });
      }
    });
  }

  /**
   * Safely sends JSON string over WebSocket
   */
  sendJson(ws, obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(obj));
      } catch (err) {
        console.warn('[V2V Network] Send error:', err.message);
      }
    }
  }

  /**
   * Removes session on close
   */
  removeSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Cleans up sessions inactive for > 30 seconds
   */
  cleanupInactiveSessions() {
    const now = Date.now();
    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastSeen > 30000 || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
        console.log(`[V2V Network] Evicting stale session: ${sessionId} (Vehicle: ${session.vehicleId})`);
        this.sessions.delete(sessionId);
      }
    });
  }
}

export const v2vService = new V2VService();
export default v2vService;
