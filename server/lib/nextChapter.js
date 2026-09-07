/**
 * Next-Chapter Navigation Link Discovery
 *
 * Tries several strategies, in order of reliability, and returns the first
 * one that resolves to a valid absolute http(s) URL:
 *
 *   1. `<link rel="next" href="...">` in <head> — explicit pagination hint.
 *   2. `<a rel="next" href="...">` anywhere in the body.
 *   3. Site-adapter-provided CSS selectors (server/lib/siteAdapters.js),
 *      since many reader sites use icon-only "next" buttons with no
 *      matching visible text for strategy 4 to find.
 *   4. Visible text / title / aria-label matching common "next chapter"
 *      wording in Vietnamese and English.
 *   5. Class/id naming heuristics (e.g. "next-chap", "chuong-sau") for
 *      icon-only buttons an adapter doesn't already cover.
 *
 * Exported as a pure function of (document, finalUrl, adapter) so it can be
 * unit-tested without spinning up the Express server or a real fetch.
 */

const TEXT_REGEX = /(?:chương\s*(?:sau|tiếp)|tiếp\s*theo|next\s*chapter|chap\s*sau|next\s*chap\b)/i;
const NAME_REGEX = /next[-_]?(chap|chapter)?|chap[-_]?next|chuong[-_]?sau|chapsau/i;

function resolveHref(href, baseUrl) {
  if (!href || !href.trim()) return null;
  try {
    const resolved = new URL(href.trim(), baseUrl);
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.toString();
    }
  } catch {
    // ignore malformed href
  }
  return null;
}

/**
 * @param {Document} document
 * @param {string} finalUrl Base URL for resolving relative hrefs.
 * @param {object|null} [adapter] Optional site adapter (see siteAdapters.js).
 * @returns {string|undefined}
 */
export function findNextChapterUrl(document, finalUrl, adapter) {
  if (!document) return undefined;

  // 1. <link rel="next"> in <head>.
  const linkNext = document.querySelector('link[rel="next"][href]');
  if (linkNext) {
    const resolved = resolveHref(linkNext.getAttribute('href'), finalUrl);
    if (resolved) return resolved;
  }

  // 2. <a rel="next">.
  const relNextAnchor = document.querySelector('a[rel="next"][href]');
  if (relNextAnchor) {
    const resolved = resolveHref(relNextAnchor.getAttribute('href'), finalUrl);
    if (resolved) return resolved;
  }

  // 3. Adapter-provided selectors (handles icon-only "next" buttons).
  if (adapter && Array.isArray(adapter.nextChapterSelectors)) {
    for (const selector of adapter.nextChapterSelectors) {
      let el;
      try {
        el = document.querySelector(selector);
      } catch {
        continue;
      }
      if (!el) continue;
      const resolved = resolveHref(el.getAttribute('href'), finalUrl);
      if (resolved) return resolved;
    }
  }

  // 4 & 5. Scan all anchors: visible text/title/aria-label, then class/id.
  const anchors = Array.from(document.querySelectorAll('a[href]'));

  const byText = anchors.find(a => {
    const text = a.textContent || '';
    const titleAttr = a.getAttribute('title') || '';
    const ariaLabel = a.getAttribute('aria-label') || '';
    return TEXT_REGEX.test(text) || TEXT_REGEX.test(titleAttr) || TEXT_REGEX.test(ariaLabel);
  });
  if (byText) {
    const resolved = resolveHref(byText.getAttribute('href'), finalUrl);
    if (resolved) return resolved;
  }

  const byName = anchors.find(a => {
    const className = typeof a.className === 'string' ? a.className : '';
    const id = a.getAttribute('id') || '';
    return NAME_REGEX.test(className) || NAME_REGEX.test(id);
  });
  if (byName) {
    const resolved = resolveHref(byName.getAttribute('href'), finalUrl);
    if (resolved) return resolved;
  }

  return undefined;
}
