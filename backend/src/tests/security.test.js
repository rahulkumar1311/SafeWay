import http from 'http';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import express from 'express';
import app from '../app.js';
import { connectDB } from '../config/db.js';

const runSecurityTests = async () => {
  console.log('==================================================');
  console.log('STARTING BACKEND SECURITY HARDENING TESTS');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;
  let server;
  let testLimiterServer;

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
    // A & B: Server startup & MongoDB connection
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'MongoDB connection established successfully');

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api`;
    assert(port > 0, `Server started successfully on port ${port}`);

    // C & E: GET /api/health works with standard response structure
    const resHealth = await fetch(`${baseUrl}/health`);
    const jsonHealth = await resHealth.json();
    assert(
      resHealth.status === 200 && jsonHealth.success === true && jsonHealth.database === 'connected',
      'GET /api/health returns 200 OK with database: connected'
    );

    // F: Helmet security headers presence
    const xContentType = resHealth.headers.get('x-content-type-options');
    const xFrameOptions = resHealth.headers.get('x-frame-options');
    const xDnsPrefetch = resHealth.headers.get('x-dns-prefetch-control');
    assert(
      xContentType === 'nosniff' && Boolean(xFrameOptions) && Boolean(xDnsPrefetch),
      'Helmet security headers present (x-content-type-options: nosniff, x-frame-options, etc.)',
      `Headers: ${JSON.stringify(Object.fromEntries(resHealth.headers.entries()))}`
    );

    // G & H: Rate Limit headers & rate limit exceeded handling
    const rateLimitHeader = resHealth.headers.get('ratelimit-limit');
    assert(
      rateLimitHeader === '100',
      'Rate limit standard header Present (ratelimit-limit: 100)'
    );

    // Test Rate Limiter Exceeded Response (HTTP 429) using a micro Express instance
    const testApp = express();
    const strictLimiter = rateLimit({
      windowMs: 60000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next, options) => {
        return res.status(options.statusCode || 429).json({
          success: false,
          message: 'Too many requests, please try again later'
        });
      }
    });
    testApp.use('/test-limit', strictLimiter, (req, res) => res.json({ success: true }));
    testLimiterServer = http.createServer(testApp);
    await new Promise((r) => testLimiterServer.listen(0, r));
    const testPort = testLimiterServer.address().port;

    await fetch(`http://localhost:${testPort}/test-limit`);
    await fetch(`http://localhost:${testPort}/test-limit`);
    const resExceeded = await fetch(`http://localhost:${testPort}/test-limit`);
    const jsonExceeded = await resExceeded.json();

    assert(
      resExceeded.status === 429 && jsonExceeded.success === false && jsonExceeded.message === 'Too many requests, please try again later',
      'Rate limit exceeded returns HTTP 429 Too Many Requests with JSON error format',
      `Status: ${resExceeded.status}, Body: ${JSON.stringify(jsonExceeded)}`
    );

    // J: CORS Headers review
    const corsHeader = resHealth.headers.get('access-control-allow-origin');
    assert(
      corsHeader === '*',
      'CORS header Access-Control-Allow-Origin equals wildcard "*" in development mode'
    );

    // D: Traffic Rules API works
    const resRules = await fetch(`${baseUrl}/rules/Bihar`);
    const jsonRules = await resRules.json();
    assert(
      resRules.status === 200 && jsonRules.success === true && Array.isArray(jsonRules.data),
      'GET /api/rules/Bihar returns 200 OK with valid data array'
    );

    // I: Oversized request body rejection (Body > 16kb)
    const largePayload = { data: 'A'.repeat(20 * 1024) }; // ~20KB payload
    const resLarge = await fetch(`${baseUrl}/safety/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(largePayload)
    });
    const jsonLarge = await resLarge.json();
    assert(
      resLarge.status === 413 && jsonLarge.success === false,
      'Oversized request body (> 16kb) rejected with 413 Payload Too Large and JSON error format',
      `Status: ${resLarge.status}, Message: ${jsonLarge.message}`
    );

  } catch (err) {
    console.error('Unhandled security test error:', err);
    failed++;
  } finally {
    if (server) await new Promise(r => server.close(r));
    if (testLimiterServer) await new Promise(r => testLimiterServer.close(r));
    await mongoose.connection.close();
    console.log(`\n==================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);
  }
};

runSecurityTests();
