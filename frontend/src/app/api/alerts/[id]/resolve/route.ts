import { NextResponse } from 'next/server';
import { resolveAlert } from '@/lib/vitals-db';

interface ResolveBody {
  note?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: ResolveBody = {};
  try {
    body = await request.json();
  } catch {
    // note is optional
  }
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 2000) : undefined;
  if (!resolveAlert(id, note)) {
    return NextResponse.json({ detail: 'Alert not found or already resolved' }, { status: 409 });
  }
  return NextResponse.json({ id, status: 'resolved' });
}
