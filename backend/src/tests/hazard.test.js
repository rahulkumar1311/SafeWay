import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import Hazard from '../models/Hazard.js';

const runHazardTests = async () => {
  console.log('==================================================');
  console.log('STARTING ROAD HAZARD MODULE TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;
  let server;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - ${details}`);
      failed++;
    }
  };

  try {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/hazards`;

    // Ensure clean state for test descriptions
    await Hazard.deleteMany({ description: { $regex: /HazardTest/i } });

    // ----------------------------------------------------
    // TEST 1, 2: Valid Hazard Creation & Persistence
    // ----------------------------------------------------
    const validHazardPayload = {
      type: 'pothole',
      description: 'HazardTest - Deep pothole on main road',
      latitude: 25.61,
      longitude: 85.14,
      severity: 'high'
    };

    const resCreate = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validHazardPayload)
    });
    const jsonCreate = await resCreate.json();

    assert(
      resCreate.status === 201 && jsonCreate.success === true && Boolean(jsonCreate.data._id),
      'Test 1 & 2: Valid hazard creation returns 201 Created with valid ID',
      JSON.stringify(jsonCreate)
    );

    const createdId = jsonCreate.data._id;
    const dbHazard = await Hazard.findById(createdId);
    assert(
      dbHazard !== null &&
      dbHazard.type === 'pothole' &&
      dbHazard.location.coordinates[0] === 85.14 &&
      dbHazard.location.coordinates[1] === 25.61,
      'Test 2: Hazard document persisted in MongoDB with correct GeoJSON [longitude, latitude] coordinates',
      JSON.stringify(dbHazard)
    );

    // ----------------------------------------------------
    // TEST 3: Invalid hazard type
    // ----------------------------------------------------
    const resInvalidType = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validHazardPayload, type: 'volcano' })
    });
    const jsonInvalidType = await resInvalidType.json();
    assert(resInvalidType.status === 400, 'Test 3: Rejects invalid hazard type ("volcano") with HTTP 400');

    // ----------------------------------------------------
    // TEST 4: Invalid severity
    // ----------------------------------------------------
    const resInvalidSeverity = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validHazardPayload, severity: 'apocalyptic' })
    });
    assert(resInvalidSeverity.status === 400, 'Test 4: Rejects invalid severity level ("apocalyptic") with HTTP 400');

    // ----------------------------------------------------
    // TEST 5: Invalid latitude
    // ----------------------------------------------------
    const resInvalidLat = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validHazardPayload, latitude: 120 })
    });
    assert(resInvalidLat.status === 400, 'Test 5: Rejects latitude > 90 with HTTP 400');

    // ----------------------------------------------------
    // TEST 6: Invalid longitude
    // ----------------------------------------------------
    const resInvalidLng = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validHazardPayload, longitude: -200 })
    });
    assert(resInvalidLng.status === 400, 'Test 6: Rejects longitude < -180 with HTTP 400');

    // ----------------------------------------------------
    // TEST 7: Missing required fields
    // ----------------------------------------------------
    const resMissing = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pothole' })
    });
    assert(resMissing.status === 400, 'Test 7: Rejects missing required fields with HTTP 400');

    // ----------------------------------------------------
    // TEST 8 & 9: Hazard listing & empty result
    // ----------------------------------------------------
    const resList = await fetch(`${baseUrl}?type=pothole&page=1&limit=10`);
    const jsonList = await resList.json();
    assert(
      resList.status === 200 && jsonList.success === true && Array.isArray(jsonList.data),
      'Test 8: GET /api/hazards lists hazards array with pagination object',
      JSON.stringify(jsonList)
    );

    const resEmptyList = await fetch(`${baseUrl}?type=construction&status=resolved`);
    const jsonEmptyList = await resEmptyList.json();
    assert(
      resEmptyList.status === 200 && Array.isArray(jsonEmptyList.data) && jsonEmptyList.data.length === 0,
      'Test 9: Empty result set returns HTTP 200 OK with empty array',
      JSON.stringify(jsonEmptyList)
    );

    // ----------------------------------------------------
    // TEST 10, 11: Nearby hazard search & radius exclusion
    // Create a distant hazard (~500 km away)
    // ----------------------------------------------------
    await Hazard.create({
      type: 'roadblock',
      description: 'HazardTest - Distant hazard in Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      severity: 'medium'
    });

    const resNearby = await fetch(`${baseUrl}/nearby?latitude=25.61&longitude=85.14&radius=10`);
    const jsonNearby = await resNearby.json();

    assert(
      resNearby.status === 200 &&
      jsonNearby.data.some(h => h.description.includes('main road')) &&
      !jsonNearby.data.some(h => h.description.includes('Delhi')),
      'Test 10 & 11: Nearby search finds local hazard and excludes distant hazard outside 10km radius',
      JSON.stringify(jsonNearby)
    );

    // ----------------------------------------------------
    // TEST 12: Invalid nearby coordinates
    // ----------------------------------------------------
    const resInvalidNearbyCoords = await fetch(`${baseUrl}/nearby?latitude=abc&longitude=85.14`);
    assert(resInvalidNearbyCoords.status === 400, 'Test 12: Rejects non-numeric nearby latitude with HTTP 400');

    // ----------------------------------------------------
    // TEST 13: Invalid radius
    // ----------------------------------------------------
    const resInvalidRadius = await fetch(`${baseUrl}/nearby?latitude=25.61&longitude=85.14&radius=-5`);
    assert(resInvalidRadius.status === 400, 'Test 13: Rejects negative radius with HTTP 400');

    // ----------------------------------------------------
    // TEST 14: Hazard update / resolution
    // ----------------------------------------------------
    const resUpdate = await fetch(`${baseUrl}/${createdId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    const jsonUpdate = await resUpdate.json();

    assert(
      resUpdate.status === 200 && jsonUpdate.data.status === 'resolved',
      'Test 14: PATCH /api/hazards/:id updates hazard status to "resolved"',
      JSON.stringify(jsonUpdate)
    );

    // ----------------------------------------------------
    // TEST 15: Invalid ObjectId format
    // ----------------------------------------------------
    const resInvalidId = await fetch(`${baseUrl}/invalid_id_123`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert(resInvalidId.status === 400, 'Test 15: Rejects malformed ObjectId with HTTP 400');

    // ----------------------------------------------------
    // TEST 16: Nonexistent hazard ID
    // ----------------------------------------------------
    const fakeValidId = new mongoose.Types.ObjectId().toString();
    const resNotFound = await fetch(`${baseUrl}/${fakeValidId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert(resNotFound.status === 404, 'Test 16: Nonexistent hazard ID returns HTTP 404 Not Found');

    // ----------------------------------------------------
    // TEST 17: Error handling response structure
    // ----------------------------------------------------
    assert(
      jsonInvalidType.success === false && typeof jsonInvalidType.message === 'string',
      'Test 17: Error responses follow standard { success: false, message } JSON format'
    );

    // Clean up all test records
    await Hazard.deleteMany({ description: { $regex: /HazardTest/i } });
    console.log('\nTemporary hazard test records cleaned up from database.');

  } catch (err) {
    console.error('Unhandled hazard test error:', err);
    failed++;
  } finally {
    if (server) await new Promise(r => server.close(r));
    await mongoose.connection.close();
    console.log(`\n==================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);
  }
};

runHazardTests();
