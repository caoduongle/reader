/**
 * Authentication Endpoints (FR-006, FR-009, FR-010, FR-011)
 * Enforces rate limiting, bot protection, Argon2id hashing, and HttpOnly cookies.
 */

import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { verifyBotProtection } from '../middleware/botProtection.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { setSessionCookie, clearSessionCookie } from '../lib/cookies.js';

const router = express.Router();

const authSchema = z
  .object({
    email: z.string().trim().email('Email không đúng định dạng.').max(255),
    password: z.string().min(10, 'Mật khẩu phải có độ dài tối thiểu 10 ký tự.').max(128),
    _hp_website: z.string().optional(),
    turnstileToken: z.string().optional(),
  })
  .strict();

// In-memory credential store fallback for standalone/local development
const localUserStore = new Map();

/**
 * POST /api/auth/register
 */
router.post(
  '/register',
  authRateLimiter,
  verifyBotProtection,
  validateBody(authSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase();

      if (localUserStore.has(normalizedEmail)) {
        return res.status(409).json({
          ok: false,
          error: 'Email này đã được đăng ký trên hệ thống.',
        });
      }

      const hashedPassword = await hashPassword(password);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const userRecord = {
        id: userId,
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      localUserStore.set(normalizedEmail, userRecord);

      // Issue JWT & Secure Cookie
      const token = signToken({ id: userId, email: normalizedEmail, role: 'user' });
      setSessionCookie(res, token);

      return res.status(201).json({
        ok: true,
        user: {
          id: userId,
          email: normalizedEmail,
          role: 'user',
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  authRateLimiter,
  validateBody(authSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase();

      const userRecord = localUserStore.get(normalizedEmail);
      if (!userRecord) {
        return res.status(401).json({
          ok: false,
          error: 'Email hoặc mật khẩu không chính xác.',
        });
      }

      const isMatch = await verifyPassword(userRecord.passwordHash, password);
      if (!isMatch) {
        return res.status(401).json({
          ok: false,
          error: 'Email hoặc mật khẩu không chính xác.',
        });
      }

      const token = signToken({
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
      });

      setSessionCookie(res, token);

      return res.json({
        ok: true,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true, message: 'Đăng xuất thành công.' });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    ok: true,
    user: req.user,
  });
});

export default router;
