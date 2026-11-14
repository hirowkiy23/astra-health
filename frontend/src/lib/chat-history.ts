export interface StoredChatTurn {
  role: 'user' | 'assistant';
  text: string;
  result?: Record<string, unknown>;
}

/** Convert persisted messages to UI turns without trusting legacy metadata shape. */
export function parseChatTurn(message: {
  role: string;
  content: string;
  metadata: string | null;
}): StoredChatTurn {
  const role = message.role === 'assistant' ? 'assistant' : 'user';
  if (role === 'user' || !message.metadata) return { role, text: message.content };
  try {
    const metadata = JSON.parse(message.metadata);
    if (
      metadata?.triage &&
      ['red', 'yellow', 'green'].includes(metadata.triage.level) &&
      Array.isArray(metadata.references)
    ) {
      // Current messages store response fields at the top level of metadata.
      // Older messages may already contain a nested response object.
      const result = metadata.response
        ? metadata
        : {
            ...metadata,
            response: {
              message: message.content,
              warning_signs: Array.isArray(metadata.warning_signs) ? metadata.warning_signs : [],
              recommended_actions: Array.isArray(metadata.recommended_actions) ? metadata.recommended_actions : [],
              requires_human_support: Boolean(metadata.triage.requires_human_support),
              mode: typeof metadata.mode === 'string' ? metadata.mode : 'deterministic_demo',
            },
          };
      return { role, text: message.content, result };
    }
  } catch {
    // A malformed historic record should never prevent the conversation from opening.
  }
  return { role, text: message.content };
}
