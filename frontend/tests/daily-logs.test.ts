import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, getDb } from '../src/lib/db.ts';
import { saveDailyLog, listDailyLogs, latestDailyLog, hasRecentLog } from '../src/lib/daily-logs.ts';

function freshDb() {
  closeDb();
  process.env.ASTRA_DATA_DIR = mkdtempSync(join(tmpdir(), 'astra-logs-'));
}

test('a daily mood check-in is stored and read back', () => {
  freshDb();
  const id = saveDailyLog({ astronautId: 'demo-001', kind: 'daily', mood: 4, note: 'Feeling good' });
  const latest = latestDailyLog('demo-001', 'daily');
  assert.equal(latest?.id, id);
  assert.equal(latest?.mood, 4);
  assert.equal(latest?.note, 'Feeling good');
});

test('ultrasound scans are recorded separately from daily check-ins', () => {
  freshDb();
  saveDailyLog({ astronautId: 'demo-001', kind: 'daily', mood: 3 });
  saveDailyLog({ astronautId: 'demo-001', kind: 'ultrasound', note: 'Weekly scan' });
  assert.equal(listDailyLogs('demo-001', 'daily').length, 1);
  assert.equal(listDailyLogs('demo-001', 'ultrasound').length, 1);
  assert.equal(listDailyLogs('demo-001').length, 2);
});

test('a recent ultrasound scan marks the weekly check-in complete', () => {
  freshDb();
  saveDailyLog({ astronautId: 'demo-001', kind: 'ultrasound' });
  const now = new Date('2026-06-21T12:00:00Z').getTime();
  assert.equal(hasRecentLog('demo-001', 'ultrasound', 7, now), true);
});

test('an ultrasound scan older than seven days is flagged as due', () => {
  freshDb();
  const id = saveDailyLog({ astronautId: 'demo-001', kind: 'ultrasound' });
  // Backdate the row to nine days ago.
  getDb().prepare('UPDATE daily_logs SET created_at = ? WHERE id = ?')
    .run('2026-06-12T00:00:00.000Z', id);
  const now = new Date('2026-06-21T12:00:00Z').getTime();
  assert.equal(hasRecentLog('demo-001', 'ultrasound', 7, now), false);
});