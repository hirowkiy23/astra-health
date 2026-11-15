import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, ASTRO_CREDENTIALS } from '../src/lib/auth.ts';

test('each astronaut has a unique demo email and password', () => {
  assert.equal(ASTRO_CREDENTIALS.length, 5);
  const emails = new Set(ASTRO_CREDENTIALS.map(c => c.email.toLowerCase()));
  assert.equal(emails.size, 5);
});

test('correct credentials authenticate the matching astronaut', () => {
  const cred = authenticate('astro-3@astra.demo', 'astra-3');
  assert.equal(cred?.id, 'astro-3');
  assert.equal(cred?.name, 'ASTRO - 3');
});

test('email matching is case-insensitive', () => {
  const cred = authenticate('ASTRO-1@ASTRA.DEMO', 'astra-1');
  assert.equal(cred?.id, 'astro-1');
});

test('wrong password or unknown email returns null', () => {
  assert.equal(authenticate('astro-2@astra.demo', 'wrong'), null);
  assert.equal(authenticate('nobody@astra.demo', 'astra-1'), null);
});
