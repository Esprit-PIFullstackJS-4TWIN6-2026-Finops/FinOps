import {
  buildTotpOtpauthUrl,
  decodeBase32,
  decryptTotpSecret,
  encodeBase32,
  encryptTotpSecret,
  generateBase32Secret,
  generateTotpCode,
  sanitizeTotpCode,
  verifyTotpCode,
} from './totp.util';

describe('totp util', () => {
  it('encodes and decodes base32 values', () => {
    const source = Buffer.from('hello totp');
    const encoded = encodeBase32(source);

    expect(decodeBase32(encoded)).toEqual(source);
  });

  it('normalizes formatted base32 input before decoding', () => {
    const source = Buffer.from('abc123');
    const encoded = encodeBase32(source);

    expect(decodeBase32(` ${encoded.toLowerCase()} !!! `)).toEqual(source);
  });

  it('sanitizes and verifies a generated code at a fixed timestamp', () => {
    const now = 1_710_000_000_000;
    const secret = encodeBase32(Buffer.from('super-secret-key-12345'));
    const code = generateTotpCode(secret, now);
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

    expect(code).toHaveLength(6);
    expect(sanitizeTotpCode(` ${code.slice(0, 3)}-${code.slice(3)} `)).toBe(code);
    expect(verifyTotpCode(secret, code, 0)).toBe(true);
    expect(verifyTotpCode(secret, '12-34', 0)).toBe(false);

    nowSpy.mockRestore();
  });

  it('builds an otpauth URL and round-trips encrypted secrets', () => {
    const secret = generateBase32Secret(10);
    const url = buildTotpOtpauthUrl({
      issuer: 'FinOps Platform',
      accountName: 'nourane@example.com',
      secret,
    });
    const encrypted = encryptTotpSecret(secret, 'test-key-material');

    expect(url).toContain('otpauth://totp/');
    expect(url).toContain(`secret=${secret}`);
    expect(url).toContain('issuer=FinOps%20Platform');
    expect(decryptTotpSecret(encrypted, 'test-key-material')).toBe(secret);
    expect(() => decryptTotpSecret('invalid-secret', 'test-key-material')).toThrow(
      'Invalid encrypted TOTP secret',
    );
  });
});
