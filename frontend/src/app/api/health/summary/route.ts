import { NextResponse } from 'next/server';
import { PROFILE, VITALS } from '@/lib/demo-data';

export function GET() {
  return NextResponse.json({ astronaut: PROFILE, vitals: VITALS, simulated: true });
}
