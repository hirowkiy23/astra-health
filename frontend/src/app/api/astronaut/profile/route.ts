import { NextResponse } from 'next/server';
import { PROFILE } from '@/lib/demo-data';

export function GET() {
  return NextResponse.json(PROFILE);
}
