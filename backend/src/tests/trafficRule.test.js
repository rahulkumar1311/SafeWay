import test from 'node:test';
import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import TrafficRule from '../models/TrafficRule.js';

test('Traffic Rules API & Fallback Dataset Unit Tests', async () => {
  let server;
  let baseUrl;
  let trafficRulesBaseUrl;

  try {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api/rules`;
    trafficRulesBaseUrl = `http://localhost:${port}/api/traffic-rules`;

    if (mongoose.connection.readyState === 1) {
      await TrafficRule.deleteMany({
        $or: [
          { state: 'TestState' },
          { ruleCode: { $regex: /^TEST-/ } }
        ]
      });
    }

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
    if (!modelError || !modelError.errors || !modelError.errors.sourceUrl) {
      throw new Error('Model validation failed to catch invalid sourceUrl format');
    }

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
    if (!negativeFineErr || !negativeFineErr.errors || !negativeFineErr.errors.fineAmount) {
      throw new Error('Model validation failed to reject negative fineAmount values');
    }

    const resCombinedUnknown = await fetch(`${baseUrl}/UnknownState999`);
    const jsonCombinedUnknown = await resCombinedUnknown.json();
    const unknownData = Array.isArray(jsonCombinedUnknown.data) ? jsonCombinedUnknown.data : jsonCombinedUnknown.data?.rules || [];
    if (resCombinedUnknown.status !== 200 || !jsonCombinedUnknown.success || !unknownData.every(r => r.scope === 'CENTRAL')) {
      throw new Error('Unknown state query failed');
    }

    const resEmptyState = await fetch(`${baseUrl}/UnknownState999?scope=STATE`);
    const jsonEmptyState = await resEmptyState.json();
    const emptyData = Array.isArray(jsonEmptyState.data) ? jsonEmptyState.data : jsonEmptyState.data?.rules || [];
    if (resEmptyState.status !== 200 || !jsonEmptyState.success || emptyData.length !== 0) {
      throw new Error('Unknown state with scope=STATE failed');
    }

    const resInvalidPage = await fetch(`${baseUrl}/TestState?page=abc`);
    const jsonInvalidPage = await resInvalidPage.json();
    if (resInvalidPage.status !== 400 || jsonInvalidPage.success !== false) {
      throw new Error('Invalid page parameter test failed');
    }

    const resCombined = await fetch(`${trafficRulesBaseUrl}/state/Bihar?limit=50`);
    const jsonCombined = await resCombined.json();
    const combinedData = Array.isArray(jsonCombined.data) ? jsonCombined.data : jsonCombined.data?.rules || [];
    if (resCombined.status !== 200 || combinedData.length === 0) {
      throw new Error('Combined State retrieval failed');
    }

    const resLower = await fetch(`${baseUrl}/bihar?scope=STATE`);
    const jsonLower = await resLower.json();
    const lowerData = Array.isArray(jsonLower.data) ? jsonLower.data : jsonLower.data?.rules || [];
    const resUpper = await fetch(`${baseUrl}/BIHAR?scope=STATE`);
    const jsonUpper = await resUpper.json();
    const upperData = Array.isArray(jsonUpper.data) ? jsonUpper.data : jsonUpper.data?.rules || [];
    if (resLower.status !== 200 || lowerData.length !== upperData.length) {
      throw new Error('Case-insensitive state lookup failed');
    }

    const resSearch = await fetch(`${trafficRulesBaseUrl}/search?q=Seat`);
    const jsonSearch = await resSearch.json();
    const searchData = Array.isArray(jsonSearch.data) ? jsonSearch.data : jsonSearch.data?.rules || [];
    if (resSearch.status !== 200 || searchData.length === 0) {
      throw new Error('Search endpoint failed');
    }

    const resApplicable = await fetch(`${trafficRulesBaseUrl}/applicable?state=Bihar`);
    const jsonApplicable = await resApplicable.json();
    const applicableData = Array.isArray(jsonApplicable.data) ? jsonApplicable.data : jsonApplicable.data?.rules || [];
    if (resApplicable.status !== 200 || applicableData.length === 0) {
      throw new Error('GET /api/traffic-rules/applicable failed');
    }

  } finally {
    if (server) {
      await new Promise(r => server.close(r));
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
});
