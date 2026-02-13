// Shared Encryption Utility
// Uses a deterministic key derived from SESSION_SECRET so encrypted data
// survives container restarts (as long as SESSION_SECRET stays the same).
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Get a stable 32-byte encryption key.
 * Priority: ENCRYPTION_KEY env var > derived from SESSION_SECRET > error
 */
function getEncryptionKey(): Buffer {
  // 1. Explicit encryption key
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 64) {
    return Buffer.from(process.env.ENCRYPTION_KEY.slice(0, 64), 'hex');
  }

  // 2. Derive from SESSION_SECRET (deterministic — same secret = same key)
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret) {
    return crypto.createHash('sha256').update(sessionSecret).digest();
  }

  // 3. Fatal — we can't encrypt/decrypt without a stable key
  throw new Error(
    'No ENCRYPTION_KEY or SESSION_SECRET set. Cannot encrypt/decrypt API keys. ' +
    'Set SESSION_SECRET in your .env or docker-compose environment.'
  );
}

/** Encrypt a string. Returns { encrypted, iv, tag } as hex strings. */
export function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/** Decrypt a string from hex-encoded { encrypted, iv, tag }. */
export function decrypt(encrypted: string, iv: string, tag: string): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
