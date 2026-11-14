import test from 'node:test';
import assert from 'node:assert/strict';
import { triage } from '../src/lib/triage.ts';
import type { Vitals } from '../src/lib/triage.ts';

const VITALS: Vitals = { heart_rate: 68, spo2: 98, temperature: 36.7, blood_pressure: '118/76', recorded_at: '2026-06-21T08:14:00Z', simulated: true };

test('emergency wording produces red triage requiring human support', () => {
  const result = triage('I have severe chest pain and trouble breathing', VITALS);
  assert.equal(result.level, 'red');
  assert.equal(result.requires_human_support, true);
  assert.equal(result.validated, false);
  assert.match(result.reason, /emergency/i);
});

test('ambiguous symptom produces yellow triage', () => {
  const result = triage('I feel dizzy after the gravity transition', VITALS);
  assert.equal(result.level, 'yellow');
  assert.equal(result.requires_human_support, true);
  assert.match(result.reason, /illustrative/i);
});

test('unrelated message produces green and never rules out illness', () => {
  const result = triage('Can we play chess tomorrow?', VITALS);
  assert.equal(result.level, 'green');
  assert.equal(result.requires_human_support, false);
  assert.match(result.reason, /does not rule out/i);
});

test('triage output carries rule id and unvalidated flag', () => {
  const result = triage('headache', VITALS);
  assert.ok(result.rule_id.startsWith('DEMO-'));
  assert.equal(result.validated, false);
});
