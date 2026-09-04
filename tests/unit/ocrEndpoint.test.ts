import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import http from 'http';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

import app from '../../server';

describe('POST /api/ocr (Express OCR endpoint)', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing or empty image payload with HTTP 400', async () => {
    process.env.GEMINI_API_KEY = 'test_key';

    const res1 = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res1.status).toBe(400);
    const body1 = await res1.json();
    expect(body1.ok).toBe(false);
    expect(body1.error).toContain('không hợp lệ');

    const res2 = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: '   ' }),
    });
    expect(res2.status).toBe(400);
    const body2 = await res2.json();
    expect(body2.ok).toBe(false);
  });

  it('rejects non-string image with HTTP 400', async () => {
    process.env.GEMINI_API_KEY = 'test_key';

    const res = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 12345 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('rejects excessively large images (>15MB decoded) with HTTP 400', async () => {
    process.env.GEMINI_API_KEY = 'test_key';

    // 15MB * (4/3) is ~20MB of base64 characters. Let's create an oversized string.
    const oversizedBase64 = 'A'.repeat(21 * 1024 * 1024);
    const res = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: oversizedBase64 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('vượt quá giới hạn cho phép');
  });

  it('returns HTTP 503 when GEMINI_API_KEY is missing or default placeholder', async () => {
    delete process.env.GEMINI_API_KEY;

    const res = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }),
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('GEMINI_API_KEY is not configured');

    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    const resPlaceholder = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }),
    });
    expect(resPlaceholder.status).toBe(503);
  });

  it('successfully extracts text with model gemini-2.5-flash and returns HTTP 200', async () => {
    process.env.GEMINI_API_KEY = 'valid_test_key';
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Đây là văn bản tiếng Việt nhận diện được từ ảnh.',
    });

    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: `data:image/png;base64,${sampleBase64}` }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.text).toBe('Đây là văn bản tiếng Việt nhận diện được từ ảnh.');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArg = mockGenerateContent.mock.calls[0][0];
    expect(callArg.model).toBe('gemini-2.5-flash');
    expect(callArg.contents[0].inlineData.mimeType).toBe('image/png');
    expect(callArg.contents[0].inlineData.data).toBe(sampleBase64);
    expect(callArg.contents[1]).toContain('Chỉ trả về nguyên văn chữ');
  });

  it('returns HTTP 500 when Gemini API throws an error', async () => {
    process.env.GEMINI_API_KEY = 'valid_test_key';
    mockGenerateContent.mockRejectedValueOnce(new Error('Quota exceeded or network timeout'));

    const res = await fetch(`${baseUrl}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Lỗi khi xử lý nhận diện chữ');
    expect(body.error).toContain('Quota exceeded');
  });
});
