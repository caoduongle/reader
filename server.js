import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { GoogleGenAI } from '@google/genai';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Security modules & middleware
import { safeFetchHtml, SafeFetchError, htmlToParagraphText } from './lib/safeFetch.js';
import { renderHtmlWithBrowser, RenderError } from './lib/renderPage.js';
import {
  aiRateLimiter,
  fetchUrlRateLimiter,
  globalRateLimiter,
} from './server/middleware/rateLimiter.js';
import { validateBody } from './server/middleware/validate.js';
import {
  generateSchema,
  fetchUrlSchema,
  ocrSchema,
} from './server/validators/apiSchemas.js';
import { sanitizeContent } from './server/lib/sanitizer.js';
import { validateBase64Image } from './server/middleware/uploadGuard.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { findAdapter, extractWithAdapter } from './server/lib/siteAdapters.js';
import { findNextChapterUrl } from './server/lib/nextChapter.js';

// Minimum extracted-text length (characters) below which content is
// considered "not enough" and the next fallback tier kicks in. Shared by
// the adapter/Readability pass, the headless-render pass, and the AI pass.
const MIN_CONTENT_LENGTH = 100;

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const HOST = '127.0.0.1'; // BIND STRICTLY TO 127.0.0.1 (SECURITY)

// FR-001: Do not leak Express fingerprint
app.disable('x-powered-by');

// FR-018: Add Comprehensive HTTP Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'http://127.0.0.1:*', 'http://localhost:*'],
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:', 'data:'],
        frameAncestors: ["'none'"], // Clickjacking protection (X-Frame-Options: DENY)
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true, // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Standard browser feature restriction (FR-017)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Limit JSON payload strictly to 15MB
app.use(express.json({ limit: '15mb' }));

// Whitelist of trusted origins allowed to access proxy routes
// 'null' is the serialized Origin header sent by Chromium/Electron when loading pages via file:// in packaged builds
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'null',
]);

// CORS configuration enforcing origin whitelist
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// FR-011: Global rate limiter on all API endpoints
app.use('/api', globalRateLimiter);

// Health check endpoint (Public)
app.get('/health', (req, res) => {
  const rawKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(rawKey && rawKey.trim() !== '' && rawKey !== 'MY_GEMINI_API_KEY');

  res.json({
    status: 'ok',
    service: 'voxread-gemini-proxy',
    geminiConfigured: isConfigured,
    timestamp: new Date().toISOString(),
  });
});

// Secure proxy generation endpoint (FR-006, FR-011, FR-014)
app.post(
  '/api/generate',
  aiRateLimiter,
  validateBody(generateSchema),
  async (req, res, next) => {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey || rawKey.trim() === '' || rawKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        ok: false,
        error:
          'GEMINI_API_KEY is not configured on server. Please add a valid key to your local .env file.',
      });
    }

    const { prompt, model = 'gemini-2.5-flash', systemInstruction } = req.body;

    try {
      const ai = new GoogleGenAI({ apiKey: rawKey.trim() });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      res.json({
        ok: true,
        text: response.text,
        modelUsed: model,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Runs one extraction pass over an HTML string: parses it once with JSDOM,
 * discovers the "next chapter" link *before* Readability gets a chance to
 * mutate the document, then tries the site-adapter selectors and finally
 * Readability for the article body itself.
 *
 * @param {string} html
 * @param {string} finalUrl
 * @param {object|null} adapter
 * @returns {{ dom: JSDOM, extraction: object|null, nextChapterUrl: string|undefined }}
 */
function processHtml(html, finalUrl, adapter) {
  const dom = new JSDOM(html, { url: finalUrl });
  const document = dom.window.document;

  // Must run before any extraction step, since Readability.parse() mutates
  // the document it's given (removes scripts/"unlikely" nodes in place).
  const nextChapterUrl = findNextChapterUrl(document, finalUrl, adapter);

  let extraction = null;

  // 1. Site-adapter selectors first — bypasses Readability's link-density
  //    scoring, which can discard footnote- or ad-heavy chapter bodies.
  const adapterResult = extractWithAdapter(document, adapter, MIN_CONTENT_LENGTH);
  if (adapterResult) {
    const formattedText = htmlToParagraphText(adapterResult.html, dom);
    if (formattedText.length >= MIN_CONTENT_LENGTH) {
      extraction = {
        title: document.title || undefined,
        content: formattedText,
        sanitizedHtml: sanitizeContent(adapterResult.html),
        byline: undefined,
        siteName: undefined,
      };
    }
  }

  // 2. Generic Readability extraction (also acts as the fallback when an
  //    adapter's selectors don't match, or there's no adapter at all).
  if (!extraction) {
    const reader = new Readability(document);
    const article = reader.parse();
    if (article && (article.content || article.textContent)) {
      const formattedText = htmlToParagraphText(article.content || article.textContent, dom);
      if (formattedText.length >= MIN_CONTENT_LENGTH) {
        extraction = {
          title: article.title,
          content: formattedText,
          sanitizedHtml: sanitizeContent(article.content || article.textContent),
          byline: article.byline || undefined,
          siteName: article.siteName || undefined,
        };
      }
    }
  }

  return { dom, extraction, nextChapterUrl };
}

// Web article extraction endpoint: site adapters + Mozilla Readability,
// escalating to a headless-browser render for JS-hydrated pages, with
// Gemini AI as the last-resort fallback.
app.post(
  '/api/fetch-url',
  fetchUrlRateLimiter,
  validateBody(fetchUrlSchema),
  async (req, res, next) => {
    const { url } = req.body;

    let fetchResult;
    try {
      fetchResult = await safeFetchHtml(url);
    } catch (err) {
      if (err instanceof SafeFetchError) {
        return res.status(err.status).json({
          ok: false,
          error: err.message,
        });
      }
      return next(err);
    }

    let { html, finalUrl } = fetchResult;
    let parsedFinalUrl;
    try {
      parsedFinalUrl = new URL(finalUrl);
    } catch {
      parsedFinalUrl = new URL(url);
    }

    let adapter = findAdapter(parsedFinalUrl.hostname);
    let { dom, extraction, nextChapterUrl } = processHtml(html, finalUrl, adapter);
    let renderedWithBrowser = false;

    // Escalate to a headless browser only when the fast static-fetch path
    // wasn't enough — this keeps the common case (plain server-rendered
    // articles/chapters) exactly as fast/light as before. Sites that hydrate
    // their content client-side (e.g. docln.sbs) will always land here.
    if (!extraction || extraction.content.length < MIN_CONTENT_LENGTH) {
      try {
        const rendered = await renderHtmlWithBrowser(finalUrl);
        html = rendered.html;
        finalUrl = rendered.finalUrl;
        try {
          parsedFinalUrl = new URL(finalUrl);
        } catch {
          // keep the previous parsedFinalUrl if the rendered URL is odd
        }
        adapter = findAdapter(parsedFinalUrl.hostname) || adapter;

        const renderedResult = processHtml(html, finalUrl, adapter);
        dom = renderedResult.dom;
        nextChapterUrl = renderedResult.nextChapterUrl || nextChapterUrl;
        if (
          renderedResult.extraction &&
          renderedResult.extraction.content.length >= (extraction?.content.length || 0)
        ) {
          extraction = renderedResult.extraction;
        }
        renderedWithBrowser = true;
      } catch (renderErr) {
        // Playwright not installed, browser launch failed, navigation timed
        // out, etc. — not fatal, we still have the static HTML to try the
        // AI fallback against below.
        const reason = renderErr instanceof RenderError ? renderErr.message : renderErr?.message || renderErr;
        console.warn('[FetchUrl] Headless render fallback skipped/failed:', reason);
      }
    }

    let content = extraction?.content || '';
    let title = (extraction?.title || dom.window.document.title || 'Bài viết từ web').trim();
    let sanitizedArticleContent = extraction?.sanitizedHtml || '';
    let byline = extraction?.byline || undefined;
    const siteName = extraction?.siteName || parsedFinalUrl.hostname;

    // AI Fallback via Gemini 2.5 Flash if extraction yields empty or too little
    // text. Runs against the best HTML we have — the headless-rendered
    // version when we had to render, so a JS-hydrated page the AI still
    // can't parse cleanly at least gets real content instead of an empty shell.
    if (!content || content.length < MIN_CONTENT_LENGTH) {
      const rawKey = process.env.GEMINI_API_KEY;
      if (rawKey && rawKey.trim() !== '' && rawKey !== 'MY_GEMINI_API_KEY') {
        try {
          const ai = new GoogleGenAI({ apiKey: rawKey.trim() });
          const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              `Hãy trích xuất nguyên văn nội dung chính của bài viết hoặc chương truyện từ mã nguồn HTML sau đây.
Yêu cầu bắt buộc:
1. Giữ các đoạn văn cách nhau bằng hai dấu xuống dòng (\\n\\n).
2. Giữ nguyên tiêu đề (nếu có) ở dòng đầu tiên.
3. Loại bỏ toàn bộ menu điều hướng, quảng cáo, danh sách liên kết, chân trang và bình luận.
4. Không thêm bất kỳ lời chào, lời giải thích, hay đánh dấu markdown như \`\`\` nào. Chỉ trả về nội dung bài viết.

Mã nguồn HTML:
${html.slice(0, 200000)}`,
            ],
          });

          const aiText = (aiResponse.text || '').trim();
          if (aiText.length >= MIN_CONTENT_LENGTH) {
            content = aiText;
            byline = 'AI Extracted';
            if (!title || title === 'Bài viết từ web') {
              title = dom.window.document.title || 'Bài viết từ web';
            }
            sanitizedArticleContent = sanitizeContent(
              aiText
                .split(/\n\n+/)
                .map(p => `<p>${p.trim()}</p>`)
                .join('')
            );
          }
        } catch (aiErr) {
          console.warn('[FetchUrl] AI fallback extraction failed:', aiErr?.message || aiErr);
        }
      }
    }

    if (!content || content.length < MIN_CONTENT_LENGTH) {
      return res.status(422).json({
        ok: false,
        error:
          'Không thể trích xuất nội dung bài đọc từ trang web này. Trang có thể yêu cầu đăng nhập hoặc chỉ chứa hình ảnh.',
      });
    }

    return res.json({
      ok: true,
      title,
      content,
      sanitizedHtml: sanitizedArticleContent,
      byline,
      siteName,
      ...(renderedWithBrowser ? { renderedWithBrowser: true } : {}),
      ...(nextChapterUrl ? { nextChapterUrl } : {}),
    });
  }
);

// Screen Reader OCR endpoint using Google GenAI Vision (FR-006, FR-011, FR-014, FR-016)
app.post(
  '/api/ocr',
  aiRateLimiter,
  validateBody(ocrSchema),
  async (req, res, next) => {
    const { image } = req.body;

    let validatedFile;
    try {
      // FR-016: Magic Bytes Verification & 15MB limit check
      validatedFile = await validateBase64Image(image);
    } catch (validationErr) {
      return res.status(400).json({
        ok: false,
        error: validationErr.message || 'Dữ liệu hình ảnh không hợp lệ.',
      });
    }

    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey || rawKey.trim() === '' || rawKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({
        ok: false,
        error:
          'GEMINI_API_KEY is not configured on server. Please add a valid key to your local .env file.',
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: rawKey.trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType: validatedFile.mime,
              data: validatedFile.buffer.toString('base64'),
            },
          },
          'Chỉ trả về nguyên văn chữ nhận diện được trong ảnh, không thêm bất kỳ lời giải thích, lời chào hay định dạng markdown nào. Nếu không có chữ, trả về chuỗi rỗng.',
        ],
      });

      const text = (response.text || '').trim();
      return res.json({
        ok: true,
        text,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const err = new Error(`Lỗi khi xử lý nhận diện chữ: ${errorMessage}`);
      err.status = 500;
      next(err);
    }
  }
);

// FR-017: Register global error handler (trimmed responses, zero leaked stack traces)
app.use(errorHandler);

// Only listen if executed directly (allows testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[Proxy] VoxRead Gemini Proxy running on http://${HOST}:${PORT}`);
  });
}

export default app;
