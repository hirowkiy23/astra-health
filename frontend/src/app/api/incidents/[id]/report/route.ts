import { NextResponse } from 'next/server';
import { getIncident } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const incident = getIncident(id);
  if (!incident) {
    return NextResponse.json({ detail: 'Incident not found' }, { status: 404 });
  }
  const vitals = incident.vitals_json ? JSON.parse(incident.vitals_json) : null;
  return NextResponse.json({ ...incident, vitals });
}
