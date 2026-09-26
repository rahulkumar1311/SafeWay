import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import TrafficRule from '../models/TrafficRule.js';

const runChallanTests = async () => {
  console.log('==================================================');
  console.log('STARTING CHALLAN / FINE INFO MODULE TEST SUITE');
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
    const baseUrl = `http://localhost:${port}/api/challans`;

    // Ensure clean state for test rules
    await TrafficRule.deleteMany({ state: { $in: ['ChallanTestState', 'challanteststate'] } });

    // Insert temporary test traffic rules with fines
    const testRules = [
      {
        state: 'ChallanTestState',
        category: 'Speeding',
        title: 'High Speed Driving',
        description: 'Driving above maximum allowed speed limit',
        vehicleType: 'FourWheeler',
        fineAmount: 2000,
        sourceUrl: 'https://transport.teststate.gov.in',
        lastUpdated: new Date()
      },
      {
        state: 'ChallanTestState',
        category: 'Helmet',
        title: 'No Helmet Fine',
        description: 'Riding without protective helmet',
        vehicleType: 'TwoWheeler',
        fineAmount: 1000,
        sourceUrl: 'https://transport.teststate.gov.in',
        lastUpdated: new Date()
      },
      {
        state: 'ChallanTestState',
        category: 'Signal',
        title: 'Red Light Jump',
        description: 'Jumping traffic signal red light',
        vehicleType: 'FourWheeler',
        fineAmount: 500,
        sourceUrl: 'https://transport.teststate.gov.in',
        lastUpdated: new Date()
      }
    ];

    await TrafficRule.insertMany(testRules);

    // ----------------------------------------------------
    // TEST 1, 2, 3, 4, 13: Valid Challan lookup, Fine sorting & TrafficRule integration
    // ----------------------------------------------------
    const resValid = await fetch(`${baseUrl}/ChallanTestState`);
    const jsonValid = await resValid.json();

    assert(
      resValid.status === 200 &&
      jsonValid.success === true &&
      jsonValid.type === 'DEFINED_TRAFFIC_FINES' &&
      jsonValid.data.length === 3,
      'Test 1, 4 & 13: Valid challan fine lookup returns 200 OK with correct state rules array',
      JSON.stringify(jsonValid)
    );

    assert(
      jsonValid.data[0].fineAmount === 2000 && jsonValid.data[1].fineAmount === 1000 && jsonValid.data[2].fineAmount === 500,
      'Test 2 & 3: Results correctly ordered by fineAmount descending (2000 -> 1000 -> 500)',
      JSON.stringify(jsonValid.data)
    );

    // ----------------------------------------------------
    // TEST 5: Vehicle type filtering
    // ----------------------------------------------------
    const resVehicle = await fetch(`${baseUrl}/ChallanTestState?vehicleType=TwoWheeler`);
    const jsonVehicle = await resVehicle.json();
    assert(
      resVehicle.status === 200 && jsonVehicle.data.length === 1 && jsonVehicle.data[0].category === 'Helmet',
      'Test 5: Vehicle type filter (?vehicleType=TwoWheeler) returns matching fine rules only',
      JSON.stringify(jsonVehicle)
    );

    // ----------------------------------------------------
    // TEST 6: Unknown state behavior
    // ----------------------------------------------------
    const resUnknownState = await fetch(`${baseUrl}/NonExistentState999`);
    const jsonUnknownState = await resUnknownState.json();
    assert(
      resUnknownState.status === 200 && jsonUnknownState.data.length === 0 && jsonUnknownState.pagination.total === 0,
      'Test 6: Unknown state returns 200 OK with empty array and total 0',
      JSON.stringify(jsonUnknownState)
    );

    // ----------------------------------------------------
    // TEST 7 & 8: Unknown violation / category & No matching rule
    // ----------------------------------------------------
    const resUnknownCat = await fetch(`${baseUrl}/ChallanTestState?category=IllegalParking`);
    const jsonUnknownCat = await resUnknownCat.json();
    assert(
      resUnknownCat.status === 200 && jsonUnknownCat.data.length === 0,
      'Test 7 & 8: Unknown violation category returns 200 OK with empty array',
      JSON.stringify(jsonUnknownCat)
    );

    // ----------------------------------------------------
    // TEST 10 & 11: Invalid input & pagination bounds
    // ----------------------------------------------------
    const resInvalidPage = await fetch(`${baseUrl}/ChallanTestState?page=invalid`);
    assert(resInvalidPage.status === 400, 'Test 10: Rejects non-integer page with HTTP 400');

    const resInvalidLimit = await fetch(`${baseUrl}/ChallanTestState?limit=100`);
    assert(resInvalidLimit.status === 400, 'Test 11: Rejects limit > 50 with HTTP 400');

    // ----------------------------------------------------
    // TEST 12 & 14: Standard error response & Security against unsafe query input
    // ----------------------------------------------------
    const resUnsafeRegex = await fetch(`${baseUrl}/ChallanTestState?category=Speeding%28%2B%2A%29`);
    const jsonUnsafeRegex = await resUnsafeRegex.json();
    assert(
      resUnsafeRegex.status === 200 && jsonUnsafeRegex.data.length === 0,
      'Test 12 & 14: Regex injection characters safely escaped in query input without breaking search',
      JSON.stringify(jsonUnsafeRegex)
    );

    // Clean up temporary test rules
    await TrafficRule.deleteMany({ state: { $in: ['ChallanTestState', 'challanteststate'] } });
    console.log('\nTemporary challan test rules cleaned up from database.');

  } catch (err) {
    console.error('Unhandled challan test error:', err);
    failed++;
  } finally {
    if (server) await new Promise(r => server.close(r));
    await mongoose.connection.close();
    console.log(`\n==================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);
  }
};

runChallanTests();
