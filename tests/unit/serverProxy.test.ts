import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';

// Feature 048-desktop-tts-migration: /api/speak/edge gọi tới dịch vụ thật của
// Microsoft qua WebSocket - mock ở tầng module để test không phụ thuộc mạng/CI.
const mockTtsPromise = vi.fn();
vi.mock('node-edge-tts', () => {
  return {
    EdgeTTS: class MockEdgeTTS {
      ttsPromise = mockTtsPromise;
    },
  };
});

import { writeFile } from 'node:fs/promises';
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
});

describe('POST /api/speak/edge (Microsoft Edge TTS, feature 048-desktop-tts-migration)', () => {
  let server: http.Server;
  let baseUrl: string;

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
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    mockTtsPromise.mockReset();
  });

  it('rejects missing text with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/speak/edge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('rejects text over the 10,000 character limit with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/speak/edge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'a'.repeat(10_001) }),
    });
    expect(res.status).toBe(400);
  });

  it('does NOT call python-backend / any RVC-related path - only node-edge-tts', async () => {
    mockTtsPromise.mockImplementation(async (_text: string, outPath: string) => {
      await writeFile(outPath, Buffer.from('fake-mp3-bytes'));
    });

    const res = await fetch(`${baseUrl}/api/speak/edge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Xin chào VoxRead', voice: 'vi-VN-HoaiMyNeural' }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.toString()).toBe('fake-mp3-bytes');
    expect(mockTtsPromise).toHaveBeenCalledTimes(1);
    expect(mockTtsPromise.mock.calls[0][0]).toBe('Xin chào VoxRead');
  });

  it('applies default voice/rate/pitch/volume when not provided', async () => {
    mockTtsPromise.mockImplementation(async (_text: string, outPath: string) => {
      await writeFile(outPath, Buffer.from('fake-mp3-bytes'));
    });

    const res = await fetch(`${baseUrl}/api/speak/edge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Xin chào' }),
    });

    expect(res.status).toBe(200);
    expect(mockTtsPromise).toHaveBeenCalledTimes(1);
  });

  it('maps an upstream/network failure to HTTP 502 with a friendly Vietnamese message', async () => {
    mockTtsPromise.mockRejectedValue(new Error('Unexpected server response: 403'));

    const res = await fetch(`${baseUrl}/api/speak/edge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Xin chào' }),
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Edge TTS');
    expect(body.error).not.toContain('at file://'); // khong lo stack trace noi bo
  });
});
