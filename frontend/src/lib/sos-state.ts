import { getDb } from './db.ts';
import { CREW, type CrewStatus } from './crew.ts';

/**
 * Crew SOS state, persisted in SQLite so an SOS alert survives reload and is
 * visible to the rest of the crew. The default status comes from CREW.
 */

export interface SosState {
  astronaut_id: string;
  status: CrewStatus;
  alerted_at: string | null;
}

function ensureSosTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS crew_status (
      astronaut_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      alerted_at TEXT
    );
  `);
}

/** Current status for one astronaut, falling back to their CREW default. */
export function getCrewStatus(astronautId: string): CrewStatus {
  ensureSosTable();
  const row = getDb().prepare('SELECT status FROM crew_status WHERE astronaut_id = ?').get(astronautId) as { status: string } | undefined;
  if (row) return row.status as CrewStatus;
  return CREW.find(c => c.id === astronautId)?.status ?? 'Good';
}

/** All crew statuses (merged with CREW defaults). */
export function getAllCrewStatuses(): Record<string, CrewStatus> {
  const out: Record<string, CrewStatus> = {};
  for (const c of CREW) out[c.id] = getCrewStatus(c.id);
  return out;
}

/** Set an astronaut's status and return the new state. */
export function setCrewStatus(astronautId: string, status: CrewStatus): SosState {
  ensureSosTable();
  const alertedAt = status === 'SOS' ? new Date().toISOString() : null;
  getDb().prepare(
    'INSERT INTO crew_status (astronaut_id, status, alerted_at) VALUES (?, ?, ?) ON CONFLICT(astronaut_id) DO UPDATE SET status = excluded.status, alerted_at = excluded.alerted_at',
  ).run(astronautId, status, alertedAt);
  return { astronaut_id: astronautId, status, alerted_at: alertedAt };
}

/** Trigger SOS: change the astronaut's status from "Good" to "SOS". */
export function triggerSos(astronautId: string): SosState {
  return setCrewStatus(astronautId, 'SOS');
}

/** Resolve an SOS back to "Good" (e.g. "Feeling Better" or "Acknowledge"). */
export function resolveSos(astronautId: string): SosState {
  return setCrewStatus(astronautId, 'Good');
}
