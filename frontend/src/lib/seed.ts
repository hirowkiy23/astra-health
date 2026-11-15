import { getDb } from './db.ts';
import { findCatalogItem } from './nutrition.ts';
import type { LogKind } from './daily-logs.ts';

/**
 * Dummy data seeding for the demo crew (astro-1 … astro-5) so each login
 * shows its own health history. Idempotent: a marker row prevents re-seeding.
 * All values are illustrative, not clinical.
 */

const ASTRONAUT_IDS = ['astro-1', 'astro-2', 'astro-3', 'astro-4', 'astro-5'];

const MOODS: Record<string, number[]> = {
  'astro-1': [4, 3, 4, 5, 4],
  'astro-2': [3, 3, 2, 4, 3],
  'astro-3': [2, 3, 2, 2, 3],
  'astro-4': [4, 4, 5, 4, 5],
  'astro-5': [3, 4, 4, 3, 4],
};

const MEALS: Record<string, string[]> = {
  'astro-1': ['Mango Peach Smoothie', 'Barbecued Beef Brisket', 'Coffee'],
  'astro-2': ['Macaroni & Cheese', 'Lemonade', 'Coffee'],
  'astro-3': ['Barbecued Beef Brisket', 'Coffee'],
  'astro-4': ['Macaroni & Cheese', 'Mango Peach Smoothie'],
  'astro-5': ['Lemonade', 'Coffee'],
};

const MOOD_NOTES: Record<string, string> = {
  'astro-1': 'Feeling steady this week',
  'astro-2': 'Slight fatigue after EVA',
  'astro-3': 'Headache this morning',
  'astro-4': 'Good energy, slept well',
  'astro-5': 'Training load was high',
};

function backdate(iso: string, daysAgo: number, hour = 9, minute = 0): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Insert a daily/ultrasound log at a specific past timestamp. */
function insertLogAt(astronautId: string, kind: LogKind, mood: number | null, note: string | null, createdIso: string): void {
  getDb().prepare(
    'INSERT OR IGNORE INTO daily_logs (id, astronaut_id, kind, mood, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(`SEED-${astronautId}-${kind}-${createdIso}`, astronautId, kind, mood, note, createdIso);
}

/** Insert a meal at a specific past timestamp. */
function insertMealAt(astronautId: string, itemName: string, consumedIso: string): void {
  const item = findCatalogItem(itemName);
  if (!item) return;
  getDb().prepare(
    'INSERT OR IGNORE INTO meals (id, astronaut_id, item_name, category, calories, protein, carbs, fats, consumed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(`SEED-MEAL-${astronautId}-${itemName}-${consumedIso}`, astronautId, item.name, item.category, item.calories, item.protein, item.carbs, item.fats, consumedIso);
}

/** Populate dummy data for every demo astronaut. Safe to call repeatedly. */
export function seedDemoData(): { seeded: boolean; astronauts: number } {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const marker = db.prepare('SELECT value FROM meta WHERE key = ?').get('seed_demo_v1') as { value: string } | undefined;
  if (marker) return { seeded: false, astronauts: 0 };

  const nowIso = new Date().toISOString();

  for (const id of ASTRONAUT_IDS) {
    // 5 daily mood check-ins spread over the past week.
    const moods = MOODS[id] ?? [3, 3, 3, 3, 3];
    moods.forEach((mood, i) => {
      insertLogAt(id, 'daily', mood, MOOD_NOTES[id] ?? null, backdate(nowIso, moods.length - 1 - i));
    });
    // 1 ultrasound scan a few days ago (weekly cadence).
    insertLogAt(id, 'ultrasound', null, 'Weekly ultrasound scan completed', backdate(nowIso, 3, 14));
    // A few meals over the past day.
    (MEALS[id] ?? []).forEach((meal, i) => {
      insertMealAt(id, meal, backdate(nowIso, 0, 6 + i * 3));
    });
  }

  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('seed_demo_v1', new Date().toISOString());
  return { seeded: true, astronauts: ASTRONAUT_IDS.length };
}

/** Drop the seed marker so the next seedDemoData() call re-runs. */
export function resetSeedMarker(): void {
  getDb().prepare('DELETE FROM meta WHERE key = ?').run('seed_demo_v1');
}
