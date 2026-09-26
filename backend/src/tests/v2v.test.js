import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceMeters, calculateCardinalDirection } from '../services/v2v.service.js';

test('V2V Distance Calculation (Haversine Formula)', () => {
  // Test point A: (24.5000, 86.5000), Point B: (24.5020, 86.5020)
  const dist = calculateDistanceMeters(24.5000, 86.5000, 24.5020, 86.5020);
  assert.ok(dist > 250 && dist < 350, `Distance should be ~290m, got ${dist}m`);

  // Same coordinates should return 0
  const zeroDist = calculateDistanceMeters(24.5000, 86.5000, 24.5000, 86.5000);
  assert.equal(zeroDist, 0);
});

test('V2V Cardinal Direction Calculation', () => {
  // Moving North
  const dirNorth = calculateCardinalDirection(24.5000, 86.5000, 24.5100, 86.5000);
  assert.ok(dirNorth.includes('Ahead') || dirNorth.includes('North'));

  // Moving East
  const dirEast = calculateCardinalDirection(24.5000, 86.5000, 24.5000, 86.5100);
  assert.ok(dirEast.includes('Right') || dirEast.includes('East'));
});
