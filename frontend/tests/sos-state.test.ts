import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb } from '../src/lib/db.ts';
import { triggerSos, resolveSos, getCrewStatus, setCrewStatus, getAllCrewStatuses } from '../src/lib/sos-state.ts';

function freshDb() {
  closeDb();
  process.env.ASTRA_DATA_DIR = mkdtempSync(join(tmpdir(), 'astra-sos-'));
}

test('triggerSos changes a Good astronaut to SOS and persists', () => {
  freshDb();
  const state = triggerSos('astro-1');
  assert.equal(state.status, 'SOS');
  assert.ok(state.alerted_at);
  assert.equal(getCrewStatus('astro-1'), 'SOS');
});

test('resolveSos returns an SOS astronaut to Good', () => {
  freshDb();
  triggerSos('astro-2');
  const state = resolveSos('astro-2');
  assert.equal(state.status, 'Good');
  assert.equal(state.alerted_at, null);
  assert.equal(getCrewStatus('astro-2'), 'Good');
});

test('setCrewStatus rejects nothing but records the given status', () => {
  freshDb();
  const state = setCrewStatus('astro-3', 'Review');
  assert.equal(state.status, 'Review');
});

test('getAllCrewStatuses covers every crew member with a default', () => {
  freshDb();
  const statuses = getAllCrewStatuses();
  for (const id of ['astro-1', 'astro-2', 'astro-3', 'astro-4', 'astro-5']) {
    assert.ok(statuses[id], `${id} should have a status`);
  }
});
