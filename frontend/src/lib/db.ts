import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TriageLevel } from './triage.ts';

export interface ChatMessage {
  id: number;
  consultation_id: string;
  astronaut_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: string | null;
  created_at: string;
}

export function appendMessage(
  consultationId: string,
  astronautId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>,
): void {
  getDb().prepare(
    'INSERT INTO chat_messages (consultation_id, astronaut_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(consultationId, astronautId, role, content, metadata ? JSON.stringify(metadata) : null, new Date().toISOString());
}

export function listMessages(consultationId: string, limit = 40): ChatMessage[] {
  const rows = getDb().prepare(
    'SELECT * FROM (SELECT * FROM chat_messages WHERE consultation_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id ASC',
  ).all(consultationId, limit) as ChatMessage[];
  return rows;
}

export interface IncidentRow {
  id: string;
  consultation_id: string;
  astronaut_id: string;
  severity: TriageLevel;
  symptoms: string;
  response: string;
  status: string;
  rule_id: string;
  vitals_json: string | null;
  created_at: string;
}

let db: Database.Database | null = null;

/** Lazily open the SQLite file so tests can point ASTRA_DATA_DIR at a temp directory. */
export function getDb(): Database.Database {
  if (db) return db;
  const dir = process.env.ASTRA_DATA_DIR || join(process.cwd(), 'data');
  mkdirSync(dir, { recursive: true });
  db = new Database(join(dir, 'astra.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      consultation_id TEXT NOT NULL,
      astronaut_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      response TEXT NOT NULL,
      status TEXT NOT NULL,
      rule_id TEXT NOT NULL,
      vitals_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      astronaut_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      mood INTEGER,
      note TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultation_id TEXT NOT NULL,
      astronaut_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS chat_messages_consultation ON chat_messages (consultation_id, id);
  `);
  // Additive migration: existing demo databases predate the vitals snapshot column.
  const columns = db.prepare('PRAGMA table_info(incidents)').all() as { name: string }[];
  if (!columns.some(column => column.name === 'vitals_json')) {
    db.exec('ALTER TABLE incidents ADD COLUMN vitals_json TEXT');
  }
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}

export interface NewIncident {
  astronautId: string;
  consultationId: string;
  symptoms: string;
  severity: TriageLevel;
  response: string;
  ruleId: string;
  vitalsJson?: string;
}

export function saveIncident(incident: NewIncident): string {
  const id = `INC-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  getDb().prepare(
    'INSERT INTO incidents (id, consultation_id, astronaut_id, severity, symptoms, response, status, rule_id, vitals_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    id,
    incident.consultationId,
    incident.astronautId,
    incident.severity,
    incident.symptoms,
    incident.response,
    'open',
    incident.ruleId,
    incident.vitalsJson ?? null,
    new Date().toISOString(),
  );
  return id;
}

export function listIncidents(): IncidentRow[] {
  return getDb().prepare(
    'SELECT id, consultation_id, astronaut_id, severity, symptoms, status, rule_id, vitals_json, created_at FROM incidents ORDER BY created_at DESC, rowid DESC',
  ).all() as IncidentRow[];
}

export function getIncident(id: string): IncidentRow | undefined {
  return getDb().prepare('SELECT * FROM incidents WHERE id = ?').get(id) as IncidentRow | undefined;
}
