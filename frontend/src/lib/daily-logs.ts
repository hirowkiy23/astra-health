import { randomUUID } from 'node:crypto';
import { getDb } from './db.ts';

export type LogKind = 'daily' | 'ultrasound';

export interface DailyLogRow {
  id: string;
  astronaut_id: string;
  kind: LogKind;
  mood: number | null;
  note: string | null;
  created_at: string;
}

export interface NewDailyLog {
  astronautId: string;
  kind: LogKind;
  mood?: number | null;
  note?: string | null;
}

/** Save a daily well-being check-in or weekly ultrasound scan record. */
export function saveDailyLog(log: NewDailyLog): string {
  const id = `LOG-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  getDb().prepare(
    'INSERT INTO daily_logs (id, astronaut_id, kind, mood, note, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, log.astronautId, log.kind, log.mood ?? null, log.note ?? null, new Date().toISOString());
  return id;
}

export function listDailyLogs(astronautId: string, kind?: LogKind, limit = 50): DailyLogRow[] {
  const rows = kind
    ? getDb().prepare(
        'SELECT * FROM daily_logs WHERE astronaut_id = ? AND kind = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
      ).all(astronautId, kind, limit)
    : getDb().prepare(
        'SELECT * FROM daily_logs WHERE astronaut_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
      ).all(astronautId, limit);
  return rows as DailyLogRow[];
}

/** Most recent log of a given kind, or undefined if none recorded. */
export function latestDailyLog(astronautId: string, kind: LogKind): DailyLogRow | undefined {
  return getDb().prepare(
    'SELECT * FROM daily_logs WHERE astronaut_id = ? AND kind = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
  ).get(astronautId, kind) as DailyLogRow | undefined;
}

/** Whether the astronaut has completed a check-in of this kind in the last N days. */
export function hasRecentLog(astronautId: string, kind: LogKind, withinDays: number, now = Date.now()): boolean {
  const latest = latestDailyLog(astronautId, kind);
  if (!latest) return false;
  const ageMs = now - new Date(latest.created_at).getTime();
  return ageMs < withinDays * 24 * 60 * 60 * 1000;
}
