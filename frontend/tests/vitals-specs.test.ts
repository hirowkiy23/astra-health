import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateVital, diagnose, combineTriage, vitalsTriageRule,
  normalBand, alertMessage, VITAL_METRICS, VITAL_SPECS,
} from '../src/lib/vitals-specs.ts';
import type { TriageResult } from '../src/lib/triage.ts';

test('evaluateVital maps values onto green/yellow/red bands', () => {
  assert.equal(evaluateVital('heart_rate', 70), 'green');
  assert.equal(evaluateVital('heart_rate', 112), 'yellow');
  assert.equal(evaluateVital('heart_rate', 135), 'red');
  assert.equal(evaluateVital('heart_rate', 40), 'yellow');
  assert.equal(evaluateVital('heart_rate', 35), 'red');
  assert.equal(evaluateVital('spo2', 97), 'green');
  assert.equal(evaluateVital('spo2', 93), 'yellow');
  assert.equal(evaluateVital('spo2', 88), 'red');
  assert.equal(evaluateVital('temperature', 36.8), 'green');
  assert.equal(evaluateVital('temperature', 38.0), 'yellow');
  assert.equal(evaluateVital('temperature', 39.5), 'red');
  assert.equal(evaluateVital('radiation_dose', 0.3), 'green');
  assert.equal(evaluateVital('radiation_dose', 0.7), 'yellow');
  assert.equal(evaluateVital('radiation_dose', 1.6), 'red');
  assert.equal(evaluateVital('hrv', 120), 'green');
  assert.equal(evaluateVital('hrv', 18), 'yellow');
  assert.equal(evaluateVital('sleep_hours', 5), 'yellow');
  assert.equal(evaluateVital('sleep_hours', 3.5), 'red');
  assert.equal(evaluateVital('co2_pp', 6), 'red');
  assert.equal(evaluateVital('stress_index', 55), 'yellow');
});

test('diagnose: null on green, structured advice otherwise', () => {
  assert.equal(diagnose('heart_rate', 70), null);
  const d = diagnose('heart_rate', 112);
  assert.ok(d);
  assert.equal(d!.level, 'yellow');
  assert.equal(d!.escalate, false);
  assert.ok(d!.countermeasures.length > 0);
  assert.match(d!.interpretation, /Tachycardia/);
  const crit = diagnose('spo2', 88);
  assert.equal(crit!.level, 'red');
  assert.equal(crit!.escalate, true);
  assert.match(crit!.interpretation, /Desaturation/);
});

test('vitalsTriageRule: worst reading owns the deterministic result', () => {
  const green = vitalsTriageRule([]);
  assert.equal(green.level, 'green');
  assert.equal(green.rule_id, 'VITALS-GREEN-01');
  assert.equal(green.requires_human_support, false);

  const yellow = vitalsTriageRule([diagnose('heart_rate', 112)!]);
  assert.equal(yellow.level, 'yellow');
  assert.equal(yellow.rule_id, 'VITALS-YELLOW-01');
  assert.equal(yellow.requires_human_support, true);
  assert.match(yellow.reason, /Heart rate 112 bpm/);

  const red = vitalsTriageRule([diagnose('heart_rate', 112)!, diagnose('spo2', 88)!]);
  assert.equal(red.level, 'red');
  assert.equal(red.rule_id, 'VITALS-RED-01');
  assert.match(red.reason, /Blood oxygen saturation 88 %/);
});

test('combineTriage never downgrades and keeps the message rule on ties', () => {
  const rule = (level: TriageResult['level'], id: string): TriageResult => ({
    level, reason: '', requires_human_support: level !== 'green', rule_id: id, validated: false,
  });
  assert.equal(combineTriage(rule('green', 'A'), rule('yellow', 'B')).rule_id, 'B');
  assert.equal(combineTriage(rule('yellow', 'A'), rule('red', 'B')).rule_id, 'B');
  assert.equal(combineTriage(rule('red', 'A'), rule('green', 'B')).rule_id, 'A');
  assert.equal(combineTriage(rule('yellow', 'A'), rule('yellow', 'B')).rule_id, 'A');
});

test('alert messages and bands are informative', () => {
  assert.equal(normalBand('heart_rate'), '45-100 bpm');
  assert.match(alertMessage('spo2', 93, 'yellow'), /below the normal band \(95-101 %\) - yellow/);
});

test('every vital spec is internally consistent', () => {
  assert.equal(VITAL_METRICS.length, 10);
  for (const m of VITAL_METRICS) {
    const s = VITAL_SPECS[m];
    assert.ok(s.normal[0] < s.normal[1], `${m} normal band`);
    assert.ok(s.red[0] <= s.normal[0], `${m} red low`);
    assert.ok(s.red[1] >= s.normal[1], `${m} red high`);
    assert.ok(s.unit.length > 0, `${m} unit`);
  }
});
