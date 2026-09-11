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
    // Its chapter body is NOT plain hydrated-client-side HTML — the real
    // text ships obfuscated inside #chapter-c-protected in the *first*
    // static response, and preprocessDocument (unprotectHakoContent, below)
    // decodes it before any selector below ever runs. requiresRender is
    // kept only as a safety-net label in case the site changes its
    // obfuscation scheme again and the decode below silently no-ops.
    hostnames: [/(^|\.)docln\.(sbs|net)$/i, /(^|\.)ln\.hako\.(vn|re)$/i],
    requiresRender: true,
    preprocessDocument: unprotectHakoContent,
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

/**
 * Decodes Hako/DocLN's "protected" chapter-content placeholder back into
 * real HTML, in place, on a JSDOM document.
 *
 * docln.sbs / docln.net / ln.hako.vn no longer put chapter text directly
 * under #chapter-content. They nest a
 * `<div id="chapter-c-protected" data-s="..." data-k="..." data-c="[...]">`
 * placeholder inside it instead. `data-c` is a JSON array of string chunks;
 * each chunk starts with a 4-digit numeric prefix (the chunks don't arrive
 * in order — the prefix is what you sort by) followed by a base64 payload
 * that — depending on `data-s` — may additionally be reversed
 * ("base64_reverse") or XOR'd byte-for-byte against the repeating `data-k`
 * key ("xor_shuffle") before/after the base64 step. The site's own
 * front-end JS decodes this client-side to populate the reader (including
 * its own built-in "Text-to-Speech" experiment); a plain fetch never runs
 * that script, so every downstream extraction pass — adapter selectors,
 * Readability, even the AI fallback — was working from a near-empty shell
 * for this site specifically.
 *
 * This re-implements the same three strategies already reverse-engineered,
 * independently of each other, by two current open-source projects that
 * target this exact site:
 *   - https://github.com/tachibana-shin/hako-epub-extension (registry/hako.ts)
 *   - https://github.com/AzenKain/EPUB-Forge (extensions/origin/hako2epub.js)
 * Both landing on the same data-s/data-k/data-c shape independently is
 * good cross-confirmation this is docln's actual current scheme.
 *
 * Crucially, no live JavaScript execution is required: the encoded text is
 * already sitting in the very first static HTML response, so this can (and
 * should) run on the fast safeFetchHtml() path — no need to reach for the
 * much slower/heavier headless-render fallback for this site at all,
 * unless docln changes the scheme again and this quietly starts no-op'ing.
 *
 * Mutates `document` in place. Safe no-op if no protected block is found
 * or a payload doesn't parse, so it's fine to call unconditionally ahead
 * of any extraction step.
 *
 * @param {Document} document A JSDOM document.
 * @returns {number} Number of protected blocks successfully decoded.
 */
export function unprotectHakoContent(document) {
  let decodedCount = 0;
  if (!document || typeof document.querySelectorAll !== 'function') return decodedCount;

  const protectedEls = document.querySelectorAll('#chapter-c-protected, [id^="chapter-c-protected"]');

  protectedEls.forEach(el => {
    try {
      const strategy = el.getAttribute('data-s') || 'none';
      const key = el.getAttribute('data-k') || '';
      const rawChunks = el.getAttribute('data-c');
      if (!rawChunks) return;

      const chunks = JSON.parse(rawChunks);
      if (!Array.isArray(chunks) || chunks.length === 0) return;

      const ordered = [...chunks].sort(
        (a, b) => parseInt(String(a).slice(0, 4), 10) - parseInt(String(b).slice(0, 4), 10)
      );

      const decodedHtml = ordered
        .map(chunk => decodeHakoChunk(String(chunk).slice(4), strategy, key))
        .join('')
        // Translator footnote markers are meaningless as bare text without
        // the site's own footnote popover — strip them rather than have
        // the TTS voice read "[note3]" aloud mid-sentence.
        .replace(/\[note\d+\]/gi, '');

      if (!decodedHtml) return;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = decodedHtml;
      el.replaceWith(...Array.from(wrapper.childNodes));
      decodedCount += 1;
    } catch {
      // Unknown/malformed payload (site changed its scheme again) — leave
      // the element as-is; Readability/headless-render/AI fallbacks in
      // server.js still get a chance to handle it.
    }
  });

  return decodedCount;
}

/**
 * @param {string} payload base64 chunk payload with its 4-digit sort prefix already stripped.
 * @param {string} strategy 'none' | 'base64_reverse' | 'xor_shuffle'
 * @param {string} key XOR key, only used when strategy === 'xor_shuffle'.
 * @returns {string}
 */
function decodeHakoChunk(payload, strategy, key) {
  const prepared = strategy === 'base64_reverse' ? payload.split('').reverse().join('') : payload;
  const bytes = Buffer.from(prepared, 'base64');

  if (strategy === 'xor_shuffle') {
    if (!key) return '';
    const out = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      out[i] = bytes[i] ^ key.charCodeAt(i % key.length);
    }
    return out.toString('utf-8');
  }

  return bytes.toString('utf-8');
}
