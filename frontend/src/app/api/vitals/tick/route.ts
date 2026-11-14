import { NextResponse } from 'next/server';
import { EPISODE_TEMPLATES, forceEpisode, runVitalsTick } from '@/lib/vitals-sim';

interface TickBody {
  force?: boolean;
  episode?: { astronaut_id?: string; name?: string };
}

/**
 * Demo/test control: advance the vitals simulator now, optionally injecting
 * an incident episode (solar-particle-event, co2-scrubber-fault, ...) first.
 */
export async function POST(request: Request) {
  let body: TickBody = {};
  try {
    body = await request.json();
  } catch {
    // an empty body is fine — a plain forced tick
  }

  if (body.episode) {
    const { astronaut_id: astronautId, name } = body.episode;
    if (typeof astronautId !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ detail: 'episode requires astronaut_id and name' }, { status: 422 });
    }
    try {
      forceEpisode(astronautId, name);
    } catch (e) {
      return NextResponse.json({ detail: (e as Error).message }, { status: 422 });
    }
  }

  const summary = runVitalsTick({ force: body.force !== false });
  return NextResponse.json({ ...summary, episodes: EPISODE_TEMPLATES.map((t) => t.name), simulated: true });
}
