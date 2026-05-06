import {
  isGmailAppPasswordPlaceholder,
  isValidGoogleAppPasswordFormat,
  normalizeGmailAppPassword,
} from './gmail-env.util';

describe('gmail-env util', () => {
  it('normalizes Gmail app passwords by removing spaces', () => {
    expect(normalizeGmailAppPassword(' abcd efgh ijkl mnop ')).toBe('abcdefghijklmnop');
  });

  it('detects placeholder values and missing secrets', () => {
    expect(isGmailAppPasswordPlaceholder(undefined)).toBe(true);
    expect(isGmailAppPasswordPlaceholder('your-16-char-app-password')).toBe(true);
    expect(isGmailAppPasswordPlaceholder('placeholder')).toBe(true);
    expect(isGmailAppPasswordPlaceholder('abcd efgh ijkl mnop')).toBe(false);
  });

  it('validates the expected 16-character Google app password format', () => {
    expect(isValidGoogleAppPasswordFormat('abcd efgh ijkl mnop')).toBe(true);
    expect(isValidGoogleAppPasswordFormat('too-short')).toBe(false);
  });
});
