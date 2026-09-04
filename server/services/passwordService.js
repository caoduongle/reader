/**
 * Password Hashing Service (FR-010)
 * Uses Argon2id (memory-hard, resistant to GPU and side-channel cracking)
 * for secure credential management.
 */

import argon2 from 'argon2';

const ARGON2_CONFIG = {
  type: argon2.argon2id, // RFC 9106 recommended
  memoryCost: 65536, // 64 MB memory
  timeCost: 3, // 3 iterations
  parallelism: 1,
};

/**
 * Hashes plaintext password using Argon2id.
 * Enforces minimum 10 characters length.
 * @param {string} password
 * @returns {Promise<string>} Argon2id hash string
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string' || password.trim().length < 10) {
    throw new Error('Mật khẩu phải có độ dài tối thiểu 10 ký tự.');
  }

  return await argon2.hash(password, ARGON2_CONFIG);
}

/**
 * Verifies a candidate password against an Argon2id hash.
 * @param {string} hashedPassword
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(hashedPassword, candidatePassword) {
  if (!hashedPassword || !candidatePassword) return false;
  try {
    return await argon2.verify(hashedPassword, candidatePassword);
  } catch {
    return false;
  }
}
