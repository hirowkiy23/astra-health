import { NextResponse } from 'next/server';
import { CREW } from '@/lib/crew';

export function GET() {
  return NextResponse.json({ crew: CREW, simulated: true });
}
