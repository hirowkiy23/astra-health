import test from 'node:test';
import assert from 'node:assert/strict';
import { pressSos } from '../src/lib/sos.ts';

test('SOS does not activate on the first or second press', () => {
  const first = pressSos('idle', 0);
  assert.deepEqual(first, { phase: 'confirming', count: 1, activate: false });
  const second = pressSos(first.phase, first.count);
  assert.deepEqual(second, { phase: 'confirming', count: 2, activate: false });
});

test('exactly three deliberate presses permit escalation', () => {
  const result = pressSos('confirming', 2);
  assert.deepEqual(result, { phase: 'sending', count: 3, activate: true });
});

test('sending cannot be activated again accidentally', () => {
  const result = pressSos('sending', 3);
  assert.equal(result.activate, false);
  assert.equal(result.count, 3);
});
