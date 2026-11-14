import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceTriageSafety, extractJson } from '../src/lib/safety.ts';
import type { MedicalResponse } from '../src/lib/safety.ts';
import type { TriageResult } from '../src/lib/triage.ts';

const RED: TriageResult = { level: 'red', reason: 'Emergency rule', requires_human_support: true, rule_id: 'DEMO-EMERGENCY-01', validated: false };
const YELLOW: TriageResult = { level: 'yellow', reason: 'Further assessment', requires_human_support: true, rule_id: 'DEMO-SYMPTOM-01', validated: false };
const GREEN: TriageResult = { level: 'green', reason: 'None', requires_human_support: false, rule_id: 'DEMO-DEFAULT-01', validated: false };

const DRAFT_JSON = '{"message":"Background information is available.","warning_signs":["Worsening symptoms"],"recommended_actions":["Follow the mission medical procedure."],"requires_human_support":false}';

function response(partial: Partial<MedicalResponse>): MedicalResponse {
  return {
    message: '',
    warning_signs: [],
    recommended_actions: [],
    requires_human_support: false,
    mode: 'llm_grounded',
    ...partial,
  };
}

test('extractJson handles a fenced payload', () => {
  const parsed = extractJson('```json\n' + DRAFT_JSON + '\n```');
  assert.ok(parsed);
  assert.match(String(parsed.message), /Background information/);
});

test('extractJson handles prose around the payload', () => {
  const parsed = extractJson('Here is the result:\n' + DRAFT_JSON);
  assert.ok(parsed);
  assert.equal(parsed.requires_human_support, false);
});

test('extractJson rejects non-JSON output', () => {
  assert.equal(extractJson('I cannot help with that.'), null);
});

test('a model draft cannot downgrade a critical triage result', () => {
  const draft = response({ message: 'You do not need medical help.', requires_human_support: false });
  const result = enforceTriageSafety(draft, RED);
  assert.equal(result.requires_human_support, true);
  assert.match(result.message, /human medical support/i);
});

test('red escalation adds exactly one emergency procedure action', () => {
  const result = enforceTriageSafety(response({
    message: 'Contact human medical support now.',
    recommended_actions: ['Activate the approved mission emergency procedure.'],
  }), RED);
  const procedural = result.recommended_actions.filter(a => /emergency procedure/i.test(a));
  assert.equal(procedural.length, 1);
});

test('yellow escalation does not inject an emergency procedure', () => {
  const result = enforceTriageSafety(response({
    message: 'Worth reviewing.',
    warning_signs: ['Worsening'],
    recommended_actions: ['Sit down.'],
  }), YELLOW);
  assert.equal(result.requires_human_support, true);
  assert.match(result.message, /human medical support/i);
  assert.equal(result.recommended_actions.some(a => /emergency procedure/i.test(a)), false);
});

test('green triage is left untouched', () => {
  const draft = response({ message: 'No rule matched.' });
  const result = enforceTriageSafety(draft, GREEN);
  assert.equal(result.message, draft.message);
});
