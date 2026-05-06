/**
 * Google "App Passwords" are 16 letters (often shown in groups); spaces are ignored.
 * Do NOT use the normal Gmail account password here.
 */
export function normalizeGmailAppPassword(raw: string | undefined): string {
  return raw?.replace(/\s+/g, '').trim() ?? '';
}

/** Known template values from .env.example — not a real App Password. */
export function isGmailAppPasswordPlaceholder(raw: string | undefined): boolean {
  const p = normalizeGmailAppPassword(raw);
  if (!p) return true;
  const lower = p.toLowerCase();
  if (lower.includes('your-16-char')) return true;
  if (lower === 'password' || lower === 'changeme' || lower === 'placeholder') {
    return true;
  }
  return false;
}

export function isValidGoogleAppPasswordFormat(raw: string | undefined): boolean {
  const p = normalizeGmailAppPassword(raw);
  return /^[a-zA-Z0-9]{16}$/.test(p);
}
