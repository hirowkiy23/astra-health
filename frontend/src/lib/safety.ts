import type { TriageResult } from './triage.ts';

export interface MedicalResponse {
  message: string;
  warning_signs: string[];
  recommended_actions: string[];
  requires_human_support: boolean;
  mode: string;
}

const DEFAULT_WARNING_SIGNS = [
  'Severe or worsening symptoms',
  'New breathing difficulty, chest pain, confusion, fainting, or reduced responsiveness',
];

/** Parse a model reply that should be JSON, tolerating code fences or surrounding prose. */
export function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  const candidates = [cleaned];
  const braced = cleaned.match(/\{[\s\S]*\}/);
  if (braced) candidates.push(braced[0]);
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function normalizeAction(action: string): string {
  return action.toLowerCase().replace(/applicable /g, '').replace(/approved /g, '').trim();
}

/**
 * The deterministic triage result owns escalation. Model text may never lower it.
 * This runs on every response before it reaches the astronaut.
 */
export function enforceTriageSafety(response: MedicalResponse, triage: TriageResult): MedicalResponse {
  if (!triage.requires_human_support) return response;

  const safe: MedicalResponse = { ...response, requires_human_support: true };
  const original = safe.message ?? '';
  safe.message = /human medical support/i.test(original)
    ? original
    : `Contact human medical support now. ${original}`.trim();

  const actions: string[] = [];
  const seen = new Set<string>();
  for (const action of safe.recommended_actions ?? []) {
    const key = normalizeAction(action);
    if (!seen.has(key)) {
      seen.add(key);
      actions.push(action);
    }
  }

  if (triage.level === 'red') {
    const emergency = 'Activate the applicable approved mission emergency procedure.';
    if (!actions.some(a => normalizeAction(a) === normalizeAction(emergency))) {
      actions.unshift(emergency);
    }
  }

  safe.recommended_actions = actions;
  if (!safe.warning_signs?.length) safe.warning_signs = DEFAULT_WARNING_SIGNS;
  return safe;
}
