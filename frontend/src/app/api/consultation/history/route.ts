import { NextResponse } from 'next/server';
import { listMessages } from '@/lib/db';

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('consultation_id');
  if (!id) return NextResponse.json({ detail: 'consultation_id is required' }, { status: 400 });
  return NextResponse.json({ messages: listMessages(id), turns: listMessages(id).map(m => ({ role: m.role, text: m.content, result: m.metadata ? JSON.parse(m.metadata) : undefined })) });
}
