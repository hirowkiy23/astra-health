import { NextResponse } from 'next/server';
import { seedDemoData, resetSeedMarker } from '@/lib/seed';

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('reset') === '1') {
    resetSeedMarker();
  }
  const result = seedDemoData();
  return NextResponse.json({ ...result, simulated: true });
}
