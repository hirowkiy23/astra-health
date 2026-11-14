import { NextResponse } from 'next/server';
import { triage } from '@/lib/triage';
import type { Vitals } from '@/lib/triage';
import { VITALS } from '@/lib/demo-data';

export async function POST(request: Request) {
  let body: { message?: string; vitals?: Partial<Vitals> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  const message = (body.message ?? '').replace(/\s+/g, ' ').trim();
  if (!message) return NextResponse.json({ detail: 'Message is required' }, { status: 422 });
  if (message.length > 4000) return NextResponse.json({ detail: 'Message too long' }, { status: 422 });

  const vitals: Vitals = body.vitals
    ? { ...VITALS, ...body.vitals, simulated: true }
    : VITALS;
  return NextResponse.json(triage(message, vitals));
}
