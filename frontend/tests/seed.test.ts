import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, getDb } from '../src/lib/db.ts';
import { seedDemoData, resetSeedMarker } from '../src/lib/seed.ts';
import { listDailyLogs } from '../src/lib/daily-logs.ts';
import { listMeals } from '../src/lib/nutrition.ts';

function freshDb() {
  closeDb();
  process.env.ASTRA_DATA_DIR = mkdtempSync(join(tmpdir(), 'astra-seed-'));
}

test('seedDemoData populates logs and meals for all five astronauts', () => {
  freshDb();
  const result = seedDemoData();
  assert.equal(result.seeded, true);
  assert.equal(result.astronauts, 5);

  for (const id of ['astro-1', 'astro-2', 'astro-3', 'astro-4', 'astro-5']) {
    assert.equal(listDailyLogs(id, 'daily').length, 5, `${id} should have 5 daily check-ins`);
    assert.equal(listDailyLogs(id, 'ultrasound').length, 1, `${id} should have 1 ultrasound scan`);
    assert.ok(listMeals(id).length >= 2, `${id} should have meals logged`);
  }
});

test('seedDemoData is idempotent — a second call is a no-op', () => {
  freshDb();
  seedDemoData();
  const second = seedDemoData();
  assert.equal(second.seeded, false);
  assert.equal(second.astronauts, 0);
  // Row counts unchanged.
  assert.equal(listDailyLogs('astro-1', 'daily').length, 5);
});

test('resetSeedMarker allows re-seeding', () => {
  freshDb();
  seedDemoData();
  resetSeedMarker();
  const again = seedDemoData();
  assert.equal(again.seeded, true);
});

test('seed does not create duplicate rows across a reset', () => {
  freshDb();
  seedDemoData();
  resetSeedMarker();
  // Remove seed marker only; existing rows have stable ids so counts are stable.
  seedDemoData();
  assert.equal(listDailyLogs('astro-2', 'daily').length, 5);
  getDb();
});
