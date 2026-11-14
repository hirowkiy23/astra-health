import { CREW } from './crew.ts';
import { PROFILE } from './demo-data.ts';
import type { Vitals } from './triage.ts';
import {
  VITAL_METRICS, VITAL_SPECS, diagnose, evaluateVital, vitalsTriageRule,
  type VitalDiagnosis, type VitalMetric,
} from './vitals-specs.ts';
import {
  addEpisodeRows, insertReading, latestPerMetric, listAlerts, loadEpisodes,
  loadSimState, saveEpisodes, saveSimState, setMeta, getMeta, syncAlertForReading,
  type SimEpisodeRow,
} from './vitals-db.ts';

/**
 * Continuous vitals telemetry for the whole demo crew.
 *
 * Next.js route handlers can't own a background process, so the simulator is
 * lazy: any read path calls ensureFreshVitals(), which advances the random
 * walk at most once per TICK_MS. POST /api/vitals/tick can force a step and
 * inject incident episodes for demos and tests. State (last values, episodes,
 * last tick) lives in SQLite, so restarts resume instead of resetting.
 */

export const TICK_MS = 30_000;

export const SIM_ASTRONAUT_IDS: string[] = [PROFILE.id, ...CREW.map((c) => c.id)];

/** Deterministic PRNG (mulberry32) so simulator behaviour is unit-testable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface EpisodeTemplate {
  name: string;
  ticks: number;
  effects: { metric: VitalMetric; delta: number }[];
}

export const EPISODE_TEMPLATES: EpisodeTemplate[] = [
  { name: 'post-exa-stress', ticks: 8, effects: [
    { metric: 'heart_rate', delta: 38 }, { metric: 'stress_index', delta: 32 },
    { metric: 'hrv', delta: -22 }, { metric: 'spo2', delta: -3.5 } ] },
  { name: 'solar-particle-event', ticks: 6, effects: [
    { metric: 'radiation_dose', delta: 1.4 }, { metric: 'stress_index', delta: 12 } ] },
  { name: 'sleep-debt', ticks: 10, effects: [
    { metric: 'sleep_hours', delta: -3.2 }, { metric: 'stress_index', delta: 14 },
    { metric: 'hrv', delta: -10 } ] },
  { name: 'co2-scrubber-fault', ticks: 8, effects: [
    { metric: 'co2_pp', delta: 2.6 }, { metric: 'heart_rate', delta: 8 },
    { metric: 'stress_index', delta: 10 } ] },
  { name: 'febrile-illness', ticks: 12, effects: [
    { metric: 'temperature', delta: 1.4 }, { metric: 'heart_rate', delta: 18 },
    { metric: 'spo2', delta: -1.5 } ] },
];

const BASELINES: Record<VitalMetric, { mean: number; sigma: number; min: number; max: number }> = {
  heart_rate: { mean: 64, sigma: 4, min: 35, max: 190 },
  hrv: { mean: 48, sigma: 6, min: 5, max: 150 },
  spo2: { mean: 97.5, sigma: 0.7, min: 70, max: 100 },
  temperature: { mean: 36.8, sigma: 0.12, min: 33, max: 41 },
  systolic_bp: { mean: 114, sigma: 4, min: 70, max: 200 },
  diastolic_bp: { mean: 72, sigma: 3, min: 40, max: 120 },
  sleep_hours: { mean: 6.8, sigma: 0.4, min: 0, max: 12 },
  radiation_dose: { mean: 0.28, sigma: 0.04, min: 0.05, max: 4 },
  co2_pp: { mean: 2.4, sigma: 0.25, min: 0.5, max: 10 },
  stress_index: { mean: 32, sigma: 5, min: 0, max: 100 },
};

export type SimState = Record<string, Record<string, number>>;

export interface SimReading {
  astronautId: string;
  metric: VitalMetric;
  value: number;
  ts: string;
}

function clamp(metric: VitalMetric, v: number): number {
  const b = BASELINES[metric];
  return Math.min(Math.max(v, b.min), b.max);
}

function round(metric: VitalMetric, v: number): number {
  const f = 10 ** VITAL_SPECS[metric].decimals;
  return Math.round(v * f) / f;
}

function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Pure simulation step: advance every astronaut's vitals one tick around
 * their baselines plus any active episode deltas. Returns new state/episodes;
 * performs no I/O so tests can drive it with a seeded rng.
 */
export function generateTick(
  state: SimState,
  episodes: SimEpisodeRow[],
  astronautIds: string[],
  ts: string,
  rng: () => number,
  episodeChance = 0.03,
): { readings: SimReading[]; state: SimState; episodes: SimEpisodeRow[] } {
  const nextEpisodes: SimEpisodeRow[] = episodes.map((e) => ({ ...e }));
  const readings: SimReading[] = [];

  for (const astronautId of astronautIds) {
    const vals: Record<string, number> = { ...(state[astronautId] ?? {}) };
    if (Object.keys(vals).length === 0) {
      for (const m of VITAL_METRICS) {
        const b = BASELINES[m];
        vals[m] = round(m, clamp(m, b.mean + gauss(rng) * b.sigma * 0.5));
      }
    }

    const hasEpisode = nextEpisodes.some((e) => e.astronaut_id === astronautId);
    if (!hasEpisode && rng() < episodeChance) {
      const t = EPISODE_TEMPLATES[Math.floor(rng() * EPISODE_TEMPLATES.length)];
      for (const eff of t.effects) {
        nextEpisodes.push({ id: 0, astronaut_id: astronautId, name: t.name, metric: eff.metric, delta: eff.delta, ticks_left: t.ticks });
      }
    }

    const active = nextEpisodes.filter((e) => e.astronaut_id === astronautId);
    for (const m of VITAL_METRICS) {
      const b = BASELINES[m];
      const delta = active.filter((e) => e.metric === m).reduce((s, e) => s + e.delta, 0);
      const target = b.mean + delta;
      const prev = vals[m] ?? b.mean;
      vals[m] = round(m, clamp(m, prev + (target - prev) * 0.35 + gauss(rng) * b.sigma * 0.4));
      readings.push({ astronautId, metric: m, value: vals[m], ts });
    }
  }

  const remaining = nextEpisodes
    .map((e) => ({ ...e, ticks_left: e.ticks_left - 1 }))
    .filter((e) => e.ticks_left > 0);

  return { readings, state: { ...state, ...Object.fromEntries(astronautIds.map((id) => [id, { ...(state[id] ?? {}), ...pickState(readings, id) }])) }, episodes: remaining };
}

function pickState(readings: SimReading[], astronautId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of readings) if (r.astronautId === astronautId) out[r.metric] = r.value;
  return out;
}

export interface TickSummary {
  skipped: boolean;
  readings: number;
  abnormal: number;
  alertChanges: number;
  generatedAt?: string;
}

/** Advance the simulator if the last tick is older than TICK_MS (or force it). */
export function runVitalsTick(opts: { force?: boolean; rng?: () => number } = {}): TickSummary {
  const now = Date.now();
  const last = Number(getMeta('last_tick_ms') ?? '0');
  if (!opts.force && now - last < TICK_MS) return { skipped: true, readings: 0, abnormal: 0, alertChanges: 0 };

  const ts = new Date(now).toISOString();
  const result = generateTick(loadSimState(), loadEpisodes(), SIM_ASTRONAUT_IDS, ts, opts.rng ?? Math.random);

  let abnormal = 0;
  let alertChanges = 0;
  for (const r of result.readings) {
    insertReading({ astronautId: r.astronautId, metric: r.metric, value: r.value, source: 'sim', ts: r.ts });
    if (evaluateVital(r.metric, r.value) !== 'green') abnormal++;
    const sync = syncAlertForReading(r.astronautId, r.metric, r.value);
    if (sync.outcome === 'created' || sync.outcome === 'resolved') alertChanges++;
  }
  saveSimState(result.state);
  saveEpisodes(result.episodes);
  setMeta('last_tick_ms', String(now));

  return { skipped: false, readings: result.readings.length, abnormal, alertChanges, generatedAt: ts };
}

/** Lazy tick used by read paths so telemetry looks continuous without a daemon. */
export function ensureFreshVitals(): void {
  runVitalsTick({ force: false });
}

/** Queue an incident scenario for the next tick(s). */
export function forceEpisode(astronautId: string, templateName: string): void {
  const t = EPISODE_TEMPLATES.find((x) => x.name === templateName);
  if (!t) throw new Error(`unknown episode template: ${templateName}`);
  if (!SIM_ASTRONAUT_IDS.includes(astronautId)) throw new Error(`unknown astronaut: ${astronautId}`);
  addEpisodeRows(t.effects.map((eff) => ({
    astronaut_id: astronautId, name: t.name, metric: eff.metric, delta: eff.delta, ticks_left: t.ticks,
  })));
}

export interface VitalsSnapshot {
  astronaut_id: string;
  generated_at: string;
  vitals: Record<string, { value: number; unit: string; level: string; recorded_at: string }>;
  abnormal: VitalDiagnosis[];
  active_alerts: { id: string; metric: string; severity: string; message: string; status: string; created_at: string }[];
  triage: ReturnType<typeof vitalsTriageRule>;
}

/** Latest reading per metric for one astronaut, evaluated and rolled up into a deterministic vitals triage. */
export function getVitalsSnapshot(astronautId: string): VitalsSnapshot {
  ensureFreshVitals();
  const latest = latestPerMetric(astronautId);
  const vitals: VitalsSnapshot['vitals'] = {};
  const abnormal: VitalDiagnosis[] = [];
  for (const row of latest) {
    vitals[row.metric] = { value: row.value, unit: row.unit, level: row.level, recorded_at: row.recorded_at };
    const d = diagnose(row.metric as VitalMetric, row.value);
    if (d) abnormal.push(d);
  }
  const alerts = listAlerts({ astronautId, status: 'active' });
  return {
    astronaut_id: astronautId,
    generated_at: new Date().toISOString(),
    vitals,
    abnormal,
    active_alerts: alerts.map((a) => ({
      id: a.id, metric: a.metric, severity: a.severity, message: a.message, status: a.status, created_at: a.created_at,
    })),
    triage: vitalsTriageRule(abnormal),
  };
}

/** Adapt a live snapshot to the legacy Vitals shape used by triage()/the LLM payload. */
export function toDemoVitals(snapshot: VitalsSnapshot): Vitals {
  const v = snapshot.vitals;
  const sys = v.systolic_bp?.value ?? 118;
  const dia = v.diastolic_bp?.value ?? 76;
  const recordedAt = Object.values(v).map((x) => x.recorded_at).sort().pop() ?? new Date().toISOString();
  return {
    heart_rate: v.heart_rate?.value ?? 68,
    spo2: v.spo2?.value ?? 98,
    temperature: v.temperature?.value ?? 36.7,
    blood_pressure: `${sys}/${dia}`,
    recorded_at: recordedAt,
    simulated: true,
  };
}
