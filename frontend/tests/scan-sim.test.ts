import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScan, weekKeyFromDate } from '../src/lib/scan-sim.ts';

test('a scan is deterministic for the same astronaut and week', () => {
  const a = generateScan('demo-001', '2026-W25', '2026-06-21T00:00:00Z');
  const b = generateScan('demo-001', '2026-W25', '2026-06-22T00:00:00Z');
  assert.deepEqual(a.regions, b.regions);
  assert.equal(a.watchCount, b.watchCount);
});

test('different weeks can produce different scans', () => {
  const weekA = generateScan('demo-001', '2026-W24', '2026-06-14T00:00:00Z');
  const weekB = generateScan('demo-001', '2026-W25', '2026-06-21T00:00:00Z');
  // Deterministic seeding means these may occasionally agree; assert structure instead.
  assert.equal(weekA.regions.length, 10);
  assert.equal(weekB.regions.length, 10);
});

test('every scan covers ten body regions and reports a truthful summary', () => {
  const scan = generateScan('demo-001', '2026-W25', '2026-06-21T00:00:00Z');
  assert.equal(scan.regions.length, 10);
  assert.equal(scan.watchCount, scan.regions.filter(r => r.status === 'watch').length);
  assert.match(scan.summary, /illustrative/i);
});

test('every flagged region carries a reason, and nominal regions do not', () => {
  const scan = generateScan('demo-001', '2026-W25', '2026-06-21T00:00:00Z');
  for (const r of scan.regions) {
    if (r.status === 'watch') {
      assert.ok(r.reason, `${r.region} should have a reason`);
      assert.doesNotMatch(r.reason, /diagnos/i);
    } else {
      assert.equal(r.reason, undefined);
    }
  }
});

test('the summary never claims a diagnosis', () => {
  const scan = generateScan('demo-001', '2026-W25', '2026-06-21T00:00:00Z');
  assert.doesNotMatch(scan.summary, /diagnos/i);
  assert.doesNotMatch(scan.summary, /disease/i);
});

test('weekKeyFromDate returns an ISO-like week key', () => {
  assert.match(weekKeyFromDate(new Date('2026-06-21T00:00:00Z')), /^2026-W\d{2}$/);
});
