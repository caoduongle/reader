import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import app from '../../server';

describe('POST /api/fetch-url (Express server endpoint)', () => {
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

  it('rejects missing or empty url with 400', async () => {
    const res = await fetch(`${baseUrl}/api/fetch-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('không được để trống');
  });

  it('rejects invalid or non-HTTP protocols with 400', async () => {
    const res = await fetch(`${baseUrl}/api/fetch-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'javascript:alert(1)' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('không hợp lệ');
  });

  it('successfully extracts article title and content from valid HTML', async () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Chương 1: Khởi Đầu Mới - Truyện Hay</title>
        </head>
        <body>
          <header><nav><a href="/">Trang chủ</a></nav></header>
          <div class="sidebar"><p>Quảng cáo linh tinh</p></div>
          <article>
            <h1>Chương 1: Khởi Đầu Mới</h1>
            <p class="byline">Tác giả: Nam Phái</p>
            <p>Mặt trời vừa ló rạng qua rặng núi xa xa. Không khí buổi sớm mai trong lành và tĩnh mịch.</p>
            <p>Lâm Phong bước ra khỏi căn nhà gỗ, hít một hơi thật sâu. Hôm nay là ngày cậu bắt đầu chuyến hành trình tu tiên.</p>
          </article>
          <footer><p>Bản quyền 2026</p></footer>
        </body>
      </html>
    `;

    // Mock global fetch within the Node server
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://truyen-online.test/chuong-1') {
        return new Response(sampleHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://truyen-online.test/chuong-1' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.title).toContain('Chương 1: Khởi Đầu Mới');
      expect(body.content).toContain('Mặt trời vừa ló rạng qua rặng núi xa xa.');
      expect(body.content).toContain('Lâm Phong bước ra khỏi căn nhà gỗ');
      // Verify ads/navigation stripped
      expect(body.content).not.toContain('Quảng cáo linh tinh');
      expect(body.content).not.toContain('Trang chủ');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('returns 422 when page has no extractable article content', async () => {
    const emptyHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Trang Trống</title></head>
        <body>
          <div class="advertisement"></div>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://empty-page.test/blank') {
        return new Response(emptyHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://empty-page.test/blank' }),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('Không thể trích xuất nội dung');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('returns 504 when fetch times out', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://timeout-page.test/slow') {
        const timeoutErr = new Error('The operation was aborted due to timeout');
        timeoutErr.name = 'TimeoutError';
        throw timeoutErr;
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://timeout-page.test/slow' }),
      });

      expect(res.status).toBe(504);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('Quá thời gian chờ tải trang');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});
