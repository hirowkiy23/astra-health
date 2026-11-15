import { NextResponse } from 'next/server';
import { CREW } from '@/lib/crew';
import { getCrewStatus, getAllCrewStatuses, setCrewStatus, triggerSos, resolveSos } from '@/lib/sos-state';

const VALID = new Set(['Good', 'Review', 'Critical', 'SOS']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('astronaut_id');
  if (id) {
    const known = CREW.find(c => c.id === id);
    if (!known) return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
    return NextResponse.json({ astronaut_id: id, status: getCrewStatus(id) });
  }
  return NextResponse.json({ statuses: getAllCrewStatuses(), simulated: true });
}

export async function POST(request: Request) {
  let body: { astronaut_id?: string; action?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const id = body.astronaut_id;
  if (!id || !CREW.some(c => c.id === id)) {
    return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
  }

  // Explicit action takes precedence.
  if (body.action === 'sos') {
    return NextResponse.json(triggerSos(id), { status: 200 });
  }
  if (body.action === 'resolve') {
    return NextResponse.json(resolveSos(id), { status: 200 });
  }

  if (typeof body.status === 'string' && VALID.has(body.status)) {
    return NextResponse.json(setCrewStatus(id, body.status as 'Good' | 'Review' | 'Critical' | 'SOS'), { status: 200 });
  }

  return NextResponse.json({ detail: 'Provide a valid action ("sos" or "resolve") or status' }, { status: 422 });
}
