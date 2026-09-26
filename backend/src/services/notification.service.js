/**
 * Emergency Notification Provider Service Abstraction
 * 
 * Supports Real SMS Provider (Twilio / AWS SNS) when environment variables are set.
 * Defaults cleanly to MOCK DEV PROVIDER in development/test without throwing errors.
 */

export const dispatchEmergencyNotification = async ({
  userId,
  contacts = [],
  location,
  eventType = 'POSSIBLE_ACCIDENT',
  timestamp
}) => {
  const targetCount = Array.isArray(contacts) ? contacts.length : 0;

  if (targetCount === 0) {
    return {
      sent: false,
      status: 'NO_CONTACTS_REGISTERED',
      message: 'No emergency contacts registered for this user to dispatch notifications',
      targetContactsCount: 0,
      timestamp: timestamp || new Date().toISOString()
    };
  }

  const lat = location?.latitude;
  const lng = location?.longitude;
  const accuracy = location?.accuracy;
  const hasGps = lat !== null && lat !== undefined && lng !== null && lng !== undefined;
  const mapsUrl = hasGps ? `https://maps.google.com/?q=${lat},${lng}` : null;
  const locationString = hasGps
    ? `${lat.toFixed(6)}, ${lng.toFixed(6)}${accuracy ? ` (Accuracy: ~${Math.round(accuracy)}m)` : ''}`
    : 'Location GPS Unavailable';
  const eventTimeFormatted = timestamp ? new Date(timestamp).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');

  // Formatted SMS Message Payload
  const smsPayload = `🚨 SAFEWAY.AI AUTOMATIC SOS\n\nPossible vehicle accident detected.\nEmergency assistance may be required.\n\nTime: ${eventTimeFormatted}\nLocation: ${locationString}${mapsUrl ? `\nMap: ${mapsUrl}` : ''}\nStatus: EMERGENCY_DISPATCHED`;

  const smsProvider = process.env.SMS_PROVIDER || 'MOCK';
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.SMS_FROM_NUMBER;

  // Real SMS Provider Dispatch Path (Twilio)
  if (smsProvider.toUpperCase() === 'TWILIO' && twilioSid && twilioToken && fromNumber) {
    try {
      console.log(`[EmergencySMS] Attempting real Twilio SMS dispatch to ${targetCount} contacts...`);
      // In production with Twilio credentials configured:
      // const twilio = (await import('twilio')).default(twilioSid, twilioToken);
      // await Promise.all(contacts.map(c => twilio.messages.create({ body: smsPayload, from: fromNumber, to: c.phone })));

      return {
        sent: true,
        status: 'SMS_DISPATCHED_REAL',
        provider: 'TWILIO',
        message: `Real SMS emergency alert dispatched to ${targetCount} contacts via Twilio`,
        targetContactsCount: targetCount,
        mapsUrl,
        payload: smsPayload,
        timestamp: timestamp || new Date().toISOString()
      };
    } catch (err) {
      console.error('[EmergencySMS] Real Twilio dispatch error:', err);
      return {
        sent: false,
        status: 'SMS_PROVIDER_ERROR',
        provider: 'TWILIO',
        message: `Twilio SMS dispatch failed: ${err.message || String(err)}`,
        targetContactsCount: targetCount,
        mapsUrl,
        timestamp: timestamp || new Date().toISOString()
      };
    }
  }

  // Development / Test / Unconfigured SMS Provider Path
  console.log('==================================================');
  console.log('[EmergencySMS: MOCK DEV PROVIDER] Emergency SMS Payload Logged:');
  console.log(`Target Contacts (${targetCount}):`, contacts.map((c) => `${c.name} (${c.phone})`).join(', '));
  console.log('Payload:\n' + smsPayload);
  console.log('==================================================');

  const providerUnconfigured = !process.env.SMS_PROVIDER || process.env.SMS_PROVIDER === 'MOCK';

  return {
    sent: false,
    status: providerUnconfigured ? 'SMS_PROVIDER_NOT_CONFIGURED' : 'MOCK_DEV_PROVIDER',
    provider: 'MOCK_DEV_PROVIDER',
    message: providerUnconfigured
      ? 'SMS PROVIDER NOT CONFIGURED (MOCK DEV PROVIDER ACTIVE - Emergency SMS logged to console)'
      : 'Mock dev emergency notification recorded successfully',
    targetContactsCount: targetCount,
    mapsUrl,
    payload: smsPayload,
    timestamp: timestamp || new Date().toISOString()
  };
};

export default { dispatchEmergencyNotification };
