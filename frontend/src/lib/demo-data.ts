export interface AstronautProfile {
  id: string;
  name: string;
  role: string;
  mission: string;
  mission_day: number;
  allergies: string[];
  medical_history: string;
  baseline: string;
}

export const PROFILE: AstronautProfile = {
  id: 'demo-001',
  name: 'Alex Morgan',
  role: 'Mission specialist',
  mission: 'ARES-01',
  mission_day: 127,
  allergies: ['None reported (fictional)'],
  medical_history: 'No relevant history recorded in this fictional profile.',
  baseline: 'Heart rate 64–72 bpm · SpO₂ 97–100%',
};

export const VITALS = {
  heart_rate: 68,
  spo2: 98,
  temperature: 36.7,
  blood_pressure: '118/76',
  recorded_at: '2026-06-21T08:14:00Z',
  simulated: true as const,
};
