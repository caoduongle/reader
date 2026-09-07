/**
 * Rate Limiting Middleware (FR-011)
 * Multi-tiered rate limiters for protecting sensitive AI APIs,
 * authentication endpoints, and preventing general denial of service.
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for AI Proxy Endpoints (/api/generate, /api/ocr)
 * Allows up to 30 requests per minute per IP address.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Tần suất gọi dịch vụ AI vượt quá giới hạn cho phép (tối đa 30 requests/phút). Vui lòng thử lại sau ít phút.',
  },
});


/**
 * Rate Limiter for /api/fetch-url
 * Web extraction can escalate to launching a headless browser (see
 * lib/renderPage.js) for JS-hydrated pages, which is far more expensive
 * (CPU/memory) than a plain fetch — kept tighter than the AI limiter so a
 * handful of "hard" pages in a row can't tie up the machine.
 */
export const fetchUrlRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // The automated test suite exercises /api/fetch-url far more than 15
  // times per run (many scenarios, one shared Express app instance); skip
  // limiting under Vitest/NODE_ENV=test so tests reflect real endpoint
  // behavior instead of the limiter itself. Fully active outside tests.
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    ok: false,
    error: 'Tần suất đọc nội dung từ liên kết vượt quá giới hạn cho phép (tối đa 15 requests/phút). Vui lòng thử lại sau ít phút.',
  },
});

/**
 * Global API Rate Limiter
 * Allows up to 120 requests per minute across general routes.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Tần suất gửi yêu cầu quá nhanh. Vui lòng giảm tốc độ và thử lại.',
  },
});
