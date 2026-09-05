import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { GoogleGenAI } from '@google/genai';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Security modules & middleware
import { safeFetchHtml, SafeFetchError, htmlToParagraphText } from './lib/safeFetch.js';
import {
  aiRateLimiter,
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

// Web article extraction endpoint using Mozilla Readability with Gemini AI fallback
app.post(
  '/api/fetch-url',
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

    const { html, finalUrl } = fetchResult;
    let parsedFinalUrl;
    try {
      parsedFinalUrl = new URL(finalUrl);
    } catch {
      parsedFinalUrl = new URL(url);
    }

    const dom = new JSDOM(html, { url: finalUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    let content = '';
    let title = (article?.title || dom.window.document.title || 'Bài viết từ web').trim();
    let sanitizedArticleContent = '';
    let byline = article?.byline || undefined;
    const siteName = article?.siteName || parsedFinalUrl.hostname;

    if (article && (article.content || article.textContent)) {
      const formattedText = htmlToParagraphText(article.content || article.textContent, dom);
      if (formattedText.length >= 100) {
        content = formattedText;
        sanitizedArticleContent = sanitizeContent(article.content || article.textContent);
      }
    }

    // AI Fallback via Gemini 2.5 Flash if Readability yields empty or < 100 characters
    if (!content || content.length < 100) {
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
          if (aiText.length >= 100) {
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

    if (!content || content.length < 100) {
      return res.status(422).json({
        ok: false,
        error:
          'Không thể trích xuất nội dung bài đọc từ trang web này. Trang có thể yêu cầu đăng nhập hoặc chỉ chứa hình ảnh.',
      });
    }

    // Task 6 / US6: Scan for "Next Chapter" navigation link
    let nextChapterUrl = undefined;
    try {
      const anchorElements = Array.from(dom.window.document.querySelectorAll('a[href]'));
      const nextLinkRegex = /(?:chương\s*(?:sau|tiếp)|tiếp\s*theo|next\s*chapter|chap\s*sau)/i;
      const nextLink = anchorElements.find(a => {
        const text = a.textContent || '';
        const titleAttr = a.getAttribute('title') || '';
        const ariaLabel = a.getAttribute('aria-label') || '';
        return nextLinkRegex.test(text) || nextLinkRegex.test(titleAttr) || nextLinkRegex.test(ariaLabel);
      });

      if (nextLink) {
        const href = nextLink.getAttribute('href');
        if (href && href.trim()) {
          const resolved = new URL(href.trim(), finalUrl);
          if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
            nextChapterUrl = resolved.toString();
          }
        }
      }
    } catch {
      // Ignore next chapter discovery errors
    }

    return res.json({
      ok: true,
      title,
      content,
      sanitizedHtml: sanitizedArticleContent,
      byline,
      siteName,
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
