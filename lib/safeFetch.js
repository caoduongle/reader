import { assertPublicHost } from './ssrfGuard.js';
import { JSDOM } from 'jsdom';

/**
 * Custom error class for safeFetchHtml errors
 */
export class SafeFetchError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'SafeFetchError';
    this.status = status;
  }
}

/**
 * Realistic modern browser headers (Chrome 124 Windows Desktop)
 * Completely omits VoxRead token to avoid WAF blocking.
 */
export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

const ALLOWED_CONTENT_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain'];

/**
 * Safely fetches an HTML webpage with:
 * 1. Multi-hop redirect tracking with SSRF assertPublicHost() on every hop.
 * 2. Content-Type header validation (HTML/text only).
 * 3. Streaming response body getReader() with strict 5MB size limit (cancels stream immediately).
 * 4. Stream-safe UTF-8 multibyte boundary decoding.
 * 5. Authentic Chrome 124 desktop headers.
 *
 * @param {string} initialUrl
 * @param {object} [options]
 * @param {number} [options.maxRedirects=5]
 * @param {number} [options.maxSizeBytes=5242880] 5MB
 * @param {number} [options.timeoutMs=15000] 15s
 * @returns {Promise<{ html: string, finalUrl: string, response: Response }>}
 */
export async function safeFetchHtml(
  initialUrl,
  {
    maxRedirects = 5,
    maxSizeBytes = 5 * 1024 * 1024,
    timeoutMs = 15000,
  } = {}
) {
  let currentUrl = initialUrl.trim();
  let redirectCount = 0;
  let response;

  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  while (true) {
    let parsedUrl;
    try {
      parsedUrl = new URL(currentUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new SafeFetchError(
        'Địa chỉ liên kết (URL) không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://.',
        400
      );
    }

    // SSRF Check on EVERY hop before requesting
    try {
      await assertPublicHost(parsedUrl.hostname);
    } catch {
      throw new SafeFetchError(
        'Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.',
        400
      );
    }

    try {
      response = await fetch(parsedUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: BROWSER_HEADERS,
        signal: timeoutSignal,
      });
    } catch (fetchErr) {
      if (
        fetchErr &&
        (fetchErr.name === 'TimeoutError' ||
          fetchErr.name === 'AbortError' ||
          (fetchErr.message && fetchErr.message.includes('timeout')))
      ) {
        throw new SafeFetchError(
          `Quá thời gian chờ tải trang (${Math.round(timeoutMs / 1000)} giây). Vui lòng thử lại sau hoặc kiểm tra đường truyền mạng.`,
          504
        );
      }
      throw fetchErr;
    }

    // Check for HTTP redirect status codes
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new SafeFetchError(
          `Trang web chuyển hướng quá nhiều lần (tối đa ${maxRedirects} lần).`,
          400
        );
      }

      const location = response.headers.get('location');
      if (!location || !location.trim()) {
        throw new SafeFetchError(
          'Phản hồi chuyển hướng không hợp lệ (thiếu header Location).',
          400
        );
      }

      // Resolve relative redirects against current URL
      try {
        currentUrl = new URL(location.trim(), currentUrl).toString();
      } catch {
        throw new SafeFetchError(
          'Địa chỉ chuyển hướng (Location) không hợp lệ.',
          400
        );
      }

      // Discard redirect response body if any to free resources
      if (response.body) {
        try {
          await response.body.cancel();
        } catch {
          // ignore
        }
      }

      continue;
    }

    // Not a redirect - break out of the loop
    break;
  }

  // Check HTTP response status
  if (!response.ok) {
    const status = response.status >= 500 ? 502 : response.status;
    throw new SafeFetchError(
      `Không thể tải trang web (mã lỗi HTTP ${response.status}). Trang web có thể bị chặn hoặc không tồn tại.`,
      status
    );
  }

  // Pre-flight Content-Type validation
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isAllowedType = ALLOWED_CONTENT_TYPES.some(type => contentType.includes(type));
  if (!isAllowedType) {
    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        // ignore
      }
    }
    throw new SafeFetchError(
      'Chỉ hỗ trợ đọc nội dung từ trang web HTML hoặc văn bản.',
      400
    );
  }

  // If no body present
  if (!response.body) {
    return {
      html: '',
      finalUrl: currentUrl,
      response,
    };
  }

  // Streaming body reader with strict 5MB limit
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let totalBytes = 0;
  let html = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxSizeBytes) {
        await reader.cancel();
        throw new SafeFetchError(
          `Dung lượng trang web vượt quá giới hạn cho phép (tối đa ${Math.round(maxSizeBytes / (1024 * 1024))}MB).`,
          400
        );
      }

      html += decoder.decode(value, { stream: true });
    }
    // Flush remaining buffer
    html += decoder.decode();
  } catch (streamErr) {
    if (streamErr instanceof SafeFetchError) {
      throw streamErr;
    }
    if (
      streamErr &&
      (streamErr.name === 'TimeoutError' ||
        streamErr.name === 'AbortError' ||
        (streamErr.message && streamErr.message.includes('timeout')))
    ) {
      throw new SafeFetchError(
        `Quá thời gian chờ tải trang (${Math.round(timeoutMs / 1000)} giây). Vui lòng thử lại sau hoặc kiểm tra đường truyền mạng.`,
        504
      );
    }
    throw streamErr;
  }

  return {
    html,
    finalUrl: currentUrl,
    response,
  };
}

/**
 * Converts HTML content into structured plain text, preserving \n\n paragraph
 * boundaries across block elements (p, h1-h6, div, blockquote, li) and \n for <br>.
 *
 * @param {string} htmlContent
 * @param {Document|JSDOM} [domOrDoc]
 * @returns {string}
 */
export function htmlToParagraphText(htmlContent, domOrDoc) {
  if (!htmlContent || typeof htmlContent !== 'string') return '';

  let doc;
  if (domOrDoc) {
    doc = domOrDoc.window ? domOrDoc.window.document : domOrDoc;
  } else {
    doc = new JSDOM('').window.document;
  }

  const container = doc.createElement('div');
  container.innerHTML = htmlContent;

  // 1. Replace <br> tags with newline text nodes
  const brElements = container.querySelectorAll('br');
  brElements.forEach(br => {
    br.replaceWith(doc.createTextNode('\n'));
  });

  // 2. Prepend & append \n\n to block elements
  const blockSelectors = 'p, h1, h2, h3, h4, h5, h6, div, blockquote, li, article, section, hr';
  const blockElements = container.querySelectorAll(blockSelectors);
  blockElements.forEach(el => {
    el.before(doc.createTextNode('\n\n'));
    el.after(doc.createTextNode('\n\n'));
  });

  // 3. Extract textContent
  let text = container.textContent || '';

  // 4. Normalize line breaks and whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Collapse multiple spaces or tabs per line, but keep newlines
  const lines = text.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim());
  text = lines.join('\n');

  // Collapse 3 or more consecutive newlines into exactly \n\n
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}
