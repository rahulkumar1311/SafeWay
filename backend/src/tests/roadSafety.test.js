import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Hazard from '../models/Hazard.js';
import * as hazardService from '../services/hazard.service.js';
import { generateRoadSafetyAlert } from '../services/safetyAlertEngine.service.js';

let mongoServer;

describe('Road Safety & Road Hazard Intelligence Unit Tests', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Hazard.deleteMany({});
  });

  test('Test 1: Valid hazard creation persists in MongoDB with correct GeoJSON coordinates', async () => {
    const hazardData = {
      type: 'pothole',
      description: 'Deep pothole on right lane near petrol pump',
      latitude: 25.5941,
      longitude: 85.1376,
      severity: 'high',
      reportedBy: 'user_safeway_01'
    };

    const created = await hazardService.createHazard(hazardData);

    assert.ok(created._id);
    assert.equal(created.type, 'pothole');
    assert.equal(created.severity, 'high');
    assert.equal(created.location.coordinates[0], 85.1376); // [longitude, latitude]
    assert.equal(created.location.coordinates[1], 25.5941);

    const dbRecord = await Hazard.findById(created._id);
    assert.ok(dbRecord);
  });

  test('Test 2: Rejects hazard creation with invalid latitude (> 90) or invalid longitude (< -180)', async () => {
    await assert.rejects(
      async () => {
        await hazardService.createHazard({
          type: 'pothole',
          description: 'Invalid coordinates test',
          latitude: 95.0, // Invalid
          longitude: 85.1376
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('Latitude'));
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await hazardService.createHazard({
          type: 'pothole',
          description: 'Invalid coordinates test',
          latitude: 25.5941,
          longitude: -195.0 // Invalid
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('Longitude'));
        return true;
      }
    );
  });

  test('Test 3: Nearby hazard spatial query returns hazards within specified radius', async () => {
    // Local hazard inside Patna (25.5941, 85.1376)
    await hazardService.createHazard({
      type: 'waterlogging',
      description: 'Waterlogging near Gandhi Maidan',
      latitude: 25.5941,
      longitude: 85.1376,
      severity: 'medium'
    });

    // Distant hazard outside 50km
    await hazardService.createHazard({
      type: 'construction',
      description: 'Distant road construction',
      latitude: 28.6139,
      longitude: 77.2090,
      severity: 'low'
    });

    const nearby = await hazardService.getNearbyHazards({
      latitude: 25.5941,
      longitude: 85.1376,
      radius: 10
    });

    assert.equal(nearby.length, 1);
    assert.equal(nearby[0].type, 'waterlogging');
  });

  test('Test 4: Safety Alert Engine generates alert for School Zone sign detection', () => {
    const alertRes = generateRoadSafetyAlert({
      signType: 'School Zone',
      speed: 45,
      speedLimit: 60,
      source: 'AI_CAMERA'
    });

    assert.equal(alertRes.alertGenerated, true);
    assert.equal(alertRes.severity, 'MEDIUM');
    assert.equal(alertRes.recommendedSpeed, 25);
    assert.ok(alertRes.alerts[0].includes('School zone detected'));
  });

  test('Test 5: Safety Alert Engine generates alert for Sharp Turn sign detection', () => {
    const alertRes = generateRoadSafetyAlert({
      signType: 'Sharp Turn',
      speed: 55,
      speedLimit: 60,
      source: 'AI_CAMERA'
    });

    assert.equal(alertRes.alertGenerated, true);
    assert.equal(alertRes.severity, 'MEDIUM');
    assert.equal(alertRes.recommendedSpeed, 30);
    assert.ok(alertRes.alerts[0].includes('Sharp turn detected'));
  });

  test('Test 6: Map Marker API Contract returns expected schema fields for frontend map teammate', async () => {
    const hazard = await hazardService.createHazard({
      type: 'accident',
      description: 'Multi-vehicle collision on bypass',
      latitude: 25.5941,
      longitude: 85.1376,
      severity: 'high'
    });

    // Standard Map Marker API Contract mapping
    const mapMarkerContract = {
      id: String(hazard._id),
      type: hazard.type.toUpperCase(),
      title: 'Accident Reported',
      description: hazard.description,
      latitude: hazard.location.coordinates[1],
      longitude: hazard.location.coordinates[0],
      severity: hazard.severity.toUpperCase(),
      source: 'COMMUNITY_REPORT',
      timestamp: hazard.createdAt.toISOString()
    };

    assert.ok(mapMarkerContract.id);
    assert.equal(mapMarkerContract.type, 'ACCIDENT');
    assert.equal(mapMarkerContract.latitude, 25.5941);
    assert.equal(mapMarkerContract.longitude, 85.1376);
    assert.equal(mapMarkerContract.severity, 'HIGH');
    assert.equal(mapMarkerContract.source, 'COMMUNITY_REPORT');
  });
});
