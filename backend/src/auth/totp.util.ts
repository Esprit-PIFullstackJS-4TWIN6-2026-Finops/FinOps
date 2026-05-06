import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;

function normalizeBase32(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
}

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(secret: string): Buffer {
  const normalized = normalizeBase32(secret);
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 secret');
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateBase32Secret(byteLength = 20): string {
  return encodeBase32(randomBytes(byteLength));
}

export function sanitizeTotpCode(value: string): string {
  return value.replace(/\s+/g, '').replace(/-/g, '');
}

export function generateTotpCode(
  secret: string,
  timestamp = Date.now(),
  stepSeconds = TOTP_PERIOD_SECONDS,
  digits = TOTP_DIGITS,
): string {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', decodeBase32(secret))
    .update(counterBuffer)
    .digest();
  const offset = hmac[hmac.length - 1] & 15;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;

  return String(binary).padStart(digits, '0');
}

export function verifyTotpCode(
  secret: string,
  code: string,
  window = 1,
): boolean {
  const normalizedCode = sanitizeTotpCode(code);
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateTotpCode(
      secret,
      Date.now() + offset * TOTP_PERIOD_SECONDS * 1000,
    );
    if (
      timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(normalizedCode, 'utf8'),
      )
    ) {
      return true;
    }
  }

  return false;
}

export function buildTotpOtpauthUrl(params: {
  issuer: string;
  accountName: string;
  secret: string;
}): string {
  const label = encodeURIComponent(`${params.issuer}:${params.accountName}`);
  const issuer = encodeURIComponent(params.issuer);
  return `otpauth://totp/${label}?secret=${params.secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

export function encryptTotpSecret(secret: string, keyMaterial: string): string {
  const key = createHash('sha256').update(keyMaterial).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptTotpSecret(
  encryptedSecret: string,
  keyMaterial: string,
): string {
  const [ivValue, authTagValue, encryptedValue] = encryptedSecret.split('.');
  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error('Invalid encrypted TOTP secret');
  }

  const key = createHash('sha256').update(keyMaterial).digest();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
