import { describe, it, expect, vi } from 'vitest';
import app from '../../server.js';
import { enforceHttps } from '../../server/middleware/enforceHttps.js';

describe('HTTP Security Headers & HTTPS Enforcement (FR-016, FR-017)', () => {
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

  describe('enforceHttps middleware (FR-016)', () => {
    it('redirects HTTP to HTTPS with 301 in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = {
        secure: false,
        get: vi.fn((header) => (header === 'x-forwarded-proto' ? 'http' : 'example.com')),
        url: '/api/test',
      };
      const res = {
        redirect: vi.fn(),
      };
      const next = vi.fn();

      // @ts-expect-error test mock
      enforceHttps(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/test');
      expect(next).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('passes through when already HTTPS in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = {
        secure: true,
        get: vi.fn(() => 'https'),
        url: '/api/test',
      };
      const res = {
        redirect: vi.fn(),
      };
      const next = vi.fn();

      // @ts-expect-error test mock
      enforceHttps(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
