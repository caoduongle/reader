/**
 * Automated SQL Injection & Query Parameterization Tests (FR-004, FR-005, FR-012)
 * Verifies that all database operations enforce parameterized bindings ($1, $2, ...)
 * and that inputs containing SQL syntax are safely treated as literal values.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import app from '../../server.js';
import { query } from '../../server/db/index.js';
import { TEST_USERS, getAuthHeader } from './setup.js';

describe('SQL Injection & Query Parameterization Defense (OWASP A03:2021)', () => {
  let server: Server;
  let baseUrl: string;

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
  });

  afterAll(async () => {
    delete process.env.STRICT_AUTH;
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Database Query Wrapper Contract (FR-004)', () => {
    it('requires query text to be a valid SQL string', async () => {
      // @ts-expect-error testing invalid input
      await expect(query(null, [])).rejects.toThrow('Query text must be a valid SQL string.');
      // @ts-expect-error testing invalid input
      await expect(query(123, [])).rejects.toThrow('Query text must be a valid SQL string.');
    });

    it('requires params to be an Array to prevent SQL injection parameter tampering', async () => {
      // @ts-expect-error testing invalid params
      await expect(query('SELECT * FROM documents WHERE id = $1', 'not-an-array')).rejects.toThrow(
        'Query params must be passed as an Array to prevent SQL injection.'
      );
      // @ts-expect-error testing invalid params
      await expect(query('SELECT * FROM documents WHERE id = $1', { id: 'bad' })).rejects.toThrow(
        'Query params must be passed as an Array to prevent SQL injection.'
      );
    });

    it('executes clean parameterized query in test environment without syntax error', async () => {
      const res = await query('SELECT * FROM documents WHERE user_id = $1 AND title = $2', [
        'user-123',
        "' OR '1'='1' --",
      ]);
      expect(res).toBeDefined();
      expect(Array.isArray(res.rows)).toBe(true);
    });
  });

  describe('Input Tautology & Injection Resilience via Endpoints (FR-004, FR-005)', () => {
    it('stores SQL tautology payload safely as literal string data without code execution', async () => {
      const injectionPayload = "' OR '1'='1' --";

      const createRes = await fetch(`${baseUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(TEST_USERS.USER_A),
        },
        body: JSON.stringify({
          title: injectionPayload,
          content: 'Nội dung chứa ký tự đặc biệt: "; DROP TABLE documents; --',
          isPrivate: true,
        }),
      });

      expect(createRes.status).toBe(201);
      const data = await createRes.json();
      expect(data.ok).toBe(true);
      expect(data.document.title).toBe(injectionPayload);

      // Verify the document can be read back verbatim
      const readRes = await fetch(`${baseUrl}/api/documents/${data.document.id}`, {
        headers: getAuthHeader(TEST_USERS.USER_A),
      });

      const readData = await readRes.json();
      expect(readRes.status).toBe(200);
      expect(readData.document.title).toBe(injectionPayload);
    });

    it('rejects payloads with illegal field injection (Zod strict mode FR-005)', async () => {
      const res = await fetch(`${baseUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(TEST_USERS.USER_A),
        },
        body: JSON.stringify({
          title: 'Hợp lệ',
          content: 'Nội dung',
          injectedField: "SELECT * FROM secrets",
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toMatch(/injectedField|Unrecognized key|không hợp lệ/);
    });
  });
});
