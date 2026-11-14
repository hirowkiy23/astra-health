import { NextResponse } from 'next/server';
import { saveDailyLog, listDailyLogs, latestDailyLog, hasRecentLog, type LogKind } from '@/lib/daily-logs';
import { PROFILE } from '@/lib/demo-data';
import { CREW } from '@/lib/crew';

interface DailyLogBody {
  astronaut_id?: string;
  kind?: string;
  mood?: number | null;
  note?: string | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const astronautId = url.searchParams.get('astronaut_id') ?? PROFILE.id;
  const kind = url.searchParams.get('kind') as LogKind | null;

  const knownIds = new Set<string>([PROFILE.id, ...CREW.map((c) => c.id)]);
  if (!knownIds.has(astronautId)) {
    return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
  }

  const logs = listDailyLogs(astronautId, kind ?? undefined);
  return NextResponse.json({
    logs,
    latest_daily: latestDailyLog(astronautId, 'daily'),
    latest_ultrasound: latestDailyLog(astronautId, 'ultrasound'),
    ultrasound_due: !hasRecentLog(astronautId, 'ultrasound', 7),
  });
}

export async function POST(request: Request) {
  let body: DailyLogBody;
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

  const kind = body.kind === 'ultrasound' ? 'ultrasound' : 'daily';
  const mood = kind === 'daily' ? (body.mood ?? null) : null;
  if (kind === 'daily' && (typeof mood !== 'number' || mood < 1 || mood > 5)) {
    return NextResponse.json({ detail: 'mood must be an integer 1-5 for daily check-ins' }, { status: 422 });
  }
  const note = typeof body.note === 'string' ? body.note.slice(0, 2000) : null;

  const id = saveDailyLog({ astronautId, kind, mood, note });
  return NextResponse.json({ id, kind, mood, note, saved_at: new Date().toISOString() }, { status: 201 });
}
