import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { assertPublicHost } from './lib/ssrfGuard.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const HOST = '127.0.0.1'; // BIND STRICTLY TO 127.0.0.1 (SECURITY)

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
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Health check endpoint
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

// Secure proxy generation endpoint
app.post('/api/generate', async (req, res) => {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey || rawKey.trim() === '' || rawKey === 'MY_GEMINI_API_KEY') {
    return res.status(503).json({
      ok: false,
      error:
        'GEMINI_API_KEY is not configured on server. Please add a valid key to your local .env file.',
    });
  }

  const { prompt, model = 'gemini-2.5-flash', systemInstruction } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Field "prompt" is required and must be a non-empty string.',
    });
  }

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Gemini Proxy Error]:', errorMessage);
    res.status(500).json({
      ok: false,
      error: errorMessage,
    });
  }
});

// Web article extraction endpoint using Mozilla Readability
app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({
      ok: false,
      error: 'Địa chỉ liên kết (URL) không được để trống.',
    });
  }

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

    return res.json({
      ok: true,
      title: article.title || dom.window.document.title || 'Bài viết từ web',
      content: article.textContent.trim(),
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
    const message = err instanceof Error ? err.message : 'Không xác định';
    return res.status(500).json({
      ok: false,
      error: `Lỗi kết nối đến trang web: ${message}`,
    });
  }
});

// Screen Reader OCR endpoint using Google GenAI Vision
app.post('/api/ocr', async (req, res) => {
  const { image } = req.body || {};

  if (!image || typeof image !== 'string' || image.trim() === '') {
    return res.status(400).json({
      ok: false,
      error: 'Dữ liệu hình ảnh không hợp lệ hoặc để trống.',
    });
  }

  // Strip data URI prefix if present
  const base64Data = image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  if (!base64Data) {
    return res.status(400).json({
      ok: false,
      error: 'Dữ liệu hình ảnh không hợp lệ hoặc để trống.',
    });
  }

  // Check decoded size limit (15MB)
  const estimatedDecodedBytes = (base64Data.length * 3) / 4;
  if (estimatedDecodedBytes > 15 * 1024 * 1024) {
    return res.status(400).json({
      ok: false,
      error: 'Kích thước hình ảnh vượt quá giới hạn cho phép (tối đa 15MB).',
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
            mimeType: 'image/png',
            data: base64Data,
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
    console.error('[OCR Error]:', errorMessage);
    return res.status(500).json({
      ok: false,
      error: `Lỗi khi xử lý nhận diện chữ: ${errorMessage}`,
    });
  }
});

// Error handler for JSON payload size limit and parsing errors
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(400).json({
      ok: false,
      error: 'Kích thước hình ảnh vượt quá giới hạn cho phép (tối đa 15MB).',
    });
  }
  next(err);
});

// Only listen if executed directly (allows testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[Proxy] VoxRead Gemini Proxy running on http://${HOST}:${PORT}`);
  });
}

export default app;
