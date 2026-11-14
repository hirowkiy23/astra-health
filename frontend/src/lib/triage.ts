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

const SYMPTOM_TERMS = ['dizzy', 'dizziness', 'nausea', 'headache', 'faint', 'unsteady'];

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
  if (SYMPTOM_TERMS.some(term => text.includes(term))) {
    if (!vitals.recorded_at) {
      return {
        level: 'yellow',
        reason: 'Vital readings are unavailable or stale. Further assessment is required; do not interpret missing data as normal.',
        requires_human_support: true,
        rule_id: 'DEMO-VITAL-MISSING-01',
        validated: false,
      };
    }
    return {
      level: 'yellow',
      reason: 'Illustrative symptom rule matched; further assessment is required. This is not a validated clinical triage result.',
      requires_human_support: true,
      rule_id: 'DEMO-SYMPTOM-01',
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
