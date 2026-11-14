import type { TriageLevel, TriageResult } from './triage.ts';

/**
 * Deterministic vital-sign thresholds and the spaceflight-medicine rule KB.
 * Ported from the crew-health backend work on manufacturing-intel and adapted
 * to ASTRA conventions: levels use the repo-wide red/yellow/green vocabulary,
 * everything here is pure (no I/O) so it is unit-testable with node:test.
 */

export type VitalMetric =
  | 'heart_rate' | 'hrv' | 'spo2' | 'temperature'
  | 'systolic_bp' | 'diastolic_bp' | 'sleep_hours'
  | 'radiation_dose' | 'co2_pp' | 'stress_index';

export interface VitalSpec {
  label: string;
  unit: string;
  /** [min,max] green band; outside -> yellow; outside `red` band -> red */
  normal: [number, number];
  red: [number, number];
  decimals: number;
}

export const VITAL_SPECS: Record<VitalMetric, VitalSpec> = {
  heart_rate:     { label: 'Heart rate', unit: 'bpm', normal: [45, 100], red: [38, 130], decimals: 0 },
  hrv:            { label: 'Heart-rate variability (RMSSD)', unit: 'ms', normal: [25, Infinity], red: [15, Infinity], decimals: 0 },
  spo2:           { label: 'Blood oxygen saturation', unit: '%', normal: [95, 101], red: [90, 101], decimals: 1 },
  temperature:    { label: 'Core body temperature', unit: '°C', normal: [36.1, 37.5], red: [35.0, 38.3], decimals: 1 },
  systolic_bp:    { label: 'Systolic blood pressure', unit: 'mmHg', normal: [90, 130], red: [80, 150], decimals: 0 },
  diastolic_bp:   { label: 'Diastolic blood pressure', unit: 'mmHg', normal: [60, 85], red: [50, 95], decimals: 0 },
  sleep_hours:    { label: 'Sleep (last 24h)', unit: 'h', normal: [6, 10], red: [4, Infinity], decimals: 1 },
  radiation_dose: { label: 'Radiation dose rate', unit: 'mSv/day', normal: [0, 0.5], red: [0, 1.0], decimals: 2 },
  co2_pp:         { label: 'Cabin CO2 partial pressure', unit: 'mmHg', normal: [0, 3], red: [0, 5], decimals: 1 },
  stress_index:   { label: 'Stress index', unit: 'idx', normal: [0, 40], red: [0, 70], decimals: 0 },
};

export const VITAL_METRICS = Object.keys(VITAL_SPECS) as VitalMetric[];

export function evaluateVital(metric: VitalMetric, value: number): TriageLevel {
  const s = VITAL_SPECS[metric];
  if (value < s.red[0] || value > s.red[1]) return 'red';
  if (value < s.normal[0] || value > s.normal[1]) return 'yellow';
  return 'green';
}

export function normalBand(metric: VitalMetric): string {
  const s = VITAL_SPECS[metric];
  const lo = Number.isFinite(s.normal[0]) ? String(s.normal[0]) : '-inf';
  const hi = Number.isFinite(s.normal[1]) ? String(s.normal[1]) : 'inf';
  return `${lo}-${hi} ${s.unit}`;
}

export function alertMessage(metric: VitalMetric, value: number, level: TriageLevel): string {
  const s = VITAL_SPECS[metric];
  const dir = value > s.normal[1] ? 'above' : 'below';
  return `${s.label} ${value} ${s.unit} is ${dir} the normal band (${normalBand(metric)}) - ${level}.`;
}

export interface VitalDiagnosis {
  metric: VitalMetric;
  level: TriageLevel;
  value: number;
  interpretation: string;
  countermeasures: string[];
  escalate: boolean;
}

interface KbEntry { interpretation: string; countermeasures: string[]; }

// Rule-based spaceflight-medicine knowledge base (illustrative, not clinical).
const DIAGNOSIS_KB: Record<VitalMetric, { low: KbEntry; high: KbEntry }> = {
  heart_rate: {
    high: {
      interpretation: 'Tachycardia. In flight this is commonly exercise load, stress, sleep debt, dehydration, or early infection; post-EVA fluid shifts can contribute.',
      countermeasures: ['Re-measure after 15 min rest to exclude an exercise artifact', 'Review fluid/electrolyte intake and the sleep log', 'If sustained >30 min or paired with SpO2 drop or chest symptoms, escalate to human medical support'],
    },
    low: {
      interpretation: 'Bradycardia. Often benign in conditioned crew, but new-onset can indicate hypoxia, hypothermia, or a conduction problem.',
      countermeasures: ['Cross-check SpO2 and core temperature', 'Ask about dizziness, fatigue, or near-syncope', 'New or symptomatic bradycardia warrants an ECG and a telemedicine consult'],
    },
  },
  hrv: {
    high: {
      interpretation: 'High HRV usually reflects good cardiovascular fitness; confirm the reading was taken at rest.',
      countermeasures: ['Verify measurement context (resting, no artifact)'],
    },
    low: {
      interpretation: 'Reduced HRV points to fatigue, autonomic stress, dehydration, or a prodrome of illness.',
      countermeasures: ['Review sleep and workload over the last 48 h', 'Hydration check', 'A sustained drop over several days warrants CMO review'],
    },
  },
  spo2: {
    high: {
      interpretation: 'SpO2 above the physiological range suggests a sensor artifact.',
      countermeasures: ['Recalibrate or swap the pulse oximeter', 'Check peripheral perfusion (cold hands distort readings)'],
    },
    low: {
      interpretation: 'Desaturation is a red flag in a spacecraft: possible cabin pressure or O2 partial-pressure loss, ECLSS/suit fault, CO2 build-up, or respiratory illness.',
      countermeasures: ['Verify cabin pressure and O2 partial pressure immediately', 'Check CO2 scrubber status and inter-module ventilation', 'Supplemental O2 by mask if SpO2 <92%', 'Escalate to human medical support now'],
    },
  },
  temperature: {
    high: {
      interpretation: 'Elevated temperature suggests infection (respiratory, skin, urinary); post-exercise elevation is also possible.',
      countermeasures: ['Re-measure at rest in 30 min', 'Screen for infection symptoms; antipyretics per CMO protocol', 'Fever >38.3 C persisting: telemedicine consult and isolate pending evaluation'],
    },
    low: {
      interpretation: 'Low core temperature: check cabin thermal control and suit cooling loops.',
      countermeasures: ['Verify cabin temperature and airflow at the sleep station', 'Active rewarming and re-measurement', 'If <35 C escalate: possible ECLSS thermal-control fault'],
    },
  },
  systolic_bp: {
    high: {
      interpretation: 'Hypertensive response: stress, high-sodium diet, elevated cabin CO2, deconditioning, pain, or caffeine.',
      countermeasures: ['Rest and re-measure with correct cuff size', 'Review diet sodium and cabin CO2', 'Serial elevation: log trends and consult the flight surgeon for medication review'],
    },
    low: {
      interpretation: 'Hypotension: dehydration, orthostatic intolerance (post-EVA/post-landing), anemia, or acute illness.',
      countermeasures: ['Fluid loading per CMO protocol', 'Check orthostatic symptoms on standing', 'Symptomatic episodes: escalate to rule out bleeding or arrhythmia'],
    },
  },
  diastolic_bp: {
    high: {
      interpretation: 'Elevated diastolic pressure: same drivers as systolic hypertension (stress, sodium, CO2, deconditioning).',
      countermeasures: ['Rest and re-measure', 'Review diet sodium and cabin CO2', 'Serial elevation: consult the flight surgeon'],
    },
    low: {
      interpretation: 'Low diastolic pressure: dehydration or vasodilation; check for orthostatic symptoms.',
      countermeasures: ['Fluid loading per CMO protocol', 'Monitor trend with systolic readings'],
    },
  },
  sleep_hours: {
    high: {
      interpretation: 'Hypersomnia can indicate illness, low mood, or medication effects.',
      countermeasures: ['CMO to screen mood and workload', 'Review medications', 'Persistent pattern: schedule a private psychological support session'],
    },
    low: {
      interpretation: 'Sleep debt degrades cognition, mood, and immune function; common during high-workload and EVA periods.',
      countermeasures: ['Protect the next sleep period; adjust the timeline where possible', 'Sleep hygiene: dark, quiet, fixed schedule; short-term melatonin per CMO protocol', '>3 consecutive short nights warrants a workload review'],
    },
  },
  radiation_dose: {
    high: {
      interpretation: 'Elevated dose rate: possible solar particle event (SPE), South Atlantic Anomaly passage, or dosimeter placement issue.',
      countermeasures: ['Request the SPE forecast from the ground radiation desk', 'Shelter in the most shielded module; postpone EVAs', 'Verify cumulative dose against mission career limits', 'Increase dosimetry sampling frequency'],
    },
    low: {
      interpretation: 'Dose rate below typical background: verify the dosimeter is powered and worn.',
      countermeasures: ['Check dosimeter status'],
    },
  },
  co2_pp: {
    high: {
      interpretation: 'Cabin CO2 is rising: scrubber (CDRA) underperformance, a ventilation dead zone, or elevated crew load.',
      countermeasures: ['Check CDRA status; replace sorbent beds as needed', 'Increase inter-module ventilation; verify fans', 'If >5 mmHg deploy the portable scrubber and consider lowering setpoints', 'Headache or visual changes: reduce workload and consult the flight surgeon'],
    },
    low: {
      interpretation: 'CO2 below the normal band is nominal; no action needed.',
      countermeasures: [],
    },
  },
  stress_index: {
    high: {
      interpretation: 'Elevated stress index: workload pressure, sleep debt, isolation, or crew-interaction strain.',
      countermeasures: ['Adjust workload and protect off-duty time', 'Schedule a private psychological support call with ground', 'Exercise session; family conference if the timeline allows', 'CMO to review sleep and HRV trends alongside'],
    },
    low: {
      interpretation: 'Stress index below the normal band is nominal.',
      countermeasures: [],
    },
  },
};

export function diagnose(metric: VitalMetric, value: number): VitalDiagnosis | null {
  const level = evaluateVital(metric, value);
  if (level === 'green') return null;
  const s = VITAL_SPECS[metric];
  const dir: 'low' | 'high' = value > s.normal[1] ? 'high' : 'low';
  const kb = DIAGNOSIS_KB[metric][dir];
  return { metric, level, value, interpretation: kb.interpretation, countermeasures: kb.countermeasures, escalate: level === 'red' };
}

const LEVEL_RANK: Record<TriageLevel, number> = { green: 0, yellow: 1, red: 2 };

/** Worst-of two deterministic triage results; ties keep the first (message rule). */
export function combineTriage(a: TriageResult, b: TriageResult): TriageResult {
  return LEVEL_RANK[a.level] >= LEVEL_RANK[b.level] ? a : b;
}

/**
 * Independent deterministic vitals rule, same contract as triage():
 * red whenever any tracked vital breaches its red band, yellow on any
 * out-of-band reading, green otherwise. Never validated clinical output.
 */
export function vitalsTriageRule(abnormal: VitalDiagnosis[]): TriageResult {
  const reds = abnormal.filter((d) => d.level === 'red');
  const yellows = abnormal.filter((d) => d.level === 'yellow');
  const fmt = (d: VitalDiagnosis) => `${VITAL_SPECS[d.metric].label} ${d.value} ${VITAL_SPECS[d.metric].unit}`;
  if (reds.length > 0) {
    return {
      level: 'red',
      reason: `Deterministic vitals rule: critical threshold breach (${reds.map(fmt).join('; ')}). Activate the approved mission emergency procedure and contact human medical support immediately.`,
      requires_human_support: true,
      rule_id: 'VITALS-RED-01',
      validated: false,
    };
  }
  if (yellows.length > 0) {
    return {
      level: 'yellow',
      reason: `Deterministic vitals rule: readings outside normal bands (${yellows.map(fmt).join('; ')}). Further assessment is required; this is not a validated clinical triage result.`,
      requires_human_support: true,
      rule_id: 'VITALS-YELLOW-01',
      validated: false,
    };
  }
  return {
    level: 'green',
    reason: 'Deterministic vitals rule: all tracked vitals are within normal bands. This does not rule out a medical concern.',
    requires_human_support: false,
    rule_id: 'VITALS-GREEN-01',
    validated: false,
  };
}
