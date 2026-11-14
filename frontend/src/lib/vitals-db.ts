import { randomUUID } from 'node:crypto';
import { getDb } from './db.ts';
import type { TriageLevel } from './triage.ts';
import { VITAL_SPECS, evaluateVital, alertMessage, type VitalMetric } from './vitals-specs.ts';

/**
 * SQLite persistence for continuous vital-sign telemetry and threshold
 * alerts. Tables are created lazily next to db.ts's own schema so nothing
 * in the existing incident/chat persistence changes.
 */

export interface VitalReadingRow {
  id: number;
  astronaut_id: string;
  metric: string;
  value: number;
  unit: string;
  level: TriageLevel;
  source: string;
  recorded_at: string;
}

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface VitalAlertRow {
  id: string;
  astronaut_id: string;
  metric: string;
  severity: TriageLevel;
  value: number;
  message: string;
  status: AlertStatus;
  note: string | null;
  created_at: string;
  acked_at: string | null;
  resolved_at: string | null;
}

export interface SimEpisodeRow {
  id: number;
  astronaut_id: string;
  name: string;
  metric: string;
  delta: number;
  ticks_left: number;
}

let ensuredFor: unknown = null;

/** Idempotent schema bootstrap, tied to the current Database instance so tests that closeDb() re-ensure. */
export function ensureVitalsTables(): void {
  const db = getDb();
  if (ensuredFor === db) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS vital_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      astronaut_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT NOT NULL,
      level TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'sim',
      recorded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS vital_readings_astronaut_time ON vital_readings (astronaut_id, recorded_at DESC);
    CREATE TABLE IF NOT EXISTS vital_alerts (
      id TEXT PRIMARY KEY,
      astronaut_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      severity TEXT NOT NULL,
      value REAL NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      note TEXT,
      created_at TEXT NOT NULL,
      acked_at TEXT,
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS vital_alerts_active ON vital_alerts (astronaut_id, metric, status);
    CREATE TABLE IF NOT EXISTS vitals_sim_state (
      astronaut_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      PRIMARY KEY (astronaut_id, metric)
    );
    CREATE TABLE IF NOT EXISTS sim_episodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      astronaut_id TEXT NOT NULL,
      name TEXT NOT NULL,
      metric TEXT NOT NULL,
      delta REAL NOT NULL,
      ticks_left INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sim_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  ensuredFor = db;
}

export function insertReading(input: {
  astronautId: string;
  metric: VitalMetric;
  value: number;
  source?: string;
  ts?: string;
}): VitalReadingRow {
  ensureVitalsTables();
  const level = evaluateVital(input.metric, input.value);
  const unit = VITAL_SPECS[input.metric].unit;
  const recordedAt = input.ts ?? new Date().toISOString();
  const info = getDb().prepare(
    'INSERT INTO vital_readings (astronaut_id, metric, value, unit, level, source, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(input.astronautId, input.metric, input.value, unit, level, input.source ?? 'sim', recordedAt);
  return {
    id: Number(info.lastInsertRowid),
    astronaut_id: input.astronautId,
    metric: input.metric,
    value: input.value,
    unit,
    level,
    source: input.source ?? 'sim',
    recorded_at: recordedAt,
  };
}

export type AlertSyncOutcome = 'created' | 'resolved' | 'unchanged' | 'none';

/**
 * Keep vital_alerts consistent with the newest reading for (astronaut, metric):
 * back inside the green band -> auto-resolve; new breach -> open an alert;
 * severity change -> resolve the old, open a new one; same severity -> no-op.
 */
export function syncAlertForReading(
  astronautId: string,
  metric: VitalMetric,
  value: number,
): { outcome: AlertSyncOutcome; alertId?: string } {
  ensureVitalsTables();
  const db = getDb();
  const level = evaluateVital(metric, value);
  const active = db.prepare(
    `SELECT id, severity FROM vital_alerts
      WHERE astronaut_id = ? AND metric = ? AND status IN ('open', 'acknowledged')
      ORDER BY created_at DESC LIMIT 1`,
  ).get(astronautId, metric) as { id: string; severity: TriageLevel } | undefined;

  if (level === 'green') {
    if (!active) return { outcome: 'none' };
    db.prepare(`UPDATE vital_alerts SET status = 'resolved', resolved_at = ?, note = ? WHERE id = ?`)
      .run(new Date().toISOString(), 'Auto-resolved: back within the normal band', active.id);
    return { outcome: 'resolved', alertId: active.id };
  }

  if (active) {
    if (active.severity === level) return { outcome: 'unchanged', alertId: active.id };
    db.prepare(`UPDATE vital_alerts SET status = 'resolved', resolved_at = ?, note = ? WHERE id = ?`)
      .run(new Date().toISOString(), `Superseded: severity changed to ${level}`, active.id);
  }

  const id = `ALR-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  db.prepare(
    `INSERT INTO vital_alerts (id, astronaut_id, metric, severity, value, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
  ).run(id, astronautId, metric, level, value, alertMessage(metric, value, level), new Date().toISOString());
  return { outcome: 'created', alertId: id };
}

export function latestPerMetric(astronautId: string): VitalReadingRow[] {
  ensureVitalsTables();
  return getDb().prepare(
    `SELECT r.* FROM vital_readings r
       JOIN (SELECT metric, MAX(id) AS mid FROM vital_readings WHERE astronaut_id = ? GROUP BY metric) x
         ON r.id = x.mid
      ORDER BY r.metric`,
  ).all(astronautId) as VitalReadingRow[];
}

export function listHistory(
  astronautId: string,
  opts: { metric?: VitalMetric; hours?: number; limit?: number } = {},
): VitalReadingRow[] {
  ensureVitalsTables();
  const hours = Math.min(Math.max(opts.hours ?? 24, 1), 24 * 30);
  const limit = Math.min(Math.max(opts.limit ?? 500, 1), 5000);
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  return getDb().prepare(
    `SELECT * FROM vital_readings
      WHERE astronaut_id = ? AND recorded_at >= ? AND (? IS NULL OR metric = ?)
      ORDER BY recorded_at DESC, id DESC LIMIT ?`,
  ).all(astronautId, since, opts.metric ?? null, opts.metric ?? null, limit) as VitalReadingRow[];
}

export function listAlerts(filters: { status?: AlertStatus | 'active'; astronautId?: string } = {}): VitalAlertRow[] {
  ensureVitalsTables();
  const statusClause =
    filters.status === 'active' ? `status IN ('open', 'acknowledged')`
    : filters.status ? `status = '${filters.status}'`
    : '1 = 1';
  const rows = getDb().prepare(
    `SELECT * FROM vital_alerts WHERE ${statusClause} AND (? IS NULL OR astronaut_id = ?)
      ORDER BY created_at DESC, rowid DESC LIMIT 500`,
  ).all(filters.astronautId ?? null, filters.astronautId ?? null) as VitalAlertRow[];
  return rows;
}

export function ackAlert(id: string): boolean {
  ensureVitalsTables();
  const info = getDb().prepare(
    `UPDATE vital_alerts SET status = 'acknowledged', acked_at = ? WHERE id = ? AND status = 'open'`,
  ).run(new Date().toISOString(), id);
  return info.changes > 0;
}

export function resolveAlert(id: string, note?: string): boolean {
  ensureVitalsTables();
  const info = getDb().prepare(
    `UPDATE vital_alerts SET status = 'resolved', resolved_at = ?, note = COALESCE(?, note)
      WHERE id = ? AND status IN ('open', 'acknowledged')`,
  ).run(new Date().toISOString(), note ?? null, id);
  return info.changes > 0;
}

// ── simulator state persistence ───────────────────────────────────────────────

export function loadSimState(): Record<string, Record<string, number>> {
  ensureVitalsTables();
  const rows = getDb().prepare('SELECT astronaut_id, metric, value FROM vitals_sim_state').all() as {
    astronaut_id: string; metric: string; value: number;
  }[];
  const state: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    (state[r.astronaut_id] ??= {})[r.metric] = r.value;
  }
  return state;
}

export function saveSimState(state: Record<string, Record<string, number>>): void {
  ensureVitalsTables();
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO vitals_sim_state (astronaut_id, metric, value) VALUES (?, ?, ?)
     ON CONFLICT (astronaut_id, metric) DO UPDATE SET value = excluded.value`,
  );
  const tx = db.transaction(() => {
    for (const [astronautId, metrics] of Object.entries(state)) {
      for (const [metric, value] of Object.entries(metrics)) upsert.run(astronautId, metric, value);
    }
  });
  tx();
}

export function loadEpisodes(): SimEpisodeRow[] {
  ensureVitalsTables();
  return getDb().prepare('SELECT * FROM sim_episodes ORDER BY id').all() as SimEpisodeRow[];
}

export function saveEpisodes(episodes: Omit<SimEpisodeRow, 'id'>[]): void {
  ensureVitalsTables();
  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO sim_episodes (astronaut_id, name, metric, delta, ticks_left) VALUES (?, ?, ?, ?, ?)',
  );
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM sim_episodes').run();
    for (const e of episodes) insert.run(e.astronaut_id, e.name, e.metric, e.delta, e.ticks_left);
  });
  tx();
}

export function addEpisodeRows(rows: Omit<SimEpisodeRow, 'id'>[]): void {
  ensureVitalsTables();
  const insert = getDb().prepare(
    'INSERT INTO sim_episodes (astronaut_id, name, metric, delta, ticks_left) VALUES (?, ?, ?, ?, ?)',
  );
  for (const e of rows) insert.run(e.astronaut_id, e.name, e.metric, e.delta, e.ticks_left);
}

export function getMeta(key: string): string | undefined {
  ensureVitalsTables();
  const row = getDb().prepare('SELECT value FROM sim_meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function setMeta(key: string, value: string): void {
  ensureVitalsTables();
  getDb().prepare(
    `INSERT INTO sim_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}
