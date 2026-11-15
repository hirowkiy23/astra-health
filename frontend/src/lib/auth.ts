/** Demo-only login mapping. No real credentials — this is a prototype access layer. */

export interface AstroCredential {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const ASTRO_CREDENTIALS: AstroCredential[] = [
  { id: 'astro-1', name: 'ASTRO - 1!', email: 'astro-1@astra.demo', password: 'astra-1' },
  { id: 'astro-2', name: 'ASTRO - 2', email: 'astro-2@astra.demo', password: 'astra-2' },
  { id: 'astro-3', name: 'ASTRO - 3', email: 'astro-3@astra.demo', password: 'astra-3' },
  { id: 'astro-4', name: 'ASTRO - 4', email: 'astro-4@astra.demo', password: 'astra-4' },
  { id: 'astro-5', name: 'ASTRO - 5', email: 'astro-5@astra.demo', password: 'astra-5' },
];

const SESSION_KEY = 'astra-current-id';

/** Match an email/password to a demo astronaut, or null when credentials are wrong. */
export function authenticate(email: string, password: string): AstroCredential | null {
  const emailLower = email.trim().toLowerCase();
  const cred = ASTRO_CREDENTIALS.find(c => c.email.toLowerCase() === emailLower);
  if (!cred || cred.password !== password) return null;
  return cred;
}

/** The logged-in astronaut id for this browser session (defaults to astro-1). */
export function getSessionAstronautId(): string {
  if (typeof window === 'undefined') return 'astro-1';
  return window.sessionStorage.getItem(SESSION_KEY) ?? 'astro-1';
}

export function setSessionAstronautId(id: string): void {
  window.sessionStorage.setItem(SESSION_KEY, id);
}
