import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { findAdapter, extractWithAdapter, unprotectHakoContent, ADAPTERS } from '../../server/lib/siteAdapters';

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

describe('unprotectHakoContent', () => {
  it('decodes an xor_shuffle payload, reassembling out-of-order chunks by their numeric prefix', () => {
    // Fixture generated with the exact inverse of decodeHakoChunk (xor byte-for-byte
    // against the repeating key, then base64) from two locally-authored test
    // sentences, split into two chunks and deliberately placed out of order in
    // the array to exercise the sort-by-prefix step.
    const html = `<html><body><div id="chapter-content"><div id="chapter-c-protected" data-s="xor_shuffle" data-k="testkey123" data-c='["0002SBVNsPsKmIuTXVQOGpXQ5hQRRluV3t5UHw2YipsTHAQaVAwMuotCExqEyO0CRR1EXFRUE7XEit7aRRJdE6PDldDEF1YS9+WEyO1LAbqRWxMAhMjlAkUNWVvSz+YGVAaEwqhGEwAXt/cGRRLyjxMAhMjFRVlWQQw=","0001SBVNsPum20gSX7fFU7D6CpiLk11UDhqV0OYUEUZbld7eVB8NmIqbExoNks7OEVlV8YoaAlOw+oTCshJLt8QQVAUNmIufXVQHks/yRR5Y04nXDFMZqMZZWV3SzsQHVK/0mIqrXRNFt+Wo3xdWHBNISgNK"]'></div></div></body></html>`;
    const dom = new JSDOM(html);

    const count = unprotectHakoContent(dom.window.document);

    expect(count).toBe(1);
    expect(dom.window.document.querySelector('#chapter-c-protected')).toBeNull();
    const content = dom.window.document.querySelector('#chapter-content')?.textContent || '';
    expect(content).toContain('đoạn kiểm thử thứ nhất');
    // Confirms ordering: prefix 0001 must land before 0002 despite arriving second in the array.
    expect(content.indexOf('thứ nhất')).toBeLessThan(content.indexOf('thứ hai'));
  });

  it('decodes a base64_reverse payload', () => {
    const html = `<html><body><div id="chapter-content"><div id="chapter-c-protected" data-s="base64_reverse" data-c='["0001=4DcvwjLn5Wm7GekEDSs7GOdg06uhjGdg02g7GearBSagOsYg8GajByZul7wkBCN2U2chJGIjN6uhDrxn5GIvNquhHJxgU3g7GearBSoD/GagM6wtByZuVHZgkWm7GuT+AHP"]'></div></div></body></html>`;
    const dom = new JSDOM(html);

    expect(unprotectHakoContent(dom.window.document)).toBe(1);
    expect(dom.window.document.querySelector('#chapter-content')?.textContent).toContain(
      'mã hoá kiểu đảo ngược base64'
    );
  });

  it('decodes a plain base64 payload when data-s is "none" or absent', () => {
    const html = `<html><body><div id="chapter-content"><div id="chapter-c-protected" data-c='["0001PHA+TuG7mWkgZHVuZyBjaOG7iSBtw6MgaG/DoSBiYXNlNjQgxJHGoW4gZ2nhuqNuIGtow7RuZyBjw7MgbOG7m3AgWE9SIG7DoG8gY+G6oy48L3A+"]'></div></div></body></html>`;
    const dom = new JSDOM(html);

    expect(unprotectHakoContent(dom.window.document)).toBe(1);
    expect(dom.window.document.querySelector('#chapter-content')?.textContent).toContain(
      'chỉ mã hoá base64 đơn giản'
    );
  });

  it('strips literal [noteN] footnote markers from the decoded text', () => {
    const html = `<html><body><div id="chapter-c-protected" data-c='["0001UGjhuqduIGNow7ogW25vdGUxXSB24bqrbiDEkeG7jWMgxJHGsOG7o2Mu"]'></div></body></html>`;
    const dom = new JSDOM(html);

    unprotectHakoContent(dom.window.document);

    expect(dom.window.document.body.textContent).not.toContain('[note1]');
  });

  it('is a safe no-op when there is no protected element (already-plain chapters keep working)', () => {
    const html = '<html><body><div id="chapter-content"><p>Nội dung đã ở dạng văn bản thường.</p></div></body></html>';
    const dom = new JSDOM(html);

    expect(unprotectHakoContent(dom.window.document)).toBe(0);
    expect(dom.window.document.querySelector('#chapter-content')?.textContent).toContain(
      'Nội dung đã ở dạng văn bản thường'
    );
  });

  it('is a safe no-op on malformed data-c JSON instead of throwing', () => {
    const html = `<html><body><div id="chapter-c-protected" data-c="not valid json"></div></body></html>`;
    const dom = new JSDOM(html);

    expect(() => unprotectHakoContent(dom.window.document)).not.toThrow();
    expect(unprotectHakoContent(dom.window.document)).toBe(0);
  });

  it('leaves an xor_shuffle payload undecoded (empty) if data-k is missing', () => {
    const html = `<html><body><div id="chapter-c-protected" data-s="xor_shuffle" data-c='["0001SBVNsPsKmIuTXVQOGpXQ5hQRRluV3t5UHw2YipsTHAQaVAwMuotCExqEyO0CRR1EXFRUE7XEit7aRRJdE6PDldDEF1YS9+WEyO1LAbqRWxMAhMjlAkUNWVvSz+YGVAaEwqhGEwAXt/cGRRLyjxMAhMjFRVlWQQw="]'></div></body></html>`;
    const dom = new JSDOM(html);

    expect(unprotectHakoContent(dom.window.document)).toBe(0);
  });
});
