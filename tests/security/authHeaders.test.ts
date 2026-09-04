import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth, signToken } from '../../server/middleware/auth.js';

interface MockRequest {
  headers: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: { id: string; email?: string; role?: string };
}

interface MockResponse {
  status: (code: number) => { json: (data: unknown) => void };
}

describe('AppSec FR-006: Server-Side Authentication Middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-32-bytes-long-for-vitest-suite';
    process.env.STRICT_AUTH = '1';
  });

  it('rejects requests without Authorization header with HTTP 401', () => {
    const req = { headers: {} } as unknown as MockRequest;
    let statusSet = 0;
    let jsonSent: { ok?: boolean; error?: string } | null = null;
    const res: MockResponse = {
      status(code: number) {
        statusSet = code;
        return {
          json(data: unknown) {
            jsonSent = data as { ok?: boolean; error?: string };
          },
        };
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    requireAuth(req as never, res as never, next);

    expect(statusSet).toBe(401);
    expect(jsonSent?.ok).toBe(false);
    expect(nextCalled).toBe(false);
  });

  it('rejects requests with invalid JWT tokens with HTTP 401', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid.token.signature',
      },
    } as unknown as MockRequest;
    let statusSet = 0;
    let jsonSent: { ok?: boolean; error?: string } | null = null;
    const res: MockResponse = {
      status(code: number) {
        statusSet = code;
        return {
          json(data: unknown) {
            jsonSent = data as { ok?: boolean; error?: string };
          },
        };
      },
    };
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    requireAuth(req as never, res as never, next);

    expect(statusSet).toBe(401);
    expect(jsonSent?.ok).toBe(false);
    expect(nextCalled).toBe(false);
  });

  it('accepts valid JWT token and attaches req.user', () => {
    const token = signToken({ id: 'user-uuid-1234', email: 'reader@example.com', role: 'user' });
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as MockRequest;
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    const res = {} as MockResponse;

    requireAuth(req as never, res as never, next);

    expect(nextCalled).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe('user-uuid-1234');
    expect(req.user?.email).toBe('reader@example.com');
  });
});
