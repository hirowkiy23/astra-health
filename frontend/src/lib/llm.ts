import type { TriageResult, Vitals } from './triage.ts';
import type { Reference } from './retrieval.ts';
import type { MedicalResponse } from './safety.ts';
import { extractJson } from './safety.ts';
import { PROFILE, VITALS } from './demo-data.ts';

const SYSTEM_PROMPT = `You are ASTRA, a medical decision-support assistant for astronauts on isolated missions.
You do not diagnose, prescribe, or select treatments. You explain background information from the supplied references only.
You must never contradict, downgrade, or reinterpret the supplied triage result, and you never claim the triage result is wrong.
Never invent citations: use only the references provided, and if none are relevant, say that no matching reference was found.
Keep the message under 120 words, plain and calm. Return JSON only with exactly these keys:
{"message": string, "warning_signs": string[], "recommended_actions": string[], "requires_human_support": boolean}
requires_human_support must be true whenever the triage result requires human support.`;

export interface LlmResult {
  response: MedicalResponse;
  mode: 'llm_grounded' | 'llm_error_fallback' | 'deterministic_demo';
}

/**
 * Ask the configured OpenAI-compatible provider for a grounded explanation.
 * Any failure returns the deterministic fallback so the demo never silently fails.
 */
export async function generateLlmResponse(
  message: string,
  triage: TriageResult,
  references: Reference[],
  fallback: MedicalResponse,
  vitals: Vitals = VITALS,
): Promise<LlmResult> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return { response: fallback, mode: 'deterministic_demo' };

  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.cosmoshub.tech/v1').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'kimi-k3.1-pro';

  const payload = {
    reported_concern: message,
    triage: { level: triage.level, reason: triage.reason, requires_human_support: triage.requires_human_support },
    astronaut: { baseline: PROFILE.baseline, allergies: PROFILE.allergies },
    vitals,
    references: references.map(r => ({ title: r.title, source: r.source, excerpt: r.text })),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify(payload) },
          ],
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return { response: fallback, mode: 'llm_error_fallback' };

    const body = await res.json();
    const content: unknown = body?.choices?.[0]?.message?.content;
    const parsed = extractJson(typeof content === 'string' ? content : '');
    if (!parsed || typeof parsed.message !== 'string') {
      return { response: fallback, mode: 'llm_error_fallback' };
    }

    return {
      mode: 'llm_grounded',
      response: {
        message: parsed.message,
        warning_signs: Array.isArray(parsed.warning_signs) ? (parsed.warning_signs as string[]) : fallback.warning_signs,
        recommended_actions: Array.isArray(parsed.recommended_actions) ? (parsed.recommended_actions as string[]) : fallback.recommended_actions,
        requires_human_support: Boolean(parsed.requires_human_support),
        mode: 'llm_grounded',
      },
    };
  } catch {
    return { response: fallback, mode: 'llm_error_fallback' };
  }
}
