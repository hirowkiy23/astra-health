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

export interface WeeklySummary {
  weekKey: string;
  range: { start: string; end: string };
  checkInCount: number;
  averageMood: number | null;
  moodTrend: 'up' | 'down' | 'flat';
  ultrasoundCount: number;
  latestUltrasound: string | null;
  flaggedRegions: string[];
}

const MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Excellent'];

/** Roll up the astronaut's daily + ultrasound logs for the current ISO week. */
export function summarizeWeek(astronautId: string, now = new Date()): WeeklySummary {
  const start = startOfIsoWeek(now);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rows = getDb().prepare(
    'SELECT * FROM daily_logs WHERE astronaut_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at ASC, rowid ASC',
  ).all(astronautId, start.toISOString(), end.toISOString()) as DailyLogRow[];

  const dailies = rows.filter(r => r.kind === 'daily');
  const ultrasounds = rows.filter(r => r.kind === 'ultrasound');

  const moods = dailies.filter(r => typeof r.mood === 'number').map(r => r.mood as number);
  const averageMood = moods.length
    ? moods.reduce((a, b) => a + b, 0) / moods.length
    : null;

  let moodTrend: 'up' | 'down' | 'flat' = 'flat';
  if (moods.length >= 2) {
    const first = moods.slice(0, Math.floor(moods.length / 2));
    const second = moods.slice(Math.floor(moods.length / 2));
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const diff = avg(second) - avg(first);
    moodTrend = diff > 0.25 ? 'up' : diff < -0.25 ? 'down' : 'flat';
  }

  const latestUltrasound = ultrasounds.length
    ? ultrasounds[ultrasounds.length - 1].created_at
    : null;

  return {
    weekKey: weekKeyOf(start),
    range: { start: start.toISOString(), end: end.toISOString() },
    checkInCount: dailies.length,
    averageMood: averageMood !== null ? Math.round(averageMood * 10) / 10 : null,
    moodTrend,
    ultrasoundCount: ultrasounds.length,
    latestUltrasound,
    flaggedRegions: [], // filled in by the caller when a scan is attached
  };
}

/** Mood label for a numeric 1-5 value (clamped). */
export function moodLabel(mood: number): string {
  return MOOD_LABELS[Math.min(4, Math.max(0, Math.round(mood) - 1))];
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekKeyOf(date: Date): string {
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
