/**
 * Admin API Routes (FR-004, FR-006)
 * Strictly protected by requireAuth and requireAdmin middleware.
 * Only users holding the 'admin' role can access these endpoints.
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Enforce both authentication and administrative clearance on all admin routes
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/metrics
 * System health, memory, and performance metrics
 */
router.get('/metrics', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    ok: true,
    metrics: {
      uptimeSeconds: Math.floor(process.uptime()),
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/admin/users
 * Returns sanitized user summaries for administrative inspection
 */
router.get('/users', (req, res) => {
  res.json({
    ok: true,
    users: [
      { id: req.user.id, email: req.user.email, role: req.user.role },
    ],
  });
});

export default router;
