import { describe, it, expect } from 'vitest';
import app from '../../server.js';

describe('HTTP Security Headers (FR-016, FR-017, FR-018)', () => {
  it('emits all required security headers (HSTS, CSP, nosniff, Referrer, Permissions, X-Frame-Options)', async () => {
    return new Promise<void>((resolve, reject) => {
      const server = app.listen(0, async () => {
        try {
          const address = server.address();
          if (!address || typeof address === 'string') {
            server.close();
            return reject(new Error('Invalid address'));
          }
          const port = address.port;

          const res = await fetch(`http://127.0.0.1:${port}/health`);
          expect(res.status).toBe(200);

          const headers = res.headers;

          // X-Content-Type-Options
          expect(headers.get('x-content-type-options')).toBe('nosniff');

          // X-Frame-Options
          expect(headers.get('x-frame-options')).toBe('DENY');

          // Strict-Transport-Security (HSTS)
          expect(headers.get('strict-transport-security')).toContain('max-age=31536000');

          // Content-Security-Policy
          expect(headers.get('content-security-policy')).toBeDefined();
          expect(headers.get('content-security-policy')).toContain("default-src 'self'");

          // Referrer-Policy
          expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

          // Permissions-Policy
          expect(headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');

          // X-Powered-By must NOT be present
          expect(headers.get('x-powered-by')).toBeNull();

          server.close(resolve);
        } catch (e) {
          server.close(() => reject(e));
        }
      });
    });
  });
});

