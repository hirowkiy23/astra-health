import test from 'node:test';
import assert from 'node:assert/strict';
import { triage } from '../src/lib/triage.ts';
import type { Vitals } from '../src/lib/triage.ts';

const BASE: Vitals = { heart_rate: 68, spo2: 98, temperature: 36.7, blood_pressure: '118/76', recorded_at: '2026-06-21T08:14:00Z', simulated: true };

test('emergency symptoms remain red regardless of nominal vitals', () => {
  assert.equal(triage('Severe chest pain', BASE).level, 'red');
});

test('a dangerously low illustrative SpO2 value triggers immediate escalation', () => {
  const result = triage('I need help', { ...BASE, spo2: 82 });
  assert.equal(result.level, 'red');
  assert.match(result.reason, /SpO₂|oxygen/i);
  assert.equal(result.validated, false);
});

test('an out-of-range illustrative heart rate requires assessment', () => {
  const result = triage('Please check my readings', { ...BASE, heart_rate: 135 });
  assert.equal(result.level, 'yellow');
  assert.match(result.reason, /heart rate/i);
});

test('missing or stale vital readings are explicit and do not silently pass', () => {
  const result = triage('I have a headache', { ...BASE, recorded_at: '' });
  assert.equal(result.level, 'yellow');
  assert.match(result.reason, /vital|unavailable|stale/i);
});
