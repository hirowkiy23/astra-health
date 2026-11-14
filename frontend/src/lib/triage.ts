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

export function triage(message: string, _vitals: Vitals): TriageResult {
  const text = message.toLowerCase();
  if (EMERGENCY_TERMS.some(term => text.includes(term))) {
    return {
      level: 'red',
      reason: 'Illustrative emergency symptom rule matched. Activate the approved mission emergency procedure and contact human medical support immediately.',
      requires_human_support: true,
      rule_id: 'DEMO-EMERGENCY-01',
      validated: false,
    };
  }
  if (SYMPTOM_TERMS.some(term => text.includes(term))) {
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
