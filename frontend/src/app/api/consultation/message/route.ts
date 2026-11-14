import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { triage } from '@/lib/triage';
import { retrieve } from '@/lib/retrieval';
import { enforceTriageSafety } from '@/lib/safety';
import { buildFallbackResponse } from '@/lib/fallback';
import { generateLlmResponse } from '@/lib/llm';
import { saveIncident, appendMessage, listMessages } from '@/lib/db';
import { PROFILE, VITALS } from '@/lib/demo-data';

interface ConsultationBody {
  astronaut_id?: string;
  message?: string;
  consultation_id?: string;
  vitals?: Partial<{ heart_rate: number; spo2: number; temperature: number; blood_pressure: string }>;
}

export async function POST(request: Request) {
  let body: ConsultationBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const astronautId = body.astronaut_id ?? PROFILE.id;
  if (astronautId !== PROFILE.id) {
    return NextResponse.json({ detail: 'Demo astronaut not found' }, { status: 404 });
  }

  const message = (body.message ?? '').replace(/\s+/g, ' ').trim();
  if (!message) return NextResponse.json({ detail: 'Message is required' }, { status: 422 });
  if (message.length > 4000) return NextResponse.json({ detail: 'Message too long' }, { status: 422 });

  const consultationId = body.consultation_id ?? `CON-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  appendMessage(consultationId, astronautId, 'user', message);
  const prior = listMessages(consultationId, 10).slice(0, -1);

  // Use the previous user topic only when this short follow-up has no retrieval hits.
  const followUp = /^(what|why|how|tell me|and|also|explain|does|is|can|should)\b/i.test(message) && message.length < 180;
  const ownReferences = retrieve(message);
  const previousTopic = followUp && prior.length
    ? prior.filter(m => m.role === 'user').slice(-1)[0]?.content ?? ''
    : '';
  const references = ownReferences.length ? ownReferences : retrieve(`${previousTopic} ${message}`);

  // Use the selected crew member's simulated readings when supplied; otherwise the demo profile.
  const vitals = body.vitals
    ? {
        heart_rate: Number(body.vitals.heart_rate ?? VITALS.heart_rate),
        spo2: Number(body.vitals.spo2 ?? VITALS.spo2),
        temperature: Number(body.vitals.temperature ?? VITALS.temperature),
        blood_pressure: body.vitals.blood_pressure ?? VITALS.blood_pressure,
        recorded_at: VITALS.recorded_at,
        simulated: true as const,
      }
    : VITALS;

  const triageResult = triage(message, vitals);
  const fallback = buildFallbackResponse(message, triageResult, references);

  // Red emergencies never wait on a network call and never use generated prose.
  let response;
  if (triageResult.level === 'red') {
    response = enforceTriageSafety(fallback, triageResult);
  } else {
    const generated = await generateLlmResponse(message, triageResult, references, fallback, vitals, prior);
    response = enforceTriageSafety(generated.response, triageResult);
    response.mode = generated.mode;
  }

  const incidentId = saveIncident({
    astronautId, consultationId, symptoms: message,
    severity: triageResult.level, response: response.message, ruleId: triageResult.rule_id,
    vitalsJson: JSON.stringify(vitals),
  });
  appendMessage(consultationId, astronautId, 'assistant', response.message, {
    response, triage: triageResult, references, incident_id: incidentId, consultation_id: consultationId,
  });

  return NextResponse.json({ response, triage: triageResult, references, incident_id: incidentId, consultation_id: consultationId, simulated: true });
}
