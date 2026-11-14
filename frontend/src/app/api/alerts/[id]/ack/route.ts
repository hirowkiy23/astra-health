import { NextResponse } from 'next/server';
import { ackAlert } from '@/lib/vitals-db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!ackAlert(id)) {
    return NextResponse.json({ detail: 'Alert not found or not open' }, { status: 409 });
  }
  return NextResponse.json({ id, status: 'acknowledged' });
}
