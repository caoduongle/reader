import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const HOST = '127.0.0.1'; // BIND STRICTLY TO 127.0.0.1 (SECURITY)

app.use(express.json());

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

// Only listen if executed directly (allows testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[Proxy] VoxRead Gemini Proxy running on http://${HOST}:${PORT}`);
  });
}

export default app;
