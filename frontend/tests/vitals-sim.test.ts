import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb } from '../src/lib/db.ts';
import {
  generateTick, mulberry32, runVitalsTick, forceEpisode,
  getVitalsSnapshot, toDemoVitals, SIM_ASTRONAUT_IDS, EPISODE_TEMPLATES,
} from '../src/lib/vitals-sim.ts';
import { insertReading, syncAlertForReading, latestPerMetric, listAlerts } from '../src/lib/vitals-db.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'astra-vitals-'));
  closeDb();
  process.env.ASTRA_DATA_DIR = dir;
  return dir;
}

test('generateTick is deterministic with a seeded rng and covers every metric', () => {
  const a = generateTick({}, [], ['astro-1'], 'T', mulberry32(42), 0);
  const b = generateTick({}, [], ['astro-1'], 'T', mulberry32(42), 0);
  assert.deepEqual(a.readings, b.readings);
  assert.equal(a.readings.length, 10);
  for (const r of a.readings) assert.ok(Number.isFinite(r.value));
});

test('runVitalsTick persists readings for the whole roster and is lazy within the window', () => {
  freshDb();
  const first = runVitalsTick({ force: true, rng: mulberry32(7) });
  assert.equal(first.skipped, false);
  assert.equal(first.readings, SIM_ASTRONAUT_IDS.length * 10);
  const lazy = runVitalsTick({});
  assert.equal(lazy.skipped, true);
  assert.ok(latestPerMetric('demo-001').length === 10);
  const snap = getVitalsSnapshot('demo-001');
  assert.equal(snap.astronaut_id, 'demo-001');
  assert.ok(snap.triage.rule_id.startsWith('VITALS-'));
  const demo = toDemoVitals(snap);
  assert.equal(demo.simulated, true);
  assert.match(demo.blood_pressure, /^\d+\/\d+$/);
});

test('forced solar-particle-event raises radiation and opens exactly one red alert', () => {
  freshDb();
  forceEpisode('astro-1', 'solar-particle-event');
  for (let i = 0; i < 5; i++) runVitalsTick({ force: true, rng: mulberry32(99) });
  const snap = getVitalsSnapshot('astro-1');
  const rad = snap.vitals.radiation_dose;
  assert.ok(rad.value > 1.0, `expected red-band radiation, got ${rad.value}`);
  assert.equal(rad.level, 'red');
  const alerts = listAlerts({ astronautId: 'astro-1', status: 'active' }).filter((x) => x.metric === 'radiation_dose');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'red');
  assert.equal(snap.triage.level, 'red');
  assert.equal(snap.triage.rule_id, 'VITALS-RED-01');
});

test('alert sync dedupes, escalates on severity change and auto-resolves', () => {
  freshDb();
  insertReading({ astronautId: 'demo-001', metric: 'heart_rate', value: 112, source: 'manual' });
  assert.equal(syncAlertForReading('demo-001', 'heart_rate', 112).outcome, 'created');
  assert.equal(syncAlertForReading('demo-001', 'heart_rate', 115).outcome, 'unchanged');
  const up = syncAlertForReading('demo-001', 'heart_rate', 140);
  assert.equal(up.outcome, 'created');
  const active = listAlerts({ astronautId: 'demo-001', status: 'active' });
  assert.equal(active.length, 1);
  assert.equal(active[0].severity, 'red');
  assert.equal(syncAlertForReading('demo-001', 'heart_rate', 70).outcome, 'resolved');
  assert.equal(listAlerts({ astronautId: 'demo-001', status: 'active' }).length, 0);
});

test('episode templates are well-formed; unknown episode or astronaut throws', () => {
  freshDb();
  for (const t of EPISODE_TEMPLATES) {
    assert.ok(t.name.length > 0);
    assert.ok(t.ticks > 0);
    assert.ok(t.effects.length > 0);
  }
  assert.throws(() => forceEpisode('astro-1', 'no-such-episode'));
  assert.throws(() => forceEpisode('unknown-id', 'solar-particle-event'));
});
