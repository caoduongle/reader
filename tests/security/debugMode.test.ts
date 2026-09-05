import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { errorHandler } from '../../server/middleware/errorHandler.js';

describe('Debug Mode Suppression & Production Settings (FR-019, FR-020)', () => {
  describe('errorHandler (FR-019)', () => {
    it('suppresses error stack traces and sensitive error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection failed at postgres://user:password@internal-db:5432/voxread');
      error.stack = 'Error: Database connection failed\n    at internal/db.js:42:15';

      const req = {
        method: 'POST',
        originalUrl: '/api/generate',
        ip: '127.0.0.1',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      // @ts-expect-error test mock
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
        })
      );

      // Verify that the internal database path and credentials were NOT sent to client
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.error).not.toContain('postgres://');
      expect(responseBody.error).not.toContain('password');
      expect(responseBody.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('returns descriptive error message in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Explicit development validation failure');
      const req = {
        method: 'POST',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      // @ts-expect-error test mock
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Explicit development validation failure',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Vite Production Settings (FR-020)', () => {
    it('disables sourcemaps and drops console/debugger statements in production build', () => {
      const configPath = path.resolve(process.cwd(), 'vite.config.ts');
      const content = fs.readFileSync(configPath, 'utf8');

      expect(content).toContain('sourcemap: false');
      expect(content).toContain("drop: isProd ? ['console', 'debugger'] : []");
    });
  });
});
