import { describe, it, expect } from 'vitest';
import app from '../../server.js';
import { aiRateLimiter, globalRateLimiter } from '../../server/middleware/rateLimiter.js';

describe('CORS Whitelist & Rate Limiters (FR-011, FR-015)', () => {
  describe('CORS Whitelist (FR-015)', () => {
    it('allows requests from whitelisted origin and emits Access-Control headers with credentials', async () => {
      return new Promise<void>((resolve, reject) => {
        const server = app.listen(0, async () => {
          try {
            const address = server.address();
            if (!address || typeof address === 'string') {
              server.close();
              return reject(new Error('Invalid address'));
            }
            const port = address.port;

            const res = await fetch(`http://127.0.0.1:${port}/health`, {
              headers: { Origin: 'http://127.0.0.1:3000' },
            });

            expect(res.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:3000');
            expect(res.headers.get('access-control-allow-credentials')).toBe('true');
            // Wildcard * must NOT be returned when credentials are true
            expect(res.headers.get('access-control-allow-origin')).not.toBe('*');

            server.close(resolve);
          } catch (e) {
            server.close(() => reject(e));
          }
        });
      });
    });

    it('rejects un-whitelisted origin from Access-Control-Allow-Origin', async () => {
      return new Promise<void>((resolve, reject) => {
        const server = app.listen(0, async () => {
          try {
            const address = server.address();
            if (!address || typeof address === 'string') {
              server.close();
              return reject(new Error('Invalid address'));
            }
            const port = address.port;

            const res = await fetch(`http://127.0.0.1:${port}/health`, {
              headers: { Origin: 'http://malicious-attacker-domain.com' },
            });

            // Origin must NOT be echoed in Access-Control-Allow-Origin
            expect(res.headers.get('access-control-allow-origin')).toBeNull();

            server.close(resolve);
          } catch (e) {
            server.close(() => reject(e));
          }
        });
      });
    });
  });

  describe('Rate Limiter Configurations (FR-011)', () => {
    it('defines aiRateLimiter and globalRateLimiter as valid Express middleware', () => {
      expect(typeof aiRateLimiter).toBe('function');
      expect(typeof globalRateLimiter).toBe('function');
    });
  });
});

