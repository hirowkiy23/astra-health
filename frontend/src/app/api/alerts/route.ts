import { NextResponse } from 'next/server';
import { listAlerts, type AlertStatus } from '@/lib/vitals-db';

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const status = params.get('status') ?? 'active';
  const astronautId = params.get('astronaut_id') ?? undefined;
  if (!['open', 'acknowledged', 'resolved', 'active'].includes(status)) {
    return NextResponse.json({ detail: "status must be one of open, acknowledged, resolved, active" }, { status: 422 });
  }
  const alerts = listAlerts({ status: status as AlertStatus | 'active', astronautId });
  return NextResponse.json({ count: alerts.length, alerts, simulated: true });
}
