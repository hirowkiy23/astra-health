import { NextResponse } from 'next/server';
import { VITALS } from '@/lib/demo-data';

export function GET() {
  return NextResponse.json(VITALS);
}
