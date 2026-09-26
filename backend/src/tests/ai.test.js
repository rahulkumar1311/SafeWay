import http from 'http';
import app from '../app.js';
import { config } from '../config/env.js';

const runAiTests = async () => {
  console.log('==================================================');
  console.log('STARTING BACKEND AI PROXY INTEGRATION TEST SUITE');
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
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}/api/ai`;

    // ----------------------------------------------------
    // TEST 1: Missing frameData returns 400 Bad Request
    // ----------------------------------------------------
    const resNoFrame = await fetch(`${baseUrl}/drowsiness/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test_session' })
    });
    const jsonNoFrame = await resNoFrame.json();
    assert(
      resNoFrame.status === 400 && jsonNoFrame.success === false,
      'Test 1: Rejects missing frameData with HTTP 400 Bad Request',
      JSON.stringify(jsonNoFrame)
    );

    // ----------------------------------------------------
    // TEST 2: Missing imageData returns 400 Bad Request
    // ----------------------------------------------------
    const resNoImage = await fetch(`${baseUrl}/traffic-sign/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const jsonNoImage = await resNoImage.json();
    assert(
      resNoImage.status === 400 && jsonNoImage.success === false,
      'Test 2: Rejects missing imageData with HTTP 400 Bad Request',
      JSON.stringify(jsonNoImage)
    );

    // ----------------------------------------------------
    // TEST 3: AI Service Unavailable (pointing to unused port) returns HTTP 503
    // ----------------------------------------------------
    const originalDrowsinessUrl = config.aiDrowsinessServiceUrl;
    config.aiDrowsinessServiceUrl = 'http://localhost:59999/predict/drowsiness';

    const resUnavailable = await fetch(`${baseUrl}/drowsiness/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test_session', frameData: 'some_base64_data' })
    });
    const jsonUnavailable = await resUnavailable.json();
    assert(
      resUnavailable.status === 503 && jsonUnavailable.success === false,
      'Test 3: AI service connection failure returns HTTP 503 Service Unavailable',
      JSON.stringify(jsonUnavailable)
    );

    // Restore original URL
    config.aiDrowsinessServiceUrl = originalDrowsinessUrl;

    // ----------------------------------------------------
    // TEST 4: AI Service Timeout returns HTTP 504 Gateway Timeout
    // ----------------------------------------------------
    // Create a mock slow HTTP server to trigger timeout
    const slowServer = http.createServer((req, res) => {
      // Intentionally do not respond immediately
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ drowsinessScore: 10, isDrowsy: false }));
      }, 500);
    });

    await new Promise((resolve) => slowServer.listen(0, resolve));
    const slowPort = slowServer.address().port;

    const originalTimeout = config.aiServiceTimeoutMs;
    config.aiDrowsinessServiceUrl = `http://localhost:${slowPort}/predict/drowsiness`;
    config.aiServiceTimeoutMs = 100; // Trigger timeout quickly

    const resTimeout = await fetch(`${baseUrl}/drowsiness/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test_session', frameData: 'some_base64_data' })
    });
    const jsonTimeout = await resTimeout.json();
    assert(
      resTimeout.status === 504 && jsonTimeout.success === false,
      'Test 4: AI service request timeout returns HTTP 504 Gateway Timeout',
      JSON.stringify(jsonTimeout)
    );

    // Clean up mock slow server and restore config
    slowServer.close();
    config.aiDrowsinessServiceUrl = originalDrowsinessUrl;
    config.aiServiceTimeoutMs = originalTimeout;

  } catch (err) {
    console.error('Unhandled AI integration test error:', err);
    failed++;
  } finally {
    if (server) await new Promise((r) => server.close(r));
    console.log(`\n==================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);
  }
};

runAiTests();
