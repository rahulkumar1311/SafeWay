import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { WebSocket } from 'ws';
import { v2vService } from '../services/v2v.service.js';

test('Real V2V WebSocket Connection & Bi-directional Message Exchange', async () => {
  const server = http.createServer();
  v2vService.init(server);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/v2v`;

  // Vehicle A Connection
  const wsA = new WebSocket(wsUrl);

  const vehicleARegistered = new Promise((resolve, reject) => {
    wsA.on('open', () => {
      wsA.send(
        JSON.stringify({
          type: 'REGISTER_VEHICLE',
          vehicleId: 'TEST_VEHICLE_A',
          latitude: 24.5000,
          longitude: 86.5000,
          speed: 40,
          heading: 90
        })
      );
    });

    wsA.on('message', (data) => {
      const payload = JSON.parse(data.toString());
      if (payload.type === 'REGISTER_SUCCESS') {
        resolve(payload);
      }
    });

    wsA.on('error', (err) => reject(err));
  });

  const resA = await vehicleARegistered;
  assert.equal(resA.type, 'REGISTER_SUCCESS');
  assert.equal(resA.vehicleId, 'TEST_VEHICLE_A');

  // Vehicle B Connection (Nearby within 500m)
  const wsB = new WebSocket(wsUrl);

  const vehicleBRegistered = new Promise((resolve, reject) => {
    wsB.on('open', () => {
      wsB.send(
        JSON.stringify({
          type: 'REGISTER_VEHICLE',
          vehicleId: 'TEST_VEHICLE_B',
          latitude: 24.5020,
          longitude: 86.5020,
          speed: 35,
          heading: 85
        })
      );
    });

    wsB.on('message', (data) => {
      const payload = JSON.parse(data.toString());
      if (payload.type === 'REGISTER_SUCCESS') {
        resolve(payload);
      }
    });

    wsB.on('error', (err) => reject(err));
  });

  const resB = await vehicleBRegistered;
  assert.equal(resB.type, 'REGISTER_SUCCESS');
  assert.equal(resB.vehicleId, 'TEST_VEHICLE_B');

  // Test Real V2V Safety Event Broadcast from Vehicle A to Vehicle B
  const bReceivedAlert = new Promise((resolve, reject) => {
    wsB.on('message', (data) => {
      const payload = JSON.parse(data.toString());
      if (payload.type === 'SAFETY_EVENT_ALERT') {
        resolve(payload.event);
      }
    });

    // Vehicle A broadcasts ROAD_HAZARD
    wsA.send(
      JSON.stringify({
        type: 'BROADCAST_SAFETY_EVENT',
        event: {
          id: 'test_hazard_101',
          type: 'ROAD_HAZARD',
          latitude: 24.5000,
          longitude: 86.5000,
          severity: 'HIGH',
          message: 'Pothole detected ahead'
        }
      })
    );
  });

  const alertB = await bReceivedAlert;
  assert.equal(alertB.type, 'ROAD_HAZARD');
  assert.equal(alertB.sourceVehicleId, 'TEST_VEHICLE_A');
  assert.ok(alertB.distanceMeters > 0, 'Should have positive distance in meters');

  // Cleanup Sockets and Test Server
  wsA.close();
  wsB.close();
  await new Promise((resolve) => server.close(resolve));
});
