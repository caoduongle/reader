import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdminGuard } from '../../src/components/AdminGuard';
import { AuthGuard } from '../../src/components/AuthGuard';
import { requireAdmin, signToken } from '../../server/middleware/auth.js';
import app from '../../server.js';

describe('Admin & Authentication Guards (FR-004, FR-005, FR-006)', () => {
  describe('Client-side AdminGuard & AuthGuard', () => {
    it('AdminGuard blocks non-admin users and renders fallback', () => {
      render(
        React.createElement(
          AdminGuard,
          { user: { id: 'u1', role: 'user' } },
          React.createElement('div', { 'data-testid': 'admin-content' }, 'Secret Admin Dashboard')
        )
      );

      expect(screen.queryByTestId('admin-content')).toBeNull();
      expect(screen.getByText(/Truy cập bị từ chối/)).toBeDefined();
    });

    it('AdminGuard allows admin users to view protected content', () => {
      render(
        React.createElement(
          AdminGuard,
          { user: { id: 'admin1', role: 'admin' } },
          React.createElement('div', { 'data-testid': 'admin-content' }, 'Secret Admin Dashboard')
        )
      );

      expect(screen.getByTestId('admin-content')).toBeDefined();
    });

    it('AuthGuard blocks unauthenticated visitors and renders login fallback', () => {
      render(
        React.createElement(
          AuthGuard,
          { user: null },
          React.createElement('div', { 'data-testid': 'private-content' }, 'User Library')
        )
      );

      expect(screen.queryByTestId('private-content')).toBeNull();
      expect(screen.getByText(/Vui lòng đăng nhập/)).toBeDefined();
    });

    it('AuthGuard permits authenticated users', () => {
      render(
        React.createElement(
          AuthGuard,
          { user: { id: 'u1', email: 'test@example.com' } },
          React.createElement('div', { 'data-testid': 'private-content' }, 'User Library')
        )
      );

      expect(screen.getByTestId('private-content')).toBeDefined();
    });
  });

  describe('Server-side requireAdmin Middleware & Endpoints', () => {
    it('requireAdmin middleware rejects non-admin users with 403', () => {
      const req = { user: { id: 'user-1', role: 'user' } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false, error: expect.stringContaining('Yêu cầu quyền quản trị viên') })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('requireAdmin middleware allows admin users to proceed', () => {
      const req = { user: { id: 'admin-1', role: 'admin' } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('GET /api/admin/metrics returns 403 when called with non-admin token', async () => {
      const originalStrictAuth = process.env.STRICT_AUTH;
      process.env.STRICT_AUTH = '1';

      const userToken = signToken({ sub: 'regular-user', email: 'user@example.com', role: 'user' });

      return new Promise<void>((resolve, reject) => {
        const server = app.listen(0, async () => {
          try {
            const address = server.address();
            if (!address || typeof address === 'string') {
              server.close();
              return reject(new Error('Invalid address'));
            }
            const port = address.port;

            const res = await fetch(`http://127.0.0.1:${port}/api/admin/metrics`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });

            expect(res.status).toBe(403);
            const data = await res.json();
            expect(data.ok).toBe(false);

            server.close(() => {
              process.env.STRICT_AUTH = originalStrictAuth;
              resolve();
            });
          } catch (e) {
            server.close(() => {
              process.env.STRICT_AUTH = originalStrictAuth;
              reject(e);
            });
          }
        });
      });
    });

    it('GET /api/admin/metrics returns 200 when called with valid admin token', async () => {
      const originalStrictAuth = process.env.STRICT_AUTH;
      process.env.STRICT_AUTH = '1';

      const adminToken = signToken({ sub: 'admin-user', email: 'admin@example.com', role: 'admin' });

      return new Promise<void>((resolve, reject) => {
        const server = app.listen(0, async () => {
          try {
            const address = server.address();
            if (!address || typeof address === 'string') {
              server.close();
              return reject(new Error('Invalid address'));
            }
            const port = address.port;

            const res = await fetch(`http://127.0.0.1:${port}/api/admin/metrics`, {
              headers: { Authorization: `Bearer ${adminToken}` },
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBe(true);
            expect(data.metrics).toBeDefined();
            expect(data.metrics.heapUsedMb).toBeGreaterThan(0);

            server.close(() => {
              process.env.STRICT_AUTH = originalStrictAuth;
              resolve();
            });
          } catch (e) {
            server.close(() => {
              process.env.STRICT_AUTH = originalStrictAuth;
              reject(e);
            });
          }
        });
      });
    });
  });
});
