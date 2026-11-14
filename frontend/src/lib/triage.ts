export type TriageLevel = 'red' | 'yellow' | 'green';

export interface TriageResult {
  level: TriageLevel;
  reason: string;
  requires_human_support: boolean;
  rule_id: string;
  validated: false;
}

export interface Vitals {
  heart_rate: number;
  spo2: number;
  temperature: number;
  blood_pressure: string;
  recorded_at: string;
  simulated: true;
}

const EMERGENCY_TERMS = [
  'severe chest pain', 'trouble breathing', 'difficulty breathing',
  "can't breathe", 'cannot breathe', 'unconscious', 'unresponsive', 'severe bleeding',
];

// Critical radiation self-reports. Kept separate from the symptom terms below
// because radiation hazard reporting must escalate to red rather than yellow.
const CRITICAL_RADIATION_TERMS = [
  'radiation sickness', 'acute radiation', 'high radiation', 'severe radiation',
  'radiation poisoning', 'radiation burns', 'vomiting after radiation',
];

const SYMPTOM_TERMS = ['dizzy', 'dizziness', 'nausea', 'headache', 'faint', 'unsteady', 'radiation', 'solar flare', 'solar particle'];

// Questions about a hazard are not self-reports; they must not be mistaken for symptoms.
const QUESTION_PATTERNS = [
  /^what\b/, /^why\b/, /^how\b/, /^explain\b/, /^tell me\b/, /^describe\b/,
  /\brisks?\b.*\?$/, /\?$/,
];

function isQuestion(text: string): boolean {
  return QUESTION_PATTERNS.some(pattern => pattern.test(text));
}

export function triage(message: string, vitals: Vitals): TriageResult {
  const text = message.toLowerCase();
  const criticalVital = vitals.spo2 < 85 || vitals.heart_rate > 150 || vitals.heart_rate < 30;
  if (criticalVital) {
    const readings = [`HR ${vitals.heart_rate} bpm`, `SpO₂ ${vitals.spo2}%`];
    return {
      level: 'red',
      reason: `Illustrative critical vital-sign rule matched (${readings.join(', ')}). Activate the approved mission emergency procedure and contact human medical support immediately. Confirm the reading if the approved procedure calls for it.`,
      requires_human_support: true,
      rule_id: 'DEMO-VITAL-CRITICAL-01',
      validated: false,
    };
  }
  if (CRITICAL_RADIATION_TERMS.some(term => text.includes(term))) {
    return {
      level: 'red',
      reason: 'Illustrative critical radiation-exposure rule matched. Activate the approved mission radiation emergency procedure and contact human medical support immediately.',
      requires_human_support: true,
      rule_id: 'DEMO-RADIATION-CRITICAL-01',
      validated: false,
    };
  }
  if (EMERGENCY_TERMS.some(term => text.includes(term))) {
    return {
      level: 'red',
      reason: 'Illustrative emergency symptom rule matched. Activate the approved mission emergency procedure and contact human medical support immediately.',
      requires_human_support: true,
      rule_id: 'DEMO-EMERGENCY-01',
      validated: false,
    };
  }
  const abnormalVital = vitals.spo2 < 90 || vitals.heart_rate > 120 || vitals.heart_rate < 40 || vitals.temperature >= 39;
  if (abnormalVital) {
    return {
      level: 'yellow',
      reason: `Illustrative vital-sign rule matched (heart rate ${vitals.heart_rate} bpm, SpO₂ ${vitals.spo2}%, temperature ${vitals.temperature}°C). Further assessment is required; this threshold is not clinically validated.`,
      requires_human_support: true,
      rule_id: 'DEMO-VITAL-REVIEW-01',
      validated: false,
    };
  }
  if (SYMPTOM_TERMS.some(term => text.includes(term)) && !isQuestion(text)) {
    if (!vitals.recorded_at) {
      return {
        level: 'yellow',
        reason: 'Vital readings are unavailable or stale. Further assessment is required; do not interpret missing data as normal.',
        requires_human_support: true,
        rule_id: 'DEMO-VITAL-MISSING-01',
        validated: false,
      };
    }
    const radiationReport = ['radiation', 'solar flare', 'solar particle'].some(term => text.includes(term));
    return {
      level: 'yellow',
      reason: radiationReport
        ? 'Illustrative radiation-exposure rule matched; further assessment is required. This is not a validated clinical triage result.'
        : 'Illustrative symptom rule matched; further assessment is required. This is not a validated clinical triage result.',
      requires_human_support: true,
      rule_id: radiationReport ? 'DEMO-RADIATION-REVIEW-01' : 'DEMO-SYMPTOM-01',
      validated: false,
    };
  }
  return {
    level: 'green',
    reason: 'No illustrative escalation rule matched. This does not rule out a medical concern.',
    requires_human_support: false,
    rule_id: 'DEMO-DEFAULT-01',
    validated: false,
  };
}
