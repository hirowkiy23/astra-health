import type { TriageResult } from './triage.ts';
import type { Reference } from './retrieval.ts';
import type { MedicalResponse } from './safety.ts';

const DEFAULT_WARNING_SIGNS = [
  'Severe or worsening symptoms',
  'New breathing difficulty, chest pain, confusion, fainting, or reduced responsiveness',
];

/** Deterministic responder used when no LLM is configured or the provider fails. */
export function buildFallbackResponse(
  _message: string,
  triage: TriageResult,
  references: Reference[],
): MedicalResponse {
  if (triage.level === 'red') {
    return {
      message: 'This concern matches ASTRA’s illustrative emergency rule. Activate the applicable approved mission emergency procedure and contact human medical support now. Do not wait for further AI assessment.',
      warning_signs: DEFAULT_WARNING_SIGNS,
      recommended_actions: [
        'Activate the applicable approved mission emergency procedure.',
        'Contact the crew medical officer or ground medical support immediately.',
        'Use only approved protocols and available trained human assistance.',
      ],
      requires_human_support: true,
      mode: 'deterministic_demo',
    };
  }

  if (references.length === 0) {
    return {
      message: 'I found no matching reference in the small demo knowledge base. I can’t provide a source-grounded medical explanation for this message. If this is a health concern, contact human medical support.',
      warning_signs: DEFAULT_WARNING_SIGNS,
      recommended_actions: [
        'Clarify the health concern or provide relevant symptoms.',
        'Contact human medical support for assessment if needed.',
        'Do not treat this demo response as medical advice.',
      ],
      requires_human_support: triage.requires_human_support,
      mode: 'deterministic_demo',
    };
  }

  if (triage.level === 'yellow') {
    return {
      message: 'Your report is relevant to changes in sensorimotor and vestibular function described by NASA. This research reference provides background, not a diagnosis or treatment protocol. Further assessment is needed.',
      warning_signs: DEFAULT_WARNING_SIGNS,
      recommended_actions: [
        'Follow the applicable approved mission medical procedure.',
        'Contact human medical support for assessment.',
        'Record when symptoms began and whether they are changing.',
      ],
      requires_human_support: true,
      mode: 'deterministic_demo',
    };
  }

  return {
    message: 'I found background information in the curated demo references. This is not a diagnosis. A human medical professional should interpret symptoms in the mission context.',
    warning_signs: DEFAULT_WARNING_SIGNS,
    recommended_actions: [
      'Review the cited background reference.',
      'Use the applicable approved mission medical procedure.',
      'Contact human medical support if you have symptoms or concerns.',
    ],
    requires_human_support: false,
    mode: 'deterministic_demo',
  };
}
