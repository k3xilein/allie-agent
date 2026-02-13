// Shared Encryption Utility
// Uses a deterministic key derived from SESSION_SECRET so encrypted data
// survives container restarts (as long as SESSION_SECRET stays the same).
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Fallback key — used only if neither ENCRYPTION_KEY nor SESSION_SECRET are set.
// This is less secure than using a proper secret, but ensures encryption ALWAYS works.
// In production, SESSION_SECRET should always be set via .env / docker-compose.
const FALLBACK_APP_KEY = 'allie-agent-default-encryption-key-2026';

/** Cache the derived key so we don't recompute on every call */
let _cachedKey: Buffer | null = null;

/**
 * Get a stable 32-byte encryption key.
 * Priority: ENCRYPTION_KEY env var > SESSION_SECRET > fallback app key
 */
function getEncryptionKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  let source: string;

  // 1. Explicit encryption key (hex-encoded, 64+ chars = 32 bytes)
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 64) {
    _cachedKey = Buffer.from(process.env.ENCRYPTION_KEY.slice(0, 64), 'hex');
    console.log('[encryption] Using ENCRYPTION_KEY env var');
    return _cachedKey;
  }

  // 2. Derive from SESSION_SECRET
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 0) {
    source = process.env.SESSION_SECRET;
    console.log('[encryption] Deriving key from SESSION_SECRET');
  } else {
    // 3. Fallback — always works, but log a warning
    source = FALLBACK_APP_KEY;
    console.warn('[encryption] ⚠ No ENCRYPTION_KEY or SESSION_SECRET set — using fallback key. Set SESSION_SECRET in .env for proper security!');
  }

  _cachedKey = crypto.createHash('sha256').update(source).digest();
  return _cachedKey;
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
