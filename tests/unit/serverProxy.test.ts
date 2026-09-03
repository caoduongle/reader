import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../../server';

describe('Gemini Express Proxy (server.js)', () => {
  let server: http.Server;
  let baseUrl: string;
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (originalEnvKey !== undefined) {
      process.env.GEMINI_API_KEY = originalEnvKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  });

  it('GET /health returns 200 with service metadata', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: 'ok',
      service: 'voxread-gemini-proxy',
    });
    expect(typeof body.geminiConfigured).toBe('boolean');
    expect(typeof body.timestamp).toBe('string');
  });

  it('POST /api/generate rejects empty or missing prompt with HTTP 400 when key is configured', async () => {
    process.env.GEMINI_API_KEY = 'test_mock_api_key';

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('prompt');
  });

  it('POST /api/generate rejects non-string prompt with HTTP 400 when key is configured', async () => {
    process.env.GEMINI_API_KEY = 'test_mock_api_key';

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 12345 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('POST /api/generate returns HTTP 503 when GEMINI_API_KEY is unconfigured', async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Tóm tắt bài văn này.' }),
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('GEMINI_API_KEY is not configured');
  });
});
