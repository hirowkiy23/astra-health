export type SosPhase = 'idle' | 'confirming' | 'sending' | 'response';

/** Advance SOS only on deliberate successive presses. A third press permits escalation. */
export function pressSos(phase: SosPhase, count: number): { phase: SosPhase; count: number; activate: boolean } {
  if (phase !== 'idle' && phase !== 'confirming') return { phase, count, activate: false };
  const next = count + 1;
  return next >= 3
    ? { phase: 'sending', count: 3, activate: true }
    : { phase: 'confirming', count: next, activate: false };
}
