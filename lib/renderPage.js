import { assertPublicHost } from './ssrfGuard.js';
import { BROWSER_HEADERS } from './safeFetch.js';

/**
 * Custom error class for renderHtmlWithBrowser errors.
 * Mirrors SafeFetchError's shape (message + HTTP status) so server.js
 * can handle both the same way.
 */
export class RenderError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'RenderError';
    this.status = status;
  }
}

// Lazily-loaded Playwright module + shared browser instance.
// Playwright (and its downloaded Chromium binary) is a large optional
// dependency: if it isn't installed, or the browser binary hasn't been
// downloaded via `npx playwright install chromium`, every render attempt
// fails fast with a clear RenderError instead of crashing the process.
let chromiumModulePromise = null;
let browserPromise = null;

async function getChromiumModule() {
  if (!chromiumModulePromise) {
    chromiumModulePromise = import('playwright').catch(() => {
      chromiumModulePromise = null;
      throw new RenderError(
        'Chưa cài đặt trình duyệt ảo (Playwright) trên máy chủ nên không thể tải các trang web cần JavaScript.',
        503
      );
    });
  }
  return chromiumModulePromise;
}

async function getBrowser() {
  if (!browserPromise) {
    const { chromium } = await getChromiumModule();
    browserPromise = chromium
      .launch({
        headless: true,
        // --no-sandbox is required in most CI/Docker/root environments;
        // the process itself is still confined by the OS/container, and
        // every navigated request is separately re-validated below.
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      .catch(err => {
        browserPromise = null;
        throw new RenderError(
          `Không thể khởi động trình duyệt ảo để hiển thị trang động: ${err?.message || err}`,
          503
        );
      });
  }
  return browserPromise;
}

/**
 * Renders a URL in a headless Chromium browser (executing JavaScript) and
 * returns the fully-rendered HTML. Used as a fallback for pages whose main
 * content is injected client-side (SPA-style novel/article readers) and
 * therefore invisible to a plain HTTP fetch.
 *
 * Security: every single request the page makes (navigation, XHR/fetch,
 * scripts, stylesheets) is re-validated through the same `assertPublicHost`
 * SSRF guard used by `safeFetchHtml`, so page JavaScript cannot be used to
 * pivot into internal/private network resources. Images/media/fonts are
 * dropped outright (perf + reduced SSRF surface); hostnames are cached for
 * the lifetime of the render call to avoid repeat DNS lookups.
 *
 * @param {string} initialUrl
 * @param {object} [options]
 * @param {number} [options.timeoutMs=20000] Hard cap for navigation + hydration.
 * @param {number} [options.maxHtmlBytes=8388608] Refuse to return HTML larger than this (8MB default).
 * @returns {Promise<{ html: string, finalUrl: string }>}
 */
export async function renderHtmlWithBrowser(
  initialUrl,
  { timeoutMs = 20000, maxHtmlBytes = 8 * 1024 * 1024 } = {}
) {
  let parsedUrl;
  try {
    parsedUrl = new URL(initialUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
  } catch {
    throw new RenderError('Địa chỉ liên kết (URL) không hợp lệ để hiển thị bằng trình duyệt ảo.', 400);
  }

  await assertPublicHostOrThrow(parsedUrl.hostname);

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: BROWSER_HEADERS['User-Agent'],
    locale: 'vi-VN',
    javaScriptEnabled: true,
    ignoreHTTPSErrors: false,
  });

  // Defense-in-depth SSRF guard for every sub-request the rendered page
  // issues (scripts calling internal APIs, redirects, etc.), not just the
  // initial navigation. Hostnames are memoized to keep this cheap.
  const verifiedHosts = new Set([parsedUrl.hostname.toLowerCase()]);
  const blockedHosts = new Set();

  await context.route('**/*', async route => {
    const request = route.request();
    const resourceType = request.resourceType();

    if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
      return route.abort();
    }

    let reqUrl;
    try {
      reqUrl = new URL(request.url());
    } catch {
      return route.abort();
    }

    if (reqUrl.protocol === 'data:' || reqUrl.protocol === 'blob:') {
      return route.continue();
    }
    if (reqUrl.protocol !== 'http:' && reqUrl.protocol !== 'https:') {
      return route.abort();
    }

    const host = reqUrl.hostname.toLowerCase();
    if (blockedHosts.has(host)) return route.abort();
    if (!verifiedHosts.has(host)) {
      try {
        await assertPublicHost(host);
        verifiedHosts.add(host);
      } catch {
        blockedHosts.add(host);
        return route.abort();
      }
    }

    return route.continue();
  });

  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  try {
    await page.goto(parsedUrl.toString(), { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Give client-rendered frameworks a chance to hydrate/fetch their
    // content. `networkidle` is best-effort only (soft-caught) because
    // pages with polling/ads/analytics may never go fully idle.
    await page.waitForLoadState('networkidle', { timeout: Math.min(8000, timeoutMs) }).catch(() => {});
    await page.waitForTimeout(400);

    const html = await page.content();
    if (Buffer.byteLength(html, 'utf-8') > maxHtmlBytes) {
      throw new RenderError(
        `Trang web sau khi hiển thị vượt quá giới hạn dung lượng cho phép (tối đa ${Math.round(
          maxHtmlBytes / (1024 * 1024)
        )}MB).`,
        400
      );
    }

    const finalUrl = page.url();
    return { html, finalUrl };
  } catch (err) {
    if (err instanceof RenderError) throw err;
    const msg = err && err.message ? String(err.message) : String(err);
    if (/Timeout|timeout/.test(msg)) {
      throw new RenderError(
        `Quá thời gian chờ hiển thị trang động bằng trình duyệt ảo (${Math.round(timeoutMs / 1000)} giây).`,
        504
      );
    }
    throw new RenderError('Không thể hiển thị trang bằng trình duyệt ảo (headless browser).', 502);
  } finally {
    await context.close().catch(() => {});
  }
}

async function assertPublicHostOrThrow(hostname) {
  try {
    await assertPublicHost(hostname);
  } catch {
    throw new RenderError('Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.', 400);
  }
}

/**
 * Closes the shared browser instance, if one was launched. Intended for
 * graceful shutdown (tests, server exit) — not required for normal request
 * handling since the browser is reused across requests for performance.
 */
export async function closeSharedBrowser() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      await browser.close();
    } catch {
      // ignore
    } finally {
      browserPromise = null;
    }
  }
}
