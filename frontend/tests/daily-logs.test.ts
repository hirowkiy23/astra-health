import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closeDb, getDb } from '../src/lib/db.ts';
import { saveDailyLog, listDailyLogs, latestDailyLog, hasRecentLog, summarizeWeek, moodLabel } from '../src/lib/daily-logs.ts';

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

test('summarizeWeek rolls up check-ins and mood for the current week', () => {
  freshDb();
  const now = new Date('2026-06-21T12:00:00Z'); // a Sunday
  const ids = [
    saveDailyLog({ astronautId: 'demo-001', kind: 'daily', mood: 3 }),
    saveDailyLog({ astronautId: 'demo-001', kind: 'daily', mood: 5 }),
    saveDailyLog({ astronautId: 'demo-001', kind: 'ultrasound' }),
  ];
  // Backdate the rows into the week of 2026-06-21.
  ids.forEach((id, i) => {
    getDb().prepare('UPDATE daily_logs SET created_at = ? WHERE id = ?')
      .run(`2026-06-${16 + i}T09:00:00.000Z`, id);
  });

  const summary = summarizeWeek('demo-001', now);
  assert.equal(summary.checkInCount, 2);
  assert.equal(summary.averageMood, 4);
  assert.equal(summary.moodTrend, 'up');
  assert.equal(summary.ultrasoundCount, 1);
  assert.match(summary.weekKey, /^2026-W\d{2}$/);
});

test('summarizeWeek reports a flat trend with one check-in and no crash with none', () => {
  freshDb();
  saveDailyLog({ astronautId: 'demo-001', kind: 'daily', mood: 4 });
  const one = summarizeWeek('demo-001');
  assert.equal(one.moodTrend, 'flat');
  assert.equal(one.averageMood, 4);

  const empty = summarizeWeek('demo-002');
  assert.equal(empty.checkInCount, 0);
  assert.equal(empty.averageMood, null);
  assert.equal(empty.moodTrend, 'flat');
});

test('moodLabel maps numbers to labels and clamps out-of-range values', () => {
  assert.equal(moodLabel(1), 'Very low');
  assert.equal(moodLabel(5), 'Excellent');
  assert.equal(moodLabel(3.4), 'Okay');
  assert.equal(moodLabel(0), 'Very low');
  assert.equal(moodLabel(9), 'Excellent');
});