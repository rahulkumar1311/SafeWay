import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import TrafficRule from '../models/TrafficRule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data/traffic-rules');

const loadJsonFile = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[Seed Warning] File not found: ${filePath}`);
    return [];
  }
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(fileContent);
};

export const seedTrafficRules = async () => {
  console.log('====================================================');
  console.log(' STARTING GOVERNMENT TRAFFIC RULES DATA SEEDING ');
  console.log('====================================================\n');

  try {
    await connectDB();

    const centralRules = loadJsonFile('central_rules.json');
    const stateRules = loadJsonFile('state_rules.json');
    const trafficSigns = loadJsonFile('traffic_signs.json');
    const stateSkeletons = loadJsonFile('state_skeletons.json');

    const allRecords = [
      ...centralRules,
      ...stateRules,
      ...trafficSigns,
      ...stateSkeletons
    ];

    console.log(`Loaded ${allRecords.length} records across data files.\n`);

    let insertedCount = 0;
    let updatedCount = 0;
    let verifiedCount = 0;
    let unverifiedCount = 0;
    let centralCount = 0;
    let stateCount = 0;
    const stateBreakdown = {};

    for (const record of allRecords) {
      // Basic record validation
      if (!record.title || !record.category || !record.sourceUrl) {
        console.error(`[Skip] Record missing mandatory fields: ${JSON.stringify(record)}`);
        continue;
      }

      const scope = record.scope || (record.state ? 'STATE' : 'CENTRAL');
      const state = scope === 'STATE' ? record.state : null;
      const ruleCode = record.ruleCode || `${scope === 'STATE' && state ? state.toUpperCase().slice(0, 3) : 'MVA'}-${record.category.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Upsert filter: match by ruleCode OR (scope + state + title + legalSection)
      const query = {
        $or: [
          { ruleCode: ruleCode },
          { scope: scope, state: state, title: record.title, legalSection: record.legalSection }
        ]
      };

      // Check existing document to prevent overwriting verified data with unverified skeleton data
      const existingDoc = await TrafficRule.findOne(query);

      if (existingDoc && existingDoc.status === 'VERIFIED' && record.status === 'REQUIRES_VERIFICATION') {
        console.log(`[Preserved] Keeping verified rule for ${ruleCode} / ${record.title}`);
        verifiedCount++;
        if (existingDoc.scope === 'CENTRAL') centralCount++;
        else {
          stateCount++;
          stateBreakdown[existingDoc.state] = (stateBreakdown[existingDoc.state] || 0) + 1;
        }
        continue;
      }

      const ruleData = {
        scope,
        state,
        ruleCode,
        category: record.category,
        title: record.title,
        description: record.description,
        applicableVehicleTypes: record.applicableVehicleTypes || (record.vehicleType ? [record.vehicleType] : ['All']),
        vehicleType: record.vehicleType || (record.applicableVehicleTypes?.[0] || 'All'),
        violation: record.violation || record.description,
        fineAmount: record.fineAmount !== undefined ? record.fineAmount : null,
        additionalPenalty: record.additionalPenalty || '',
        legalSection: record.legalSection || 'Motor Vehicles Act, 1988',
        sourceName: record.sourceName || 'Official Transport Department',
        sourceUrl: record.sourceUrl,
        governmentDocument: record.governmentDocument || '',
        effectiveFrom: record.effectiveFrom ? new Date(record.effectiveFrom) : null,
        lastVerifiedAt: record.lastVerifiedAt ? new Date(record.lastVerifiedAt) : new Date(),
        lastUpdated: record.lastVerifiedAt ? new Date(record.lastVerifiedAt) : new Date(),
        status: record.status || 'VERIFIED',
        language: record.language || 'en',
        notes: record.notes || ''
      };

      if (existingDoc) {
        await TrafficRule.updateOne({ _id: existingDoc._id }, { $set: ruleData });
        updatedCount++;
      } else {
        await TrafficRule.create(ruleData);
        insertedCount++;
      }

      if (ruleData.status === 'VERIFIED') verifiedCount++;
      else unverifiedCount++;

      if (ruleData.scope === 'CENTRAL') {
        centralCount++;
      } else {
        stateCount++;
        if (ruleData.state) {
          stateBreakdown[ruleData.state] = (stateBreakdown[ruleData.state] || 0) + 1;
        }
      }
    }

    console.log('====================================================');
    console.log(' SEED IMPORT SUMMARY REPORT ');
    console.log('====================================================');
    console.log(`Total Records Processed:       ${allRecords.length}`);
    console.log(`Newly Inserted Records:         ${insertedCount}`);
    console.log(`Updated Existing Records:       ${updatedCount}`);
    console.log(`----------------------------------------------------`);
    console.log(`Verified Government Rules:      ${verifiedCount}`);
    console.log(`Requires Verification Rules:   ${unverifiedCount}`);
    console.log(`----------------------------------------------------`);
    console.log(`Central Scope Rules (National): ${centralCount}`);
    console.log(`State Scope Rules (Specific):   ${stateCount}`);
    console.log(`----------------------------------------------------`);
    console.log('State Breakdown:');
    Object.entries(stateBreakdown).forEach(([st, cnt]) => {
      console.log(`  - ${st}: ${cnt} rules`);
    });
    console.log('====================================================\n');

  } catch (error) {
    console.error('Fatal Seeding Error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed.');
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedTrafficRules();
}
