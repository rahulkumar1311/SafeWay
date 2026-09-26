import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import SafetyRecord from '../models/SafetyRecord.js';

const runSafetyTests = async () => {
  console.log('==================================================');
  console.log('STARTING SAFETY ANALYSIS & PERSISTENCE TEST SUITE');
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
    const baseUrl = `http://localhost:${port}/api/safety`;

    // Clean any previous test records
    await SafetyRecord.deleteMany({ userId: { $in: ['test_user_777', 'test_user_888'] } });

    // ----------------------------------------------------
    // TEST 1, 2, 3 & 9: Valid safety analysis & MongoDB persistence
    // ----------------------------------------------------
    const validPayload = {
      userId: 'test_user_777',
      drowsinessScore: 75,
      speed: 95,
      speedLimit: 60,
      harshBraking: 3,
      roadHazard: true,
      events: [{ eventType: 'HARSH_BRAKE', details: 'Braked at intersection', timestamp: new Date() }]
    };

    const resValid = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    });
    const jsonValid = await resValid.json();

    assert(
      resValid.status === 200 && jsonValid.success === true && Boolean(jsonValid.data.recordId),
      'Test 1, 2 & 3: Valid safety analysis returns 200 OK with valid recordId',
      JSON.stringify(jsonValid)
    );

    // Verify record actually exists in MongoDB database
    const dbRecord = await SafetyRecord.findById(jsonValid.data.recordId);
    assert(
      dbRecord !== null && dbRecord.userId === 'test_user_777' && dbRecord.riskLevel === 'HIGH',
      'Test 9: SafetyRecord document successfully persisted and verified in MongoDB',
      JSON.stringify(dbRecord)
    );

    // ----------------------------------------------------
    // TEST 4: Drowsiness score boundaries
    // ----------------------------------------------------
    const resLowDrowsiness = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, drowsinessScore: -10 })
    });
    assert(
      resLowDrowsiness.status === 400,
      'Test 4: Rejects negative drowsinessScore (< 0) with HTTP 400'
    );

    const resHighDrowsiness = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, drowsinessScore: 150 })
    });
    assert(
      resHighDrowsiness.status === 400,
      'Test 4: Rejects excessive drowsinessScore (> 100) with HTTP 400'
    );

    // ----------------------------------------------------
    // TEST 5: Driving score boundaries
    // ----------------------------------------------------
    const resInvalidDrivingScore = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, drivingScore: 120 })
    });
    assert(
      resInvalidDrivingScore.status === 400,
      'Test 5: Rejects drivingScore > 100 with HTTP 400'
    );

    // ----------------------------------------------------
    // TEST 6: Invalid riskLevel enum validation in Mongoose model
    // ----------------------------------------------------
    try {
      const invalidModelDoc = new SafetyRecord({
        drowsinessScore: 50,
        drivingScore: 50,
        riskLevel: 'EXTREME' // Invalid enum
      });
      const err = invalidModelDoc.validateSync();
      assert(
        err && err.errors.riskLevel,
        'Test 6: SafetyRecord model rejects invalid riskLevel enum ("EXTREME")'
      );
    } catch (e) {
      assert(false, 'Test 6: Model validation exception', e.message);
    }

    // ----------------------------------------------------
    // TEST 7: Invalid input (missing required fields)
    // ----------------------------------------------------
    const resMissingInput = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: 60 }) // missing drowsinessScore & speedLimit
    });
    const jsonMissingInput = await resMissingInput.json();
    assert(
      resMissingInput.status === 400 && jsonMissingInput.success === false,
      'Test 7: Missing required input fields returns HTTP 400 Bad Request',
      JSON.stringify(jsonMissingInput)
    );

    // ----------------------------------------------------
    // TEST 8: Events array handling & GET /records/:userId retrieval
    // ----------------------------------------------------
    const resUserRecords = await fetch(`${baseUrl}/records/test_user_777`);
    const jsonUserRecords = await resUserRecords.json();
    assert(
      resUserRecords.status === 200 && jsonUserRecords.count >= 1 && Array.isArray(jsonUserRecords.data[0].events),
      'Test 8: GET /api/safety/records/:userId retrieves stored SafetyRecords with events array',
      JSON.stringify(jsonUserRecords)
    );

    // Clean up temporary test data
    await SafetyRecord.deleteMany({ userId: { $in: ['test_user_777', 'test_user_888'] } });
    console.log('\nTemporary safety test records cleaned up from database.');

  } catch (err) {
    console.error('Unhandled safety test error:', err);
    failed++;
  } finally {
    if (server) await new Promise(r => server.close(r));
    await mongoose.connection.close();
    console.log(`\n==================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);
  }
};

runSafetyTests();
