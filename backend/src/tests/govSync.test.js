import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import http from 'node:http';
import TrafficRule from '../models/TrafficRule.js';
import { syncFromDataGov } from '../services/govTrafficData.service.js';

let mongoServer;
let mockServer;
let mockPort;
let mockResponseBody = '';
let mockStatusCode = 200;
let mockDelayMs = 0;

describe('Data.gov.in Government Traffic Data Sync Service', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Setup local mock HTTP server
    mockServer = http.createServer((req, res) => {
      if (mockDelayMs > 0) {
        setTimeout(() => {
          res.writeHead(mockStatusCode, { 'Content-Type': 'application/json' });
          res.end(mockResponseBody);
        }, mockDelayMs);
      } else {
        res.writeHead(mockStatusCode, { 'Content-Type': 'application/json' });
        res.end(mockResponseBody);
      }
    });

    await new Promise((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => {
        mockPort = mockServer.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (mockServer) mockServer.close();
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await TrafficRule.deleteMany({});
    mockStatusCode = 200;
    mockDelayMs = 0;
    mockResponseBody = '';
  });

  test('Test 1: Successful API fetch & synchronization imports new records into MongoDB', async () => {
    mockResponseBody = JSON.stringify({
      records: [
        {
          rule_title: 'Government Rule 1: Mandatory Helmet',
          description: 'Riders must wear ISI approved helmets',
          offence_category: 'Helmet',
          fine_amount: 1000,
          section: 'Section 129 MVA',
          state_name: 'Bihar',
          rule_code: 'GOV-BR-01'
        },
        {
          rule_title: 'Government Rule 2: Speeding',
          description: 'Driving above posted speed limits',
          offence_category: 'Speed Limit',
          fine_amount: 2000,
          section: 'Section 183 MVA',
          state_name: 'Bihar',
          rule_code: 'GOV-BR-02'
        }
      ]
    });

    const mockUrl = `http://127.0.0.1:${mockPort}/api/rules`;
    const summary = await syncFromDataGov({ apiUrl: mockUrl, enabled: true });

    assert.equal(summary.source, 'data.gov.in');
    assert.equal(summary.fetched, 2);
    assert.equal(summary.inserted, 2);
    assert.equal(summary.updated, 0);
    assert.equal(summary.failed, 0);

    const storedCount = await TrafficRule.countDocuments();
    assert.equal(storedCount, 2);

    const helmetRule = await TrafficRule.findOne({ ruleCode: 'GOV-BR-01' });
    assert.ok(helmetRule);
    assert.equal(helmetRule.fineAmount, 1000);
    assert.equal(helmetRule.legalSection, 'Section 129 MVA');
    assert.equal(helmetRule.sourceName, 'data.gov.in');
    assert.equal(helmetRule.status, 'VERIFIED');
  });

  test('Test 2: Duplicate prevention & upsert updates existing records without creating duplicates', async () => {
    mockResponseBody = JSON.stringify({
      records: [
        {
          rule_title: 'Government Rule 1: Mandatory Helmet',
          description: 'Updated description: ISI helmet required',
          offence_category: 'Helmet',
          fine_amount: 1500,
          section: 'Section 129 MVA',
          state_name: 'Bihar',
          rule_code: 'GOV-BR-01'
        }
      ]
    });

    const mockUrl = `http://127.0.0.1:${mockPort}/api/rules`;
    
    // First sync (Insert)
    await syncFromDataGov({ apiUrl: mockUrl, enabled: true });

    // Second sync (Update)
    const summary2 = await syncFromDataGov({ apiUrl: mockUrl, enabled: true });
    assert.equal(summary2.fetched, 1);
    assert.equal(summary2.inserted, 0);
    assert.equal(summary2.updated, 1);

    const storedCount = await TrafficRule.countDocuments();
    assert.equal(storedCount, 1);

    const updatedRule = await TrafficRule.findOne({ ruleCode: 'GOV-BR-01' });
    assert.equal(updatedRule.fineAmount, 1500);
    assert.equal(updatedRule.description, 'Updated description: ISI helmet required');
  });

  test('Test 3: Missing fine amounts stored as null without fabrication', async () => {
    mockResponseBody = JSON.stringify({
      records: [
        {
          rule_title: 'Unspecified Fine Rule',
          description: 'General traffic advisory',
          offence_category: 'Advisory',
          section: 'Section 190 MVA',
          rule_code: 'GOV-BR-03'
        }
      ]
    });

    const mockUrl = `http://127.0.0.1:${mockPort}/api/rules`;
    const summary = await syncFromDataGov({ apiUrl: mockUrl, enabled: true });
    assert.equal(summary.inserted, 1);

    const rule = await TrafficRule.findOne({ ruleCode: 'GOV-BR-03' });
    assert.ok(rule);
    assert.equal(rule.fineAmount, null);
    assert.equal(rule.status, 'REQUIRES_VERIFICATION');
  });

  test('Test 4: Handles empty API responses cleanly without throwing errors', async () => {
    mockResponseBody = JSON.stringify({ records: [] });
    const mockUrl = `http://127.0.0.1:${mockPort}/api/rules`;

    const summary = await syncFromDataGov({ apiUrl: mockUrl, enabled: true });
    assert.equal(summary.fetched, 0);
    assert.equal(summary.inserted, 0);
    assert.ok(summary.message.includes('0 traffic rule records'));
  });

  test('Test 5: Handles HTTP 500 error response gracefully', async () => {
    mockStatusCode = 500;
    mockResponseBody = JSON.stringify({ error: 'Internal Server Error' });
    const mockUrl = `http://127.0.0.1:${mockPort}/api/rules`;

    await assert.rejects(
      async () => {
        await syncFromDataGov({ apiUrl: mockUrl, enabled: true });
      },
      (err) => {
        assert.equal(err.statusCode, 500);
        return true;
      }
    );
  });

  test('Test 6: Handles invalid non-JSON payload error gracefully', async () => {
    mockResponseBody = '<html><body>502 Bad Gateway</body></html>';
    const mockUrl = `http://127.0.0.1:${mockPort}/api/rules`;

    await assert.rejects(
      async () => {
        await syncFromDataGov({ apiUrl: mockUrl, enabled: true });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('Invalid JSON payload'));
        return true;
      }
    );
  });

  test('Test 7: Handles timeout correctly when API response exceeds threshold', async () => {
    mockDelayMs = 300;
    mockResponseBody = JSON.stringify({ records: [] });
    const mockUrl = `http://127.0.0.1:${mockPort}/api/rules`;

    await assert.rejects(
      async () => {
        await syncFromDataGov({ apiUrl: mockUrl, enabled: true, timeout: 100 });
      },
      (err) => {
        assert.equal(err.statusCode, 504);
        assert.ok(err.message.includes('timed out'));
        return true;
      }
    );
  });
});
