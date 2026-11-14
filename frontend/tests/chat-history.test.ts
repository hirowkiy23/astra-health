import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendMessage, closeDb, listMessages } from '../src/lib/db.ts';

function freshDb() {
  closeDb();
  process.env.ASTRA_DATA_DIR = mkdtempSync(join(tmpdir(), 'astra-chat-'));
}

test('a consultation preserves user and assistant messages in order', () => {
  freshDb();
  appendMessage('CON-CHAT', 'demo-001', 'user', 'What about radiation?');
  appendMessage('CON-CHAT', 'demo-001', 'assistant', 'NASA describes radiation as a hazard.', { incident_id: 'INC-1' });
  const messages = listMessages('CON-CHAT');
  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map(m => m.role), ['user', 'assistant']);
  assert.equal(JSON.parse(messages[1].metadata!).incident_id, 'INC-1');
});

test('message history is isolated by consultation id', () => {
  freshDb();
  appendMessage('CON-A', 'demo-001', 'user', 'first');
  appendMessage('CON-B', 'demo-001', 'user', 'second');
  assert.equal(listMessages('CON-A').length, 1);
  assert.equal(listMessages('CON-A')[0].content, 'first');
});
