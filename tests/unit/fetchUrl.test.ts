import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
import { isPrivateOrReservedIp } from '../../lib/ssrfGuard';
import {
  safeFetchHtml,
  htmlToParagraphText,
} from '../../lib/safeFetch';

describe('POST /api/fetch-url (Express server endpoint)', () => {
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
    delete process.env.GEMINI_API_KEY;
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

  it('blocks loopback and private IP access (SSRF protection) with 400', async () => {
    const blockedUrls = [
      'http://127.0.0.1:3001/health',
      'http://localhost:8008',
      'http://10.0.0.1/status',
      'http://192.168.1.1/router',
      'http://169.254.169.254/latest/meta-data',
      'http://172.20.0.1:8080',
    ];

    for (const url of blockedUrls) {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.');
    }
  });

  it('allows fetching public URL with mocked HTML response', async () => {
    const samplePublicHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Public Domain Article</title></head>
        <body>
          <article>
            <h1>Public News Title</h1>
            <p>This is a verified public article body successfully extracted by reader. It contains sufficient text content exceeding one hundred characters.</p>
          </article>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://example.com/article') {
        return new Response(samplePublicHtml, {
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
        body: JSON.stringify({ url: 'https://example.com/article' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.title).toContain('Public Domain Article');
      expect(body.content).toContain('This is a verified public article body');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});

describe('User Story 1: Multi-Hop SSRF Defense Across HTTP Redirects', () => {
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

  it('blocks redirect (HTTP 302) to loopback IP (127.0.0.1:8008) with 400', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://attacker.test/redirect-loopback') {
        return new Response(null, {
          status: 302,
          headers: { Location: 'http://127.0.0.1:8008/health' },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://attacker.test/redirect-loopback' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('blocks redirect (HTTP 302) to cloud instance metadata (169.254.169.254) with 400', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://attacker.test/redirect-metadata') {
        return new Response(null, {
          status: 302,
          headers: { Location: 'http://169.254.169.254/latest/meta-data' },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://attacker.test/redirect-metadata' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toBe('Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('rejects infinite redirect loop exceeding 5 hops with 400', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.startsWith('https://redirect.test/hop-')) {
        const currentHop = parseInt(urlStr.replace('https://redirect.test/hop-', ''), 10);
        return new Response(null, {
          status: 302,
          headers: { Location: `https://redirect.test/hop-${currentHop + 1}` },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://redirect.test/hop-1' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('chuyển hướng quá nhiều lần');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('resolves relative Location redirects against currentUrl correctly', async () => {
    const articleHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Trang Đích Chuyển Hướng</title></head>
        <body>
          <article>
            <h1>Chương Sau Thành Công</h1>
            <p>Đây là nội dung sau khi chuyển hướng tương đối thành công, đảm bảo URL đích được tính toán chính xác và an toàn tuyệt đối.</p>
          </article>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr === 'https://truyen-online.test/start-chapter') {
        return new Response(null, {
          status: 302,
          headers: { Location: '/destination/chapter-final' },
        });
      }
      if (urlStr === 'https://truyen-online.test/destination/chapter-final') {
        return new Response(articleHtml, {
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
        body: JSON.stringify({ url: 'https://truyen-online.test/start-chapter' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.title).toBe('Trang Đích Chuyển Hướng');
      expect(body.content).toContain('Đây là nội dung sau khi chuyển hướng');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('rejects redirect response missing Location header with 400', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://bad-redirect.test/missing-location') {
        return new Response(null, {
          status: 302,
          headers: {},
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://bad-redirect.test/missing-location' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('thiếu header Location');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});

describe('User Story 2: Streaming Body Consumption & Memory Overflow Protection', () => {
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

  it('rejects non-HTML Content-Type (e.g. application/pdf) with 400', async () => {
    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://files.test/document.pdf') {
        return new Response('%PDF-1.4 ... binary data ...', {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://files.test/document.pdf' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('Chỉ hỗ trợ đọc nội dung từ trang web HTML');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('cancels stream and rejects when body size exceeds 5MB with 400', async () => {
    const originalFetch = globalThis.fetch;
    const cancelSpy = vi.fn();

    // Mock response body reader to verify reader.cancel() is invoked on overflow
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://large-page.test/huge') {
        const chunk = new Uint8Array(1024 * 1024); // 1MB chunk
        let sent = 0;
        const mockReader = {
          read: vi.fn().mockImplementation(async () => {
            if (sent < 6) {
              sent++;
              return { done: false, value: chunk };
            }
            return { done: true, value: undefined };
          }),
          cancel: cancelSpy,
        };

        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }),
          body: {
            getReader: () => mockReader,
          },
        } as unknown as Response;
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const res = await fetch(`${baseUrl}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://large-page.test/huge' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('Dung lượng trang web vượt quá giới hạn');
      expect(cancelSpy).toHaveBeenCalled();
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('correctly decodes multi-byte UTF-8 characters across stream chunk boundaries', async () => {
    // Vietnamese "tiến" contains "ế" which is 3 bytes in UTF-8: 0xE1 0xBA 0xBF
    const encoder = new TextEncoder();
    const part1 = encoder.encode('Hành trình tu ti'); // ends right before "ế"
    const charBytes = new Uint8Array([0xe1, 0xba, 0xbf]); // "ế"
    const part2Rest = encoder.encode('n của thiếu niên anh hùng bắt đầu tại đây.');

    // Split "ế" across chunks: chunk1 has first 2 bytes, chunk2 has 3rd byte + rest
    const chunk1 = new Uint8Array(part1.length + 2);
    chunk1.set(part1, 0);
    chunk1.set(charBytes.subarray(0, 2), part1.length);

    const chunk2 = new Uint8Array(1 + part2Rest.length);
    chunk2[0] = charBytes[2];
    chunk2.set(part2Rest, 1);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk1);
        controller.enqueue(chunk2);
        controller.close();
      },
    });

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://truyen.test/multibyte') {
        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      const result = await safeFetchHtml('https://truyen.test/multibyte');
      expect(result.html).toContain('Hành trình tu tiến của thiếu niên anh hùng bắt đầu tại đây.');
      expect(result.html).not.toContain('\uFFFD'); // No replacement characters
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});

describe('User Story 3: Authentic Browser Header Fingerprinting', () => {
  it('sends Chrome 124 desktop headers and omits VoxRead/1.0 token', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedHeaders: Record<string, string> = {};

    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://headers.test/inspect') {
        interceptedHeaders = (options?.headers as Record<string, string>) || {};
        return new Response('<p>dummy text exceeding 100 characters so that it parses cleanly without any issues.</p>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return originalFetch(url, options);
    });

    vi.stubGlobal('fetch', mockFetch);

    try {
      await safeFetchHtml('https://headers.test/inspect');
      expect(interceptedHeaders['User-Agent']).toContain('Chrome/124.0.0.0');
      expect(interceptedHeaders['User-Agent']).not.toContain('VoxRead');
      expect(interceptedHeaders['Upgrade-Insecure-Requests']).toBe('1');
      expect(interceptedHeaders['Sec-Fetch-Dest']).toBe('document');
      expect(interceptedHeaders['Sec-Fetch-Mode']).toBe('navigate');
      expect(interceptedHeaders['Sec-Fetch-Site']).toBe('none');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});

describe('User Story 4: Structural Paragraph Preservation for Text-to-Speech Karaoke', () => {
  it('inserts double newlines (\\n\\n) before and after block elements and \\n for br', () => {
    const html = `
      <div>
        <h1>Tiêu đề bài viết</h1>
        <p>Đoạn văn đầu tiên có dòng 1<br>và dòng 2 sau thẻ br.</p>
        <blockquote>Trích dẫn văn học rất sâu sắc và ý nghĩa.</blockquote>
        <p>Đoạn văn tiếp theo.</p>
        <ul>
          <li>Mục 1</li>
          <li>Mục 2</li>
        </ul>
      </div>
    `;

    const text = htmlToParagraphText(html);

    expect(text).toContain('Tiêu đề bài viết\n\n');
    expect(text).toContain('Đoạn văn đầu tiên có dòng 1\nvà dòng 2 sau thẻ br.');
    expect(text).toContain('\n\nTrích dẫn văn học rất sâu sắc');
    expect(text).toContain('\n\nĐoạn văn tiếp theo.');
    // Check that multiple newlines are condensed into \n\n
    expect(text).not.toMatch(/\n{3,}/);
  });
});

describe('User Story 5: Resilient AI Fallback Extraction via Gemini', () => {
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

  it('triggers Gemini fallback when Readability produces < 100 characters and GEMINI_API_KEY is configured', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-12345';

    // HTML where Readability yields only 25 characters (< 100)
    const shortHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Trang Đọc Truyện Online</title></head>
        <body>
          <div class="header">Menu</div>
          <div id="content"><p>Đang tải chương truyện...</p></div>
        </body>
      </html>
    `;

    const aiExtractedStory =
      'Đêm hôm đó, bầu trời đen kịt không một ánh sao. Diệp Phàm ngồi xếp bằng trong mật thất, cảm nhận từng luồng linh khí cuồn cuộn chảy vào kinh mạch.\n\nSau ba năm kiên trì tu luyện, cuối cùng cậu cũng chạm tới ngưỡng cửa của cảnh giới Trúc Cơ kỳ, chuẩn bị bước vào con đường cường giả.';

    mockGenerateContent.mockResolvedValueOnce({
      text: aiExtractedStory,
    });

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://dynamic-novel.test/chapter-1') {
        return new Response(shortHtml, {
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
        body: JSON.stringify({ url: 'https://dynamic-novel.test/chapter-1' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.byline).toBe('AI Extracted');
      expect(body.content).toContain('Đêm hôm đó, bầu trời đen kịt không một ánh sao.');
      expect(body.content).toContain('Sau ba năm kiên trì tu luyện');
      expect(mockGenerateContent).toHaveBeenCalled();
    } finally {
      delete process.env.GEMINI_API_KEY;
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('returns 422 when Readability yields < 100 characters and GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;

    const shortHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Trang Trống</title></head>
        <body><p>Vui lòng đăng nhập</p></body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://login-required.test/read') {
        return new Response(shortHtml, {
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
        body: JSON.stringify({ url: 'https://login-required.test/read' }),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error).toContain('Không thể trích xuất nội dung');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});

describe('User Story 6: Next Chapter Navigation Link Discovery', () => {
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

  it('detects next chapter link matching regex and returns resolved absolute nextChapterUrl', async () => {
    const novelHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Chương 10 - Truyện Kiếm Hiệp</title></head>
        <body>
          <article>
            <h1>Chương 10: Trận Chiến Trên Đỉnh Núi</h1>
            <p>Gió rít gào trên đỉnh Tuyết Sơn, kiếm quang sáng lòa giữa màn tuyết trắng xóa. Hai bóng người lao vào nhau với tốc độ kinh hoàng.</p>
            <p>Trường kiếm chạm nhau phát ra âm thanh vang dội khắp thung lũng, báo hiệu một cuộc quyết đấu sinh tử không thể vãn hồi.</p>
          </article>
          <div class="chapter-nav">
            <a href="/truyen/kiem-hiep/chuong-9">Chương trước</a>
            <a href="/truyen/kiem-hiep/chuong-11">Chương sau</a>
          </div>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://truyen-online.test/truyen/kiem-hiep/chuong-10') {
        return new Response(novelHtml, {
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
        body: JSON.stringify({ url: 'https://truyen-online.test/truyen/kiem-hiep/chuong-10' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.nextChapterUrl).toBe('https://truyen-online.test/truyen/kiem-hiep/chuong-11');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('omits nextChapterUrl when no next chapter navigation link exists in page', async () => {
    const simpleHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Bài Báo Độc Lập</title></head>
        <body>
          <article>
            <h1>Tin Tức Buổi Sáng</h1>
            <p>Hôm nay trời nắng đẹp trên toàn khu vực miền Bắc, nhiệt độ dao động trong khoảng từ 22 đến 28 độ C, rất thuận lợi cho các hoạt động ngoài trời.</p>
          </article>
          <footer><a href="/lien-he">Liên hệ ban biên tập</a></footer>
        </body>
      </html>
    `;

    const originalFetch = globalThis.fetch;
    const mockFetch = vi.fn().mockImplementation(async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url) === 'https://news.test/today') {
        return new Response(simpleHtml, {
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
        body: JSON.stringify({ url: 'https://news.test/today' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.nextChapterUrl).toBeUndefined();
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});

describe('isPrivateOrReservedIp helper', () => {
  it('correctly identifies private and reserved IPv4 addresses', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('127.255.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('172.32.0.1')).toBe(false); // Public
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);
    expect(isPrivateOrReservedIp('100.64.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('100.127.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('100.128.0.1')).toBe(false); // Public
    expect(isPrivateOrReservedIp('224.0.0.1')).toBe(true); // Multicast
    expect(isPrivateOrReservedIp('240.0.0.1')).toBe(true); // Reserved
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false); // Public
    expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false); // Public
    expect(isPrivateOrReservedIp('93.184.215.14')).toBe(false); // Public example.com
  });

  it('correctly identifies private and reserved IPv6 addresses', () => {
    expect(isPrivateOrReservedIp('::1')).toBe(true);
    expect(isPrivateOrReservedIp('0:0:0:0:0:0:0:1')).toBe(true);
    expect(isPrivateOrReservedIp('::')).toBe(true);
    expect(isPrivateOrReservedIp('fc00::1')).toBe(true);
    expect(isPrivateOrReservedIp('fd12:3456:789a::1')).toBe(true);
    expect(isPrivateOrReservedIp('fe80::1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('::ffff:8.8.8.8')).toBe(false); // IPv4-mapped public
    expect(isPrivateOrReservedIp('2606:2800:21f:cb07:6820:80da:af6b:8b2c')).toBe(false); // Public
  });
});
