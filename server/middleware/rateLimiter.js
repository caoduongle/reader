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
 * Rate Limiter for Authentication Endpoints (/api/auth/login, /api/auth/register)
 * Allows up to 5 attempts per 15 minutes per IP to prevent brute-force credential stuffing.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Quá nhiều lần thử đăng nhập không thành công. Vui lòng thử lại sau 15 phút.',
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
