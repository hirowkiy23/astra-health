import { NextResponse } from 'next/server';
import { triage } from '@/lib/triage';
import { VITALS } from '@/lib/demo-data';

export async function POST(request: Request) {
  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }
  const message = (body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ detail: 'Message is required' }, { status: 422 });
  }
  return NextResponse.json(triage(message, VITALS));
}
