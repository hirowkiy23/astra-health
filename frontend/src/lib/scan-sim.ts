export type ScanStatus = 'nominal' | 'watch';

export interface ScanRegion {
  region: string;
  status: ScanStatus;
}

export interface SimulatedScan {
  astronautId: string;
  weekKey: string;
  generatedAt: string;
  regions: ScanRegion[];
  summary: string;
  watchCount: number;
}

const REGIONS = [
  'Cardiac', 'Pulmonary', 'Renal', 'Hepatic', 'Musculoskeletal',
  'Neurological', 'Vascular', 'Skeletal', 'Gastrointestinal', 'Ocular',
];

/** Deterministic FNV-1a hash so a scan is stable for a given astronaut + week. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** ISO week key, e.g. 2026-06-21 -> "2026-W25". */
export function weekKeyFromDate(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Generate a deterministic simulated full-body scan. Regions are almost always
 * nominal; occasionally one is flagged "watch" to exercise the review path.
 * This is ILLUSTRATIVE ONLY — it is not a diagnostic, not a measurement, and
 * must never be presented as one.
 */
export function generateScan(astronautId: string, weekKey: string, generatedAt: string): SimulatedScan {
  const regions: ScanRegion[] = REGIONS.map((region, index) => {
    // A low, deterministic "watch" probability seeded per region + week.
    const roll = hashString(`${astronautId}:${weekKey}:${region}:${index}`) % 100;
    const status: ScanStatus = roll < 12 ? 'watch' : 'nominal';
    return { region, status };
  });
  const watchCount = regions.filter(r => r.status === 'watch').length;
  const summary = watchCount === 0
    ? 'No simulated abnormalities were flagged. This is illustrative output only, not a clinical finding.'
    : `${watchCount} region${watchCount === 1 ? '' : 's'} flagged for review. Simulated and illustrative only — not a clinical finding.`;
  return { astronautId, weekKey, generatedAt, regions, summary, watchCount };
}
