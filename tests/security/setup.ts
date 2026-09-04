/**
 * Security Test Harness & Fixtures (FR-001, FR-002, FR-004, FR-006)
 * Provides authenticated tenant contexts, mock tokens, and payload fixtures.
 */

import { signToken } from '../../server/middleware/auth.js';

export const TEST_USERS = {
  USER_A: {
    id: 'usr_tenant_a_123',
    email: 'user_a@example.com',
    role: 'user',
  },
  USER_B: {
    id: 'usr_tenant_b_456',
    email: 'user_b@example.com',
    role: 'user',
  },
  ADMIN: {
    id: 'usr_super_admin_999',
    email: 'admin@voxread.app',
    role: 'admin',
  },
} as const;

export function getAuthToken(user: { id: string; email: string; role: string }) {
  return signToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

export function getAuthHeader(user: { id: string; email: string; role: string }) {
  return {
    Authorization: `Bearer ${getAuthToken(user)}`,
  };
}
