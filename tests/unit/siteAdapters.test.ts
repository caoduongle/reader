import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { findAdapter, extractWithAdapter, ADAPTERS } from '../../server/lib/siteAdapters';

describe('findAdapter', () => {
  it('matches docln.sbs and its known sibling domains', () => {
    expect(findAdapter('docln.sbs')?.id).toBe('docln-hako');
    expect(findAdapter('docln.net')?.id).toBe('docln-hako');
    expect(findAdapter('ln.hako.vn')?.id).toBe('docln-hako');
    expect(findAdapter('www.docln.sbs')?.id).toBe('docln-hako');
  });

  it('matches zuminovel.com', () => {
    expect(findAdapter('zuminovel.com')?.id).toBe('zuminovel');
    expect(findAdapter('www.zuminovel.com')?.id).toBe('zuminovel');
  });

  it('returns null for unknown hostnames instead of throwing', () => {
    expect(findAdapter('example.com')).toBeNull();
    expect(findAdapter('')).toBeNull();
    // @ts-expect-error deliberately testing runtime guard against nullish input
    expect(findAdapter(undefined)).toBeNull();
  });

  it('does not false-positive on unrelated domains containing similar substrings', () => {
    expect(findAdapter('notzuminovel.com')).toBeNull();
    expect(findAdapter('zuminovel.com.evil.example')).toBeNull();
  });

  it('every adapter entry has a non-empty id and hostnames list', () => {
    for (const adapter of ADAPTERS) {
      expect(adapter.id).toBeTruthy();
      expect(Array.isArray(adapter.hostnames)).toBe(true);
    }
  });
});

describe('extractWithAdapter', () => {
  it('returns null when no adapter is provided', () => {
    const dom = new JSDOM('<html><body><p>hello</p></body></html>');
    expect(extractWithAdapter(dom.window.document, null)).toBeNull();
  });

  it('extracts content from the first matching selector and strips remove-selectors', () => {
    const filler = 'Đoạn văn kiểm thử dài để vượt ngưỡng độ dài tối thiểu. '.repeat(5);
    const html = `
      <html>
        <body>
          <div class="chapter-content">
            <script>trackPageView();</script>
            <p>${filler}</p>
            <div class="ads">Quảng cáo không mong muốn</div>
          </div>
        </body>
      </html>
    `;
    const dom = new JSDOM(html);
    const adapter = {
      id: 'test-adapter',
      hostnames: [],
      contentSelectors: ['#does-not-exist', '.chapter-content'],
      removeSelectors: ['script', '.ads'],
    };

    const result = extractWithAdapter(dom.window.document, adapter, 50);
    expect(result).not.toBeNull();
    expect(result?.text).toContain('Đoạn văn kiểm thử');
    expect(result?.text).not.toContain('Quảng cáo không mong muốn');
    expect(result?.html).not.toContain('<script>');
  });

  it('falls through to the next selector candidate when the first is absent', () => {
    const filler = 'Nội dung chương truyện đủ dài để vượt ngưỡng kiểm tra tối thiểu. '.repeat(5);
    const html = `<html><body><div id="chapter-content"><p>${filler}</p></div></body></html>`;
    const dom = new JSDOM(html);
    const adapter = {
      id: 'test-adapter',
      hostnames: [],
      contentSelectors: ['.chapter-content', '#chapter-content'],
      removeSelectors: [],
    };

    const result = extractWithAdapter(dom.window.document, adapter, 50);
    expect(result).not.toBeNull();
    expect(result?.text).toContain('Nội dung chương truyện');
  });

  it('returns null when the matched element has less text than minLength', () => {
    const html = '<html><body><div class="chapter-content"><p>Quá ngắn.</p></div></body></html>';
    const dom = new JSDOM(html);
    const adapter = {
      id: 'test-adapter',
      hostnames: [],
      contentSelectors: ['.chapter-content'],
      removeSelectors: [],
    };

    expect(extractWithAdapter(dom.window.document, adapter, 100)).toBeNull();
  });

  it('does not crash on an invalid selector and continues to the next candidate', () => {
    const filler = 'Văn bản hợp lệ dùng để kiểm tra bộ chọn kế tiếp trong danh sách. '.repeat(5);
    const html = `<html><body><div class="chapter-content"><p>${filler}</p></div></body></html>`;
    const dom = new JSDOM(html);
    const adapter = {
      id: 'test-adapter',
      hostnames: [],
      contentSelectors: [':::not-a-valid-selector:::', '.chapter-content'],
      removeSelectors: [],
    };

    const result = extractWithAdapter(dom.window.document, adapter, 50);
    expect(result).not.toBeNull();
  });
});
