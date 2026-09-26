import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import EmergencyContact from '../models/EmergencyContact.js';

const runEmergencyTests = async () => {
  console.log('==================================================');
  console.log('STARTING EMERGENCY & NOTIFICATION MODULE TEST SUITE');
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
    const baseUrl = `http://localhost:${port}/api/emergency`;

    const testUserId = 'test_user_emg_999';
    await EmergencyContact.deleteMany({ userId: testUserId });

    // ----------------------------------------------------
    // TEST 1, 14: Valid Emergency Contact Creation & Persistence
    // ----------------------------------------------------
    const validContactPayload = {
      userId: testUserId,
      name: 'John Emergency',
      phone: '+919876543210',
      relationship: 'Father'
    };

    const resCreate = await fetch(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validContactPayload)
    });
    const jsonCreate = await resCreate.json();

    assert(
      resCreate.status === 201 && jsonCreate.success === true && Boolean(jsonCreate.data._id),
      'Test 1: Valid emergency contact creation returns 201 Created with valid ID',
      JSON.stringify(jsonCreate)
    );

    const createdContactId = jsonCreate.data._id;
    const dbContact = await EmergencyContact.findById(createdContactId);
    assert(
      dbContact !== null && dbContact.name === 'John Emergency' && dbContact.phone === '+919876543210',
      'Test 14: EmergencyContact document verified persisted in MongoDB database',
      JSON.stringify(dbContact)
    );

    // ----------------------------------------------------
    // TEST 2: Required phone validation
    // ----------------------------------------------------
    const resMissingPhone = await fetch(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId, name: 'No Phone', relationship: 'Friend' })
    });
    assert(resMissingPhone.status === 400, 'Test 2: Missing phone field rejects with HTTP 400');

    // ----------------------------------------------------
    // TEST 3: Required relationship validation
    // ----------------------------------------------------
    const resMissingRel = await fetch(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId, name: 'No Rel', phone: '+919876543210' })
    });
    assert(resMissingRel.status === 400, 'Test 3: Missing relationship field rejects with HTTP 400');

    // ----------------------------------------------------
    // TEST 4: Invalid phone format rejection
    // ----------------------------------------------------
    const resInvalidPhone = await fetch(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validContactPayload, phone: 'invalid-phone-xyz' })
    });
    assert(resInvalidPhone.status === 400, 'Test 4: Rejects invalid phone format with HTTP 400');

    // ----------------------------------------------------
    // TEST 5 & 6: Contact Retrieval & Multiple Contacts
    // ----------------------------------------------------
    await fetch(`${baseUrl}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        name: 'Jane Emergency',
        phone: '+919123456789',
        relationship: 'Mother'
      })
    });

    const resGet = await fetch(`${baseUrl}/contacts/${testUserId}`);
    const jsonGet = await resGet.json();
    assert(
      resGet.status === 200 && jsonGet.data.length >= 1,
      'Test 5 & 6: Contact retrieval returns emergency contacts for user',
      JSON.stringify(jsonGet)
    );

    // ----------------------------------------------------
    // TEST 7: Invalid ObjectId for update/delete
    // ----------------------------------------------------
    const resInvalidId = await fetch(`${baseUrl}/contacts/invalid_contact_id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' })
    });
    assert(resInvalidId.status === 400, 'Test 7: Rejects malformed contactId format with HTTP 400');

    // ----------------------------------------------------
    // TEST 8: Nonexistent contact ID
    // ----------------------------------------------------
    const fakeValidId = new mongoose.Types.ObjectId().toString();
    const resNotFound = await fetch(`${baseUrl}/contacts/${fakeValidId}`, {
      method: 'DELETE'
    });
    assert(resNotFound.status === 404, 'Test 8: Nonexistent contactId returns HTTP 404 Not Found');

    // ----------------------------------------------------
    // TEST 9 & 11: Emergency Trigger (SOS) & Notification Service Behavior
    // ----------------------------------------------------
    const sosPayload = {
      userId: testUserId,
      latitude: 25.61,
      longitude: 85.14,
      eventType: 'CRASH'
    };

    const resSOS = await fetch(`${baseUrl}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sosPayload)
    });
    const jsonSOS = await resSOS.json();

    assert(
      resSOS.status === 200 &&
      jsonSOS.success === true &&
      (jsonSOS.data.notification.status === 'SMS_PROVIDER_NOT_CONFIGURED' ||
       jsonSOS.data.notification.status === 'MOCK_DEV_PROVIDER' ||
       jsonSOS.data.notification.status === 'NOT_IMPLEMENTED_MVP'),
      'Test 9 & 11: Emergency SOS trigger retrieves contacts and calls notification abstraction cleanly',
      JSON.stringify(jsonSOS)
    );

    // ----------------------------------------------------
    // TEST 10: SOS behavior when user has no emergency contacts
    // ----------------------------------------------------
    const emptyUserId = 'no_contacts_user_000';
    const resSOSNoContacts = await fetch(`${baseUrl}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emptyUserId, latitude: 25.61, longitude: 85.14 })
    });
    const jsonSOSNoContacts = await resSOSNoContacts.json();

    assert(
      resSOSNoContacts.status === 200 &&
      jsonSOSNoContacts.data.contactsNotifiedCount === 0 &&
      jsonSOSNoContacts.data.notification.status === 'NO_CONTACTS_REGISTERED',
      'Test 10: Emergency SOS returns NO_CONTACTS_REGISTERED notification status when zero contacts registered',
      JSON.stringify(jsonSOSNoContacts)
    );

    // ----------------------------------------------------
    // TEST 17: Telemetry Impact Analysis - Normal Driving
    // ----------------------------------------------------
    const normalTelemetryRes = await fetch(`${baseUrl}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        latitude: 25.5941,
        longitude: 85.1376,
        speed: 55,
        decelerationG: 0.8,
        impactScore: 12
      })
    });
    const jsonNormalTelemetry = await normalTelemetryRes.json();
    assert(
      normalTelemetryRes.status === 200 && jsonNormalTelemetry.data.status === 'NORMAL_DRIVING' && !jsonNormalTelemetry.data.impactDetected,
      'Test 17: Normal driving telemetry returns status NORMAL_DRIVING without triggering alert',
      JSON.stringify(jsonNormalTelemetry)
    );

    // ----------------------------------------------------
    // TEST 18: Telemetry Impact Analysis - Severe Deceleration/Impact
    // ----------------------------------------------------
    const impactTelemetryRes = await fetch(`${baseUrl}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        latitude: 25.5941,
        longitude: 85.1376,
        speed: 70,
        decelerationG: 3.5,
        impactScore: 85
      })
    });
    const jsonImpactTelemetry = await impactTelemetryRes.json();
    assert(
      impactTelemetryRes.status === 200 && jsonImpactTelemetry.data.status === 'CONFIRMATION_PENDING' && jsonImpactTelemetry.data.impactDetected,
      'Test 18: Severe deceleration telemetry triggers status CONFIRMATION_PENDING with confirmation window',
      JSON.stringify(jsonImpactTelemetry)
    );

    // ----------------------------------------------------
    // TEST 19: Driver Cancellation of False Positive Alert
    // ----------------------------------------------------
    const cancelRes = await fetch(`${baseUrl}/accident/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        eventId: jsonImpactTelemetry.data.eventId
      })
    });
    const jsonCancel = await cancelRes.json();
    assert(
      cancelRes.status === 200 && jsonCancel.data.status === 'CANCELLED',
      'Test 19: User cancellation of false positive alert updates status to CANCELLED',
      JSON.stringify(jsonCancel)
    );

    // ----------------------------------------------------
    // TEST 20: Live GPS Location Update Endpoint
    // ----------------------------------------------------
    const locationRes = await fetch(`${baseUrl}/location/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        latitude: 25.5941,
        longitude: 85.1376,
        speed: 45
      })
    });
    const jsonLocation = await locationRes.json();
    assert(
      locationRes.status === 200 && jsonLocation.data.status === 'LOCATION_UPDATED',
      'Test 20: Live GPS location update endpoint returns HTTP 200 LOCATION_UPDATED',
      JSON.stringify(jsonLocation)
    );

    // Clean up temporary test data
    await EmergencyContact.deleteMany({ userId: testUserId });
    console.log('\nTemporary emergency test data cleaned up from database.');

  } catch (err) {
    console.error('Unhandled emergency test error:', err);
    failed++;
  } finally {
    if (server) await new Promise(r => server.close(r));
    await mongoose.connection.close();
    console.log(`\n==================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);
  }
};

runEmergencyTests();
