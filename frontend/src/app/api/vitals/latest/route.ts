import { NextResponse } from 'next/server';
import { PROFILE } from '@/lib/demo-data';
import { SIM_ASTRONAUT_IDS, getVitalsSnapshot } from '@/lib/vitals-sim';

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('astronaut_id') ?? PROFILE.id;
  if (!SIM_ASTRONAUT_IDS.includes(id)) {
    return NextResponse.json({ detail: 'Unknown astronaut' }, { status: 404 });
  }
  const snapshot = getVitalsSnapshot(id);
  return NextResponse.json({ ...snapshot, simulated: true });
}
