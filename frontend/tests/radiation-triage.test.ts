import test from 'node:test';
import assert from 'node:assert/strict';
import { triage } from '../src/lib/triage.ts';
import type { Vitals } from '../src/lib/triage.ts';

const BASE: Vitals = { heart_rate: 68, spo2: 98, temperature: 36.7, blood_pressure: '118/76', recorded_at: '2026-06-21T08:14:00Z', simulated: true };

test('a severe radiation self-report escalates to red, never green', () => {
  const result = triage('I have high radiation', BASE);
  assert.equal(result.level, 'red');
  assert.equal(result.requires_human_support, true);
  assert.match(result.reason, /radiation/i);
});

test('a plain radiation exposure report requires assessment', () => {
  const result = triage('I was exposed to radiation', BASE);
  assert.equal(result.level, 'yellow');
  assert.match(result.reason, /radiation/i);
});

test('acute radiation sickness phrasing is treated as critical', () => {
  assert.equal(triage('radiation sickness', BASE).level, 'red');
});

test('a radiation knowledge question stays green and is not mistaken for a report', () => {
  const result = triage('what are the risks of space radiation?', BASE);
  assert.equal(result.level, 'green');
});

test('a solar-flare report escalates without downgrading', () => {
  assert.equal(triage('solar flare just hit us', BASE).level, 'yellow');
});
