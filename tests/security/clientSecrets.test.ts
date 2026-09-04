import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { validateStartupEnv } from '../../server.js';
import { getClientSupabaseConfig } from '../../src/lib/supabaseClient';

describe('Client Secret Isolation & Environment Validation (FR-001, FR-002, FR-003)', () => {
  it('ensures client-side Supabase configuration only exposes anonKey, never service-role key', () => {
    const config = getClientSupabaseConfig();
    expect(config).toBeDefined();
    expect(config).toHaveProperty('url');
    expect(config).toHaveProperty('anonKey');
    // Ensure service role key property does not exist on client config
    expect((config as Record<string, unknown>).serviceRoleKey).toBeUndefined();
    expect((config as Record<string, unknown>).service_role).toBeUndefined();
  });

  it('validates that .env.example does not contain real secret values or private keys', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf8');

    // Should not contain real production keys
    expect(content).not.toMatch(/AIzaSy[0-9A-Za-z_-]{33}/); // Google API key regex
    expect(content).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'); // Supabase real JWT
    expect(content).toContain('GEMINI_API_KEY=MY_GEMINI_API_KEY');
    expect(content).toContain('VITE_SUPABASE_ANON_KEY=your-supabase-public-anon-key');
  });

  it('validates startup environment logic in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short';

      expect(() => validateStartupEnv()).toThrow(
        /\[Security Critical\] JWT_SECRET must be at least 32 characters in production/
      );

      // With valid 32+ character secret, it should pass
      process.env.JWT_SECRET = 'a_very_secure_random_jwt_secret_with_32_characters_min!';
      expect(() => validateStartupEnv()).not.toThrow();
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.JWT_SECRET = originalSecret;
    }
  });
});
