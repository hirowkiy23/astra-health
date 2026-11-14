import { NextResponse } from 'next/server';
import { PROFILE } from '@/lib/demo-data';
import { SIM_ASTRONAUT_IDS } from '@/lib/vitals-sim';
import { VITAL_METRICS, type VitalMetric } from '@/lib/vitals-specs';
import { listHistory } from '@/lib/vitals-db';

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('astronaut_id') ?? PROFILE.id;
  if (!SIM_ASTRONAUT_IDS.includes(id)) {
    return NextResponse.json({ detail: 'Unknown astronaut' }, { status: 404 });
  }
  const metric = params.get('metric');
  if (metric !== null && !VITAL_METRICS.includes(metric as VitalMetric)) {
    return NextResponse.json({ detail: `metric must be one of ${VITAL_METRICS.join(', ')}` }, { status: 422 });
  }
  const hours = Number(params.get('hours') ?? '24');
  const limit = Number(params.get('limit') ?? '500');
  const readings = listHistory(id, {
    metric: (metric ?? undefined) as VitalMetric | undefined,
    hours: Number.isFinite(hours) ? hours : 24,
    limit: Number.isFinite(limit) ? limit : 500,
  });
  return NextResponse.json({ astronaut_id: id, count: readings.length, readings, simulated: true });
}
