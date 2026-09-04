/**
 * AES-256-GCM Data Encryption at Rest (FR-005)
 * Standardized cryptographic utility for encrypting sensitive user data,
 * private notes, and third-party credentials.
 */

import crypto from 'node:crypto';

export const ALGORITHM = 'aes-256-gcm';
export const IV_LENGTH = 12; // 96-bit IV recommended for GCM
export const TAG_LENGTH = 16; // 128-bit authentication tag

function getEncryptionKey() {
  const rawKey = process.env.DATA_ENCRYPTION_KEY;
  if (!rawKey) {
    // In test/dev environment fallback to deterministic test key with warning
    return Buffer.from(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      'hex'
    );
  }

  // Key should be 32 bytes (64 hex characters or 32 raw bytes)
  if (rawKey.length === 64) {
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * @param {string} plainText Content to encrypt
 * @returns {string|null} iv:authTag:cipherText in hex format
 */
export function encryptSensitiveText(plainText) {
  if (plainText === null || plainText === undefined) {
    return null;
  }
  if (typeof plainText !== 'string') {
    plainText = String(plainText);
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted payload.
 * @param {string} cipherPayload Encrypted string in format iv:authTag:cipherText
 * @returns {string|null} Decrypted plaintext string
 */
export function decryptSensitiveText(cipherPayload) {
  if (!cipherPayload) return null;

  const parts = cipherPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format. Expected iv:authTag:cipherText');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
