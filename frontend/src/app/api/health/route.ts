import { NextResponse } from 'next/server';

export function GET() {
  const connected = Boolean(process.env.LLM_API_KEY);
  return NextResponse.json({
    status: 'operational',
    mode: connected ? 'llm' : 'local_demo',
    model: connected ? process.env.LLM_MODEL || 'kimi-k3.1-pro' : null,
    llm_connected: connected,
  });
}
