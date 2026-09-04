import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../server/services/passwordService.js';
import { getSecureCookieOptions } from '../../server/lib/cookies.js';

describe('AppSec FR-010: Argon2id Password Hashing', () => {
  it('rejects password shorter than 10 characters', async () => {
    await expect(hashPassword('short123')).rejects.toThrow(/tối thiểu 10 ký tự/);
  });

  it('hashes password with Argon2id and verifies match', async () => {
    const rawPass = 'SecretPassword123!';
    const hash = await hashPassword(rawPass);

    expect(hash).toContain('$argon2id$');
    const isMatch = await verifyPassword(hash, rawPass);
    expect(isMatch).toBe(true);

    const isBadMatch = await verifyPassword(hash, 'WrongPassword456!');
    expect(isBadMatch).toBe(false);
  });
});

describe('AppSec FR-009: Secure Session Cookies', () => {
  it('enforces HttpOnly and SameSite=lax', () => {
    const options = getSecureCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBeGreaterThan(0);
  });
});
