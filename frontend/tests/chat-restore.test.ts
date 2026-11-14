import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatTurn } from '../src/lib/chat-history.ts';

test('restores a complete current assistant response', () => {
  const turn = parseChatTurn({ role: 'assistant', content: 'Answer', metadata: JSON.stringify({ response: { message: 'Answer', recommended_actions: [], warning_signs: [] }, triage: { level: 'green' }, references: [] }) });
  const result = turn?.result as { response: { recommended_actions: string[] } } | undefined;
  assert.equal(result?.response.recommended_actions.length, 0);
});

test('ignores legacy metadata missing the response object', () => {
  const turn = parseChatTurn({ role: 'assistant', content: 'Legacy answer', metadata: JSON.stringify({ incident_id: 'INC-1', mode: 'deterministic_demo' }) });
  assert.equal(turn?.result, undefined);
  assert.equal(turn?.text, 'Legacy answer');
});

test('ignores malformed metadata without crashing the chat', () => {
  const turn = parseChatTurn({ role: 'assistant', content: 'Previous answer', metadata: '{invalid' });
  assert.equal(turn?.result, undefined);
});

test('user messages never gain a fabricated result', () => {
  const turn = parseChatTurn({ role: 'user', content: 'Question', metadata: null });
  assert.deepEqual(turn, { role: 'user', text: 'Question' });
});
