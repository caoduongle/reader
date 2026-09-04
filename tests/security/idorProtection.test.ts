/**
 * Automated IDOR & Broken Access Control Penetration Tests (FR-001, FR-002, FR-003)
 * Verifies that a tenant cannot read, update, or delete another tenant's resources.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import app from '../../server.js';
import { TEST_USERS, getAuthHeader } from './setup.js';

describe('IDOR & Data Ownership Enforcement (OWASP A01:2021)', () => {
  let server: Server;
  let baseUrl: string;
  let docAId: string;

  beforeAll(async () => {
    process.env.STRICT_AUTH = '1';
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          return reject(new Error('Failed to bind server port'));
        }
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Create a private document for User A
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(TEST_USERS.USER_A),
      },
      body: JSON.stringify({
        title: 'Bí Mật Kinh Doanh Của User A',
        content: 'Nội dung tài liệu tuyệt mật của User A không được để lộ.',
        isPrivate: true,
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.ok).toBe(true);
    expect(data.document).toBeDefined();
    docAId = data.document.id;
  });

  afterAll(async () => {
    delete process.env.STRICT_AUTH;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('allows User A (owner) to retrieve their own document', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${docAId}`, {
      headers: getAuthHeader(TEST_USERS.USER_A),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.document.title).toBe('Bí Mật Kinh Doanh Của User A');
    expect(data.document.userId).toBe(TEST_USERS.USER_A.id);
  });

  it('blocks User B from reading User A document with HTTP 404 (Anti-Enumeration)', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${docAId}`, {
      headers: getAuthHeader(TEST_USERS.USER_B),
    });

    // CRITICAL: Must return 404 rather than 403 to prevent ID existence enumeration
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.document).toBeUndefined();
    expect(data.error).toMatch(/Không tìm thấy tài liệu/);
  });

  it('blocks User B from modifying User A document with HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${docAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(TEST_USERS.USER_B),
      },
      body: JSON.stringify({
        title: 'Hacked by User B',
        content: 'Malicious modification',
      }),
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.ok).toBe(false);

    // Verify document in storage remains unmodified
    const verifyRes = await fetch(`${baseUrl}/api/documents/${docAId}`, {
      headers: getAuthHeader(TEST_USERS.USER_A),
    });

    const verifyData = await verifyRes.json();
    expect(verifyRes.status).toBe(200);
    expect(verifyData.document.title).toBe('Bí Mật Kinh Doanh Của User A');
  });

  it('blocks User B from deleting User A document with HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${docAId}`, {
      method: 'DELETE',
      headers: getAuthHeader(TEST_USERS.USER_B),
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.ok).toBe(false);

    // Verify document in storage was NOT deleted
    const verifyRes = await fetch(`${baseUrl}/api/documents/${docAId}`, {
      headers: getAuthHeader(TEST_USERS.USER_A),
    });

    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.document.id).toBe(docAId);
  });

  it('isolates collection queries: User B cannot see User A documents in GET /api/documents', async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      headers: getAuthHeader(TEST_USERS.USER_B),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.documents)).toBe(true);

    const foundDocA = data.documents.find((d: { id: string }) => d.id === docAId);
    expect(foundDocA).toBeUndefined();
  });

  it('rejects unauthenticated requests to read documents', async () => {
    const res = await fetch(`${baseUrl}/api/documents/${docAId}`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });
});
