import { NextResponse } from 'next/server';
import { SIM_ASTRONAUT_IDS } from '@/lib/vitals-sim';
import { VITAL_METRICS, evaluateVital, type VitalMetric } from '@/lib/vitals-specs';
import { insertReading, syncAlertForReading } from '@/lib/vitals-db';

interface ReadingInput {
  astronaut_id?: string;
  metric?: string;
  value?: number;
  source?: string;
  recorded_at?: string;
}

const SOURCES = ['sim', 'manual', 'device'];

/** Manual/device vital ingestion: single reading or { readings: [...] } batch. */
export async function POST(request: Request) {
  let body: ReadingInput & { readings?: ReadingInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const list: ReadingInput[] = Array.isArray(body.readings) ? body.readings : [body];
  if (list.length === 0) return NextResponse.json({ detail: 'No readings supplied' }, { status: 422 });
  if (list.length > 500) return NextResponse.json({ detail: 'At most 500 readings per request' }, { status: 422 });

  const evaluations = [];
  for (const item of list) {
    const astronautId = item.astronaut_id;
    const metric = item.metric as VitalMetric | undefined;
    if (typeof astronautId !== 'string' || !SIM_ASTRONAUT_IDS.includes(astronautId)) {
      return NextResponse.json({ detail: `Unknown astronaut: ${String(astronautId)}` }, { status: 404 });
    }
    if (!metric || !VITAL_METRICS.includes(metric)) {
      return NextResponse.json({ detail: `metric must be one of ${VITAL_METRICS.join(', ')}` }, { status: 422 });
    }
    if (typeof item.value !== 'number' || !Number.isFinite(item.value)) {
      return NextResponse.json({ detail: 'value must be a finite number' }, { status: 422 });
    }
    const source = typeof item.source === 'string' && SOURCES.includes(item.source) ? item.source : 'manual';
    const row = insertReading({
      astronautId, metric, value: item.value, source,
      ts: typeof item.recorded_at === 'string' ? item.recorded_at : undefined,
    });
    const alert = syncAlertForReading(astronautId, metric, item.value);
    evaluations.push({ astronaut_id: astronautId, metric, value: item.value, level: evaluateVital(metric, item.value), alert });
  }

  return NextResponse.json({ inserted: evaluations.length, evaluations, simulated: true }, { status: 201 });
}
