import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const HOST = '127.0.0.1'; // BIND STRICTLY TO 127.0.0.1 (SECURITY)

app.use(express.json());

// CORS configuration for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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
      error: 'GEMINI_API_KEY is not configured on server. Please add a valid key to your local .env file.',
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

// Only listen if executed directly (allows testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[Proxy] VoxRead Gemini Proxy running on http://${HOST}:${PORT}`);
  });
}

export default app;
