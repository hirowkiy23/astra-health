export interface Astronaut {
  id: string;
  name: string;
  mission: string;
  status: 'Good' | 'Review' | 'Critical';
  vitals: {
    heartRate: number;
    bloodPressure: string;
    temperature: number;
    spo2: number;
  };
  weight: number;
  environment: { oxygen: number; carbonDioxide: number; temperature: number; pressure: number; humidity: number };
}

/** Fictional demo crew. Values are illustrative and not clinical measurements. */
export const CREW: Astronaut[] = [
  {
    id: 'astro-1', name: 'ASTRO - 1!', mission: 'ARES-01', status: 'Good',
    vitals: { heartRate: 68, bloodPressure: '118/76', temperature: 36.7, spo2: 98 }, weight: 67,
    environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 },
  },
  {
    id: 'astro-2', name: 'ASTRO - 2', mission: 'ARES-01', status: 'Good',
    vitals: { heartRate: 65, bloodPressure: '116/74', temperature: 36.5, spo2: 99 }, weight: 71,
    environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 },
  },
  {
    id: 'astro-3', name: 'ASTRO - 3', mission: 'ARES-01', status: 'Review',
    vitals: { heartRate: 74, bloodPressure: '121/78', temperature: 36.9, spo2: 97 }, weight: 63,
    environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 },
  },
  {
    id: 'astro-4', name: 'ASTRO - 4', mission: 'ARES-01', status: 'Good',
    vitals: { heartRate: 69, bloodPressure: '119/75', temperature: 36.6, spo2: 98 }, weight: 69,
    environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 },
  },
  {
    id: 'astro-5', name: 'ASTRO - 5', mission: 'ARES-01', status: 'Good',
    vitals: { heartRate: 66, bloodPressure: '115/73', temperature: 36.5, spo2: 99 }, weight: 66,
    environment: { oxygen: 20.9, carbonDioxide: 0.04, temperature: 22, pressure: 101.2, humidity: 45 },
  },
];
