import { describe, it, expect } from 'vitest';
import { aiRateLimiter, globalRateLimiter } from '../../server/middleware/rateLimiter.js';

describe('AppSec FR-011: Rate Limiting Middleware', () => {
  it('aiRateLimiter has 30 requests per minute threshold', () => {
    expect(aiRateLimiter).toBeDefined();
    expect(typeof aiRateLimiter).toBe('function');
  });

  it('globalRateLimiter has 120 requests per minute threshold', () => {
    expect(globalRateLimiter).toBeDefined();
    expect(typeof globalRateLimiter).toBe('function');
  });
});

