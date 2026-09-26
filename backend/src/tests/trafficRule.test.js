import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import TrafficRule from '../models/TrafficRule.js';

let server;
let baseUrl;
let trafficRulesBaseUrl;

const runTests = async () => {
  console.log('==================================================');
  console.log('STARTING TRAFFIC RULES API INTEGRATION & UNIT TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - Details: ${details}`);
      failed++;
    }
  };

  try {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api/rules`;
    trafficRulesBaseUrl = `http://localhost:${port}/api/traffic-rules`;
    console.log(`Test server running on port ${port}\n`);

    await TrafficRule.deleteMany({
      $or: [
        { state: 'TestState' },
        { ruleCode: { $regex: /^TEST-/ } }
      ]
    });

    let modelError = null;
    try {
      const invalidRule = new TrafficRule({
        scope: 'CENTRAL',
        title: 'Invalid Rule',
        description: 'Test description',
        sourceUrl: 'invalid-url-string'
      });
      await invalidRule.validate();
    } catch (err) {
      modelError = err;
    }
    assert(
      modelError !== null && modelError.errors && modelError.errors.sourceUrl,
      'Test 1.1: Model validation catches invalid sourceUrl format',
      modelError ? modelError.message : ''
    );

    let negativeFineErr = null;
    try {
      const negFineRule = new TrafficRule({
        scope: 'CENTRAL',
        title: 'Negative Fine Rule',
        description: 'Desc',
        category: 'Helmet',
        fineAmount: -500,
        sourceUrl: 'https://morth.nic.in',
        legalSection: 'Section 177',
        sourceName: 'MoRTH'
      });
      await negFineRule.validate();
    } catch (err) {
      negativeFineErr = err;
    }
    assert(
      negativeFineErr !== null && negativeFineErr.errors && negativeFineErr.errors.fineAmount,
      'Test 1.2: Model validation rejects negative fineAmount values',
      negativeFineErr ? negativeFineErr.message : ''
    );

    const resCombinedUnknown = await fetch(`${baseUrl}/UnknownState999`);
    const jsonCombinedUnknown = await resCombinedUnknown.json();
    assert(
      resCombinedUnknown.status === 200 && jsonCombinedUnknown.success === true && jsonCombinedUnknown.data.every(r => r.scope === 'CENTRAL'),
      'Test 2.1: Unknown state query returns Central rules applicable nationwide',
      JSON.stringify(jsonCombinedUnknown)
    );

    const resEmptyState = await fetch(`${baseUrl}/UnknownState999?scope=STATE`);
    const jsonEmptyState = await resEmptyState.json();
    assert(
      resEmptyState.status === 200 && jsonEmptyState.success === true && Array.isArray(jsonEmptyState.data) && jsonEmptyState.data.length === 0,
      'Test 2.2: Unknown state with scope=STATE returns HTTP 200 with empty data array',
      JSON.stringify(jsonEmptyState)
    );

    const resInvalidPage = await fetch(`${baseUrl}/TestState?page=abc`);
    const jsonInvalidPage = await resInvalidPage.json();
    assert(
      resInvalidPage.status === 400 && jsonInvalidPage.success === false,
      'Test 3.1: Invalid page parameter returns HTTP 400 error',
      JSON.stringify(jsonInvalidPage)
    );

    const testRules = [
      {
        scope: 'STATE',
        state: 'Bihar',
        ruleCode: 'TEST-BR-01',
        category: 'Helmet',
        title: 'Riding without Helmet',
        description: 'Mandatory helmet rule for two-wheeler rider and pillion.',
        vehicleType: 'TwoWheeler',
        applicableVehicleTypes: ['TwoWheeler'],
        fineAmount: 1000,
        legalSection: 'Section 194D',
        sourceName: 'Bihar Transport',
        sourceUrl: 'https://transport.bihar.gov.in',
        status: 'VERIFIED'
      },
      {
        scope: 'CITY',
        state: 'Bihar',
        city: 'Patna',
        ruleCode: 'TEST-PAT-01',
        category: 'No Parking',
        title: 'Patna Urban Towing & No Parking Fine',
        description: 'Strict no parking zone fine in Patna urban corridor.',
        vehicleType: 'All',
        applicableVehicleTypes: ['All'],
        fineAmount: 1500,
        legalSection: 'Patna Municipal Traffic Bye-Law 2021',
        sourceName: 'Patna Traffic Police',
        sourceUrl: 'https://patnatrafficpolice.bihar.gov.in',
        status: 'VERIFIED'
      },
      {
        scope: 'STATE',
        state: 'Bihar',
        ruleCode: 'TEST-BR-02',
        category: 'Seatbelt',
        title: 'Driving without Seatbelt',
        description: 'Mandatory seatbelt rule for four-wheeler drivers.',
        vehicleType: 'FourWheeler',
        applicableVehicleTypes: ['FourWheeler'],
        fineAmount: 1000,
        legalSection: 'Section 194B(1)',
        sourceName: 'Bihar Transport',
        sourceUrl: 'https://transport.bihar.gov.in',
        status: 'VERIFIED'
      },
      {
        scope: 'CENTRAL',
        state: null,
        ruleCode: 'TEST-MVA-CENTRAL-01',
        category: 'Drunk Driving',
        title: 'Drunk Driving Under Influence of Alcohol',
        description: 'Operating motor vehicle under the influence of drugs or alcohol.',
        vehicleType: 'All',
        applicableVehicleTypes: ['All'],
        fineAmount: 10000,
        legalSection: 'Section 185',
        sourceName: 'MoRTH',
        sourceUrl: 'https://morth.nic.in',
        status: 'VERIFIED'
      },
      {
        scope: 'STATE',
        state: 'Bihar',
        ruleCode: 'TEST-BR-UNVERIFIED',
        category: 'Overloading',
        title: 'State Skeleton Overloading Rule (Unverified)',
        description: 'State overloading rule requiring gazette verification.',
        vehicleType: 'Goods',
        applicableVehicleTypes: ['Goods'],
        fineAmount: null,
        legalSection: 'Section 194(1)',
        sourceName: 'Bihar Transport (Verification Pending)',
        sourceUrl: 'https://transport.bihar.gov.in',
        status: 'REQUIRES_VERIFICATION'
      }
    ];

    await TrafficRule.insertMany(testRules);

    const resCombined = await fetch(`${trafficRulesBaseUrl}/state/Bihar?limit=50`);
    const jsonCombined = await resCombined.json();
    const hasCentral = jsonCombined.data.some(r => r.scope === 'CENTRAL');
    const hasState = jsonCombined.data.some(r => r.scope === 'STATE' && r.state === 'Bihar');
    assert(
      resCombined.status === 200 && hasCentral && hasState,
      'Test 4: Combined State retrieval returns both Central rules and State-specific rules',
      `Total rules: ${jsonCombined.data.length}`
    );

    const resLower = await fetch(`${baseUrl}/bihar?scope=STATE`);
    const jsonLower = await resLower.json();
    const resUpper = await fetch(`${baseUrl}/BIHAR?scope=STATE`);
    const jsonUpper = await resUpper.json();
    assert(
      resLower.status === 200 && jsonLower.data.length === jsonUpper.data.length && jsonLower.data.length >= 2,
      'Test 5: Case-insensitive state lookup (/bihar vs /BIHAR) produces identical results',
      `Lower length: ${jsonLower.data.length}, Upper length: ${jsonUpper.data.length}`
    );

    const resCategory = await fetch(`${baseUrl}/Bihar?category=Helmet&scope=STATE`);
    const jsonCategory = await resCategory.json();
    assert(
      resCategory.status === 200 && jsonCategory.data.length >= 1 && jsonCategory.data.every(r => r.category.toLowerCase() === 'helmet'),
      'Test 6: Category filter (?category=Helmet) returns matching rules only',
      JSON.stringify(jsonCategory)
    );

    const resVehicle = await fetch(`${baseUrl}/Bihar?vehicleType=TwoWheeler&scope=STATE`);
    const jsonVehicle = await resVehicle.json();
    assert(
      resVehicle.status === 200 && jsonVehicle.data.length >= 1 && jsonVehicle.data.every(r => r.vehicleType.toLowerCase() === 'twowheeler'),
      'Test 7: Vehicle type filter (?vehicleType=TwoWheeler) returns matching rules only',
      JSON.stringify(jsonVehicle)
    );

    const resPage1 = await fetch(`${baseUrl}/Bihar?page=1&limit=2&scope=STATE`);
    const jsonPage1 = await resPage1.json();
    assert(
      resPage1.status === 200 &&
      jsonPage1.data.length === 2 &&
      jsonPage1.pagination.page === 1 &&
      jsonPage1.pagination.limit === 2 &&
      jsonPage1.pagination.total >= 3,
      'Test 8: Pagination page 1 limit 2 returns 2 items with proper metadata',
      JSON.stringify(jsonPage1)
    );

    const resSearch = await fetch(`${trafficRulesBaseUrl}/search?q=Drunk`);
    const jsonSearch = await resSearch.json();
    assert(
      resSearch.status === 200 && jsonSearch.data.length >= 1 && jsonSearch.data.some(r => r.ruleCode === 'TEST-MVA-CENTRAL-01'),
      'Test 9: Search endpoint (?q=Drunk) correctly matches title/description',
      JSON.stringify(jsonSearch)
    );

    const resDetail = await fetch(`${trafficRulesBaseUrl}/TEST-BR-01`);
    const jsonDetail = await resDetail.json();
    assert(
      resDetail.status === 200 && jsonDetail.data && jsonDetail.data.ruleCode === 'TEST-BR-01',
      'Test 10: Single rule detail lookup by ruleCode (TEST-BR-01) returns exact rule object',
      JSON.stringify(jsonDetail)
    );

    const resUnverified = await fetch(`${trafficRulesBaseUrl}/TEST-BR-UNVERIFIED`);
    const jsonUnverified = await resUnverified.json();
    assert(
      resUnverified.status === 200 && jsonUnverified.data.status === 'REQUIRES_VERIFICATION' && jsonUnverified.data.fineAmount === null,
      'Test 11: Unverified rules preserve status REQUIRES_VERIFICATION and null fine without fabrication',
      JSON.stringify(jsonUnverified)
    );

    const resApplicable = await fetch(`${trafficRulesBaseUrl}/applicable?state=Bihar&city=Patna`);
    const jsonApplicable = await resApplicable.json();
    const hasCityRule = jsonApplicable.data.some(r => r.scope === 'CITY' && r.city === 'Patna');
    const hasStateRule = jsonApplicable.data.some(r => r.scope === 'STATE' && r.state === 'Bihar');
    const hasCentralRule = jsonApplicable.data.some(r => r.scope === 'CENTRAL');

    assert(
      resApplicable.status === 200 && hasCityRule && hasStateRule && hasCentralRule,
      'Test 12: GET /api/traffic-rules/applicable resolves City ➔ State ➔ Central rules hierarchically',
      JSON.stringify(jsonApplicable)
    );

    const resCity = await fetch(`${trafficRulesBaseUrl}/city/Patna`);
    const jsonCity = await resCity.json();
    assert(
      resCity.status === 200 && jsonCity.data.some(r => r.city === 'Patna'),
      'Test 13: GET /api/traffic-rules/city/Patna fetches city-specific rules',
      JSON.stringify(jsonCity)
    );

    await TrafficRule.deleteMany({
      $or: [
        { state: 'TestState' },
        { ruleCode: { $regex: /^TEST-/ } }
      ]
    });
    console.log('\nTemporary test data cleaned up from database.');

  } catch (err) {
    console.error('Unhandled Test Execution Error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
    await mongoose.connection.close();
    console.log(`\n==================================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  }
};

runTests();
