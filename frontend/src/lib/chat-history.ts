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
      metadata?.response &&
      typeof metadata.response.message === 'string' &&
      Array.isArray(metadata.response.recommended_actions) &&
      Array.isArray(metadata.response.warning_signs) &&
      metadata.triage &&
      ['red', 'yellow', 'green'].includes(metadata.triage.level) &&
      Array.isArray(metadata.references)
    ) {
      return { role, text: message.content, result: metadata };
    }
  } catch {
    // A malformed historic record should never prevent the conversation from opening.
  }
  return { role, text: message.content };
}
