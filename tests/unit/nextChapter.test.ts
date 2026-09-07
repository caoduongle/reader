import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { findNextChapterUrl } from '../../server/lib/nextChapter';

const BASE_URL = 'https://example-novel.test/truyen/chuong-10';

describe('findNextChapterUrl', () => {
  it('prefers <link rel="next"> in <head> when present', () => {
    const html = `
      <html>
        <head><link rel="next" href="/truyen/chuong-11"></head>
        <body><a class="next-chap" href="/truyen/chuong-99">Sau</a></body>
      </html>
    `;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBe(
      'https://example-novel.test/truyen/chuong-11'
    );
  });

  it('falls back to <a rel="next"> in the body', () => {
    const html = `<html><body><a rel="next" href="/truyen/chuong-11">&gt;</a></body></html>`;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBe(
      'https://example-novel.test/truyen/chuong-11'
    );
  });

  it('uses adapter-provided selectors for icon-only next buttons with no matching text', () => {
    const html = `
      <html>
        <body>
          <div class="chapter-nav">
            <a href="/truyen/chuong-9"><svg></svg></a>
            <a id="chapter-nav-next" href="/truyen/chuong-11"><svg></svg></a>
          </div>
        </body>
      </html>
    `;
    const dom = new JSDOM(html);
    const adapter = { nextChapterSelectors: ['#chapter-nav-next'] };
    expect(findNextChapterUrl(dom.window.document, BASE_URL, adapter)).toBe(
      'https://example-novel.test/truyen/chuong-11'
    );
  });

  it('matches Vietnamese "chương sau" / "tiếp theo" wording in link text', () => {
    const html = `<html><body><a href="/truyen/chuong-11">Chương sau</a></body></html>`;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBe(
      'https://example-novel.test/truyen/chuong-11'
    );
  });

  it('matches English "next chapter" wording via aria-label when there is no visible text', () => {
    const html = `<html><body><a href="/truyen/chuong-11" aria-label="Next Chapter"><i class="icon-right"></i></a></body></html>`;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBe(
      'https://example-novel.test/truyen/chuong-11'
    );
  });

  it('falls back to class/id naming heuristics for icon-only buttons with no adapter', () => {
    const html = `<html><body><a class="next_chap" href="/truyen/chuong-11"><svg></svg></a></body></html>`;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBe(
      'https://example-novel.test/truyen/chuong-11'
    );
  });

  it('returns undefined when no next-chapter link exists by any strategy', () => {
    const html = `<html><body><article><p>Bài viết độc lập không có điều hướng chương.</p></article></body></html>`;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBeUndefined();
  });

  it('ignores non-http(s) hrefs like javascript: pseudo-links', () => {
    const html = `<html><body><a href="javascript:void(0)" rel="next">Chương sau</a></body></html>`;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBeUndefined();
  });

  it('resolves relative hrefs against the provided base URL', () => {
    const html = `<html><body><a href="chuong-11">Chương sau</a></body></html>`;
    const dom = new JSDOM(html);
    expect(findNextChapterUrl(dom.window.document, BASE_URL, null)).toBe(
      'https://example-novel.test/truyen/chuong-11'
    );
  });
});
