import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, listIncidents, getIncident, saveIncident } from '../src/lib/db.ts';

function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), 'astra-db-'));
  closeDb();
  process.env.ASTRA_DATA_DIR = dir;
  return dir;
}

test('a saved incident can be read back with its severity', () => {
  freshDb();
  const id = saveIncident({
    astronautId: 'demo-001', consultationId: 'CON-1',
    symptoms: 'I feel dizzy', severity: 'yellow',
    response: 'Seek assessment', ruleId: 'DEMO-SYMPTOM-01',
  });
  const incident = getIncident(id);
  assert.ok(incident);
  assert.equal(incident!.severity, 'yellow');
  assert.equal(incident!.symptoms, 'I feel dizzy');
  assert.equal(incident!.status, 'open');
});

test('incidents list newest first', () => {
  freshDb();
  saveIncident({ astronautId: 'demo-001', consultationId: 'CON-1', symptoms: 'first', severity: 'green', response: 'a', ruleId: 'R1' });
  saveIncident({ astronautId: 'demo-001', consultationId: 'CON-2', symptoms: 'second', severity: 'red', response: 'b', ruleId: 'R2' });
  const all = listIncidents();
  assert.equal(all.length, 2);
  assert.equal(all[0].symptoms, 'second');
});

test('unknown incident id returns undefined', () => {
  freshDb();
  assert.equal(getIncident('INC-DOESNOTEXIST'), undefined);
});

test('severity is stored verbatim for red cases', () => {
  freshDb();
  const id = saveIncident({ astronautId: 'demo-001', consultationId: 'C', symptoms: 'chest pain', severity: 'red', response: 'escalate', ruleId: 'DEMO-EMERGENCY-01' });
  assert.equal(getIncident(id)!.severity, 'red');
});
