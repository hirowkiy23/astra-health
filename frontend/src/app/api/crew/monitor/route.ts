import { NextResponse } from 'next/server';
import { CREW } from '@/lib/crew';
import { PROFILE } from '@/lib/demo-data';
import { SIM_ASTRONAUT_IDS, ensureFreshVitals, getVitalsSnapshot } from '@/lib/vitals-sim';

/** Whole-crew live monitoring view: simulated telemetry + deterministic vitals triage. */
export function GET() {
  ensureFreshVitals();
  const crew = SIM_ASTRONAUT_IDS.map((id) => {
    const s = getVitalsSnapshot(id);
    const meta = CREW.find((c) => c.id === id);
    return {
      astronaut_id: id,
      name: meta?.name ?? PROFILE.name,
      mission: meta?.mission ?? PROFILE.mission,
      live_status: s.triage.level,
      vitals_triage_rule: s.triage.rule_id,
      abnormal: s.abnormal.map((d) => ({ metric: d.metric, value: d.value, level: d.level })),
      open_alerts: s.active_alerts.length,
      generated_at: s.generated_at,
    };
  });
  return NextResponse.json({ crew, simulated: true });
}
