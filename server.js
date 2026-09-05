import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { GoogleGenAI } from '@google/genai';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Security modules & middleware
import { assertPublicHost } from './lib/ssrfGuard.js';
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

// Web article extraction endpoint using Mozilla Readability (FR-006, FR-014, FR-015)
app.post(
  '/api/fetch-url',
  validateBody(fetchUrlSchema),
  async (req, res, next) => {
    const { url } = req.body;

    let parsedUrl;
    try {
      parsedUrl = new URL(url.trim());
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      return res.status(400).json({
        ok: false,
        error: 'Địa chỉ liên kết (URL) không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://.',
      });
    }

    // Prevent SSRF: block private, intranet, and loopback hosts
    try {
      await assertPublicHost(parsedUrl.hostname);
    } catch {
      return res.status(400).json({
        ok: false,
        error: 'Không thể truy cập địa chỉ nội bộ hoặc riêng tư từ tính năng này.',
      });
    }

    try {
      const response = await fetch(parsedUrl.toString(), {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 VoxRead/1.0',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        },
      });

      if (!response.ok) {
        return res.status(response.status >= 500 ? 502 : response.status).json({
          ok: false,
          error: `Không thể tải trang web (mã lỗi HTTP ${response.status}). Trang web có thể bị chặn hoặc không tồn tại.`,
        });
      }

      const html = await response.text();
      const dom = new JSDOM(html, { url: parsedUrl.toString() });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.textContent || !article.textContent.trim()) {
        return res.status(422).json({
          ok: false,
          error:
            'Không thể trích xuất nội dung bài đọc từ trang web này. Trang có thể yêu cầu đăng nhập hoặc chỉ chứa hình ảnh.',
        });
      }

      // FR-015: Sanitize extracted article content against stored XSS
      const sanitizedArticleContent = sanitizeContent(article.content || article.textContent);

      return res.json({
        ok: true,
        title: article.title || dom.window.document.title || 'Bài viết từ web',
        content: article.textContent.trim(),
        sanitizedHtml: sanitizedArticleContent,
        byline: article.byline || undefined,
        siteName: article.siteName || parsedUrl.hostname,
      });
    } catch (err) {
      if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        return res.status(504).json({
          ok: false,
          error: 'Quá thời gian chờ tải trang (10 giây). Vui lòng thử lại sau hoặc kiểm tra đường truyền mạng.',
        });
      }
      next(err);
    }
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
