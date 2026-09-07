/**
 * Site-Specific Extraction Adapters
 *
 * Generic extraction (@mozilla/readability) works well for most articles,
 * but some novel/chapter-reading sites wrap their text in heavy chrome
 * (footnote links, ad banners, comment widgets) that can confuse
 * Readability's link-density heuristics, or render the chapter body via
 * client-side JavaScript entirely (see lib/renderPage.js for that case).
 *
 * An "adapter" is just a bundle of best-effort CSS selector *candidates* —
 * never a hard requirement. Every selector list is tried in order and the
 * first one that yields enough text wins; if none match (e.g. the site
 * redesigns its markup), extraction silently falls through to Readability
 * and then to the AI fallback in server.js. Nothing breaks from a stale
 * selector — it just stops helping until updated.
 *
 * To support another site, add an entry to ADAPTERS. `hostnames` accepts
 * plain hostnames (matched exact or as a subdomain) or RegExp.
 */

export const ADAPTERS = [
  {
    id: 'docln-hako',
    // docln.sbs / docln.net / ln.hako.vn are the same "Hako" light-novel
    // platform under different domains (it rotates domains periodically).
    // Its chapter body is hydrated client-side, so this adapter is mainly
    // useful *after* lib/renderPage.js has produced rendered HTML.
    hostnames: [/(^|\.)docln\.(sbs|net)$/i, /(^|\.)ln\.hako\.(vn|re)$/i],
    requiresRender: true,
    contentSelectors: ['#chapter-content', '.chapter-content', '[id^="chapter-content"]'],
    removeSelectors: [
      'script',
      'style',
      'iframe',
      '.ads',
      '.ad',
      '.donate',
      '.chapter-note-item .note-actions',
      'a[href*="shopee"]',
    ],
    nextChapterSelectors: [
      'a[rel="next"]',
      '#chapter-nav-next',
      '.chapter-nav a.next-chap',
      'a.next_chap',
      'a[href*="next"]',
    ],
  },
  {
    id: 'zuminovel',
    hostnames: [/(^|\.)zuminovel\.com$/i],
    requiresRender: false,
    contentSelectors: ['.chapter-content', '#chapter-content', 'article .content', '.entry-content'],
    removeSelectors: ['script', 'style', '.ads', '.share', '.comment', '#comment'],
    nextChapterSelectors: ['a[rel="next"]', 'a.next-chap', '.nav-next a', 'a[href*="next"]'],
  },
  {
    // A handful of other common Vietnamese novel-aggregator templates that
    // share very similar markup conventions. Best-effort only — extend
    // freely as you hit more "similar sites".
    id: 'common-vn-novel-templates',
    hostnames: [
      /(^|\.)truyenfull\.vision$/i,
      /(^|\.)truyenfull\.io$/i,
      /(^|\.)metruyenchu\.com\.vn$/i,
      /(^|\.)truyenwikidich\.net$/i,
    ],
    requiresRender: false,
    contentSelectors: ['#chapter-c', '.chapter-c', '#chapter-content', '.chr-c', '.chapter-content'],
    removeSelectors: ['script', 'style', '.ads', '.ad-container', '.box-ads'],
    nextChapterSelectors: ['a[rel="next"]', '#next_chap', '.next_chap', 'a[href*="next"]'],
  },
];

/**
 * Finds the best-matching adapter for a hostname, if any.
 * @param {string} hostname
 * @returns {object|null}
 */
export function findAdapter(hostname) {
  if (!hostname) return null;
  const normalized = hostname.toLowerCase();
  return (
    ADAPTERS.find(adapter =>
      (adapter.hostnames || []).some(pattern =>
        pattern instanceof RegExp ? pattern.test(normalized) : normalized === pattern.toLowerCase()
      )
    ) || null
  );
}

/**
 * Attempts extraction using an adapter's candidate content selectors.
 * Returns null (never throws) if the adapter has no selectors or none
 * of them match enough text, so callers can fall through to Readability.
 *
 * @param {Document} document A JSDOM document (or any DOM Document).
 * @param {object|null} adapter
 * @param {number} [minLength=100]
 * @returns {{ html: string, text: string } | null}
 */
export function extractWithAdapter(document, adapter, minLength = 100) {
  if (!adapter || !Array.isArray(adapter.contentSelectors)) return null;

  for (const selector of adapter.contentSelectors) {
    let el;
    try {
      el = document.querySelector(selector);
    } catch {
      continue; // invalid selector shouldn't crash extraction
    }
    if (!el) continue;

    const clone = el.cloneNode(true);
    for (const removeSelector of adapter.removeSelectors || []) {
      try {
        clone.querySelectorAll(removeSelector).forEach(node => node.remove());
      } catch {
        // ignore invalid/no-op remove selectors
      }
    }

    const text = (clone.textContent || '').trim();
    if (text.length >= minLength) {
      return { html: clone.innerHTML, text };
    }
  }

  return null;
}
