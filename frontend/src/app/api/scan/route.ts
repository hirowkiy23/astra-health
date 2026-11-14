import { NextResponse } from 'next/server';
import { generateScan, weekKeyFromDate } from '@/lib/scan-sim';
import { latestDailyLog, saveDailyLog } from '@/lib/daily-logs';
import { PROFILE } from '@/lib/demo-data';
import { CREW } from '@/lib/crew';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const astronautId = url.searchParams.get('astronaut_id') ?? PROFILE.id;

  const knownIds = new Set<string>([PROFILE.id, ...CREW.map((c) => c.id)]);
  if (!knownIds.has(astronautId)) {
    return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
  }

  const latest = latestDailyLog(astronautId, 'ultrasound');
  const weekKey = latest
    ? weekKeyFromDate(new Date(latest.created_at))
    : weekKeyFromDate(new Date());

  const scan = generateScan(astronautId, weekKey, latest?.created_at ?? new Date().toISOString());

  return NextResponse.json({
    astronaut_id: astronautId,
    scan,
    has_scan: Boolean(latest),
    simulated: true,
  });
}

/** Record a weekly scan completion and return the freshly generated illustrative scan. */
export async function POST(request: Request) {
  let body: { astronaut_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const astronautId = body.astronaut_id ?? PROFILE.id;
  const knownIds = new Set<string>([PROFILE.id, ...CREW.map((c) => c.id)]);
  if (!knownIds.has(astronautId)) {
    return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
  }

  const id = saveDailyLog({ astronautId, kind: 'ultrasound', note: 'Weekly ultrasound scan completed' });
  const createdAt = new Date().toISOString();
  const scan = generateScan(astronautId, weekKeyFromDate(new Date()), createdAt);

  return NextResponse.json({ id, scan, simulated: true }, { status: 201 });
}
