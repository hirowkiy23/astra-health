import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieve } from '../src/lib/retrieval.ts';

test('dizziness retrieves the vestibular risk and gravity hazard', () => {
  const refs = retrieve('I feel dizzy after the gravity transition');
  assert.equal(refs.length, 2);
  assert.equal(refs[0].id, 'nasa-vestibular');
  assert.equal(refs[1].id, 'hazard-gravity');
});

test('chest pain and breathing retrieve cardiovascular and hypoxia references', () => {
  const ids = retrieve('severe chest pain and trouble breathing').map(r => r.id);
  assert.ok(ids.includes('nasa-cardiovascular'));
  assert.ok(ids.includes('nasa-hypoxia'));
});

test('off-topic message returns no references rather than guessing', () => {
  assert.deepEqual(retrieve('Can we play chess tomorrow?'), []);
});

test('references never leak internal keyword lists', () => {
  const refs = retrieve('dizzy');
  assert.equal('keywords' in refs[0], false);
  assert.ok(refs[0].source);
  assert.ok(refs[0].url.startsWith('https://www.nasa.gov/'));
});
