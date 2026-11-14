import { NextResponse } from 'next/server';
import { listMessages } from '@/lib/db';
import { parseChatTurn } from '@/lib/chat-history';

export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('consultation_id');
  if (!id) return NextResponse.json({ detail: 'consultation_id is required' }, { status: 400 });
  return NextResponse.json({ messages: listMessages(id), turns: listMessages(id).map(parseChatTurn) });
}
