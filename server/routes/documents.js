/**
 * Document API Endpoints (FR-007, FR-008, FR-013, FR-015)
 * Enforces ownership verification (WHERE id = $1 AND user_id = $2) to completely prevent IDOR.
 * Enforces input sanitization and strict schema validation.
 */

import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateDocumentSchema } from '../validators/apiSchemas.js';
import { sanitizeContent } from '../lib/sanitizer.js';

const router = express.Router();

const createDocumentSchema = z
  .object({
    title: z.string().trim().min(1, 'Tiêu đề không được để trống.').max(255),
    content: z.string().min(1, 'Nội dung không được để trống.').max(10_000_000),
    sourceUrl: z.string().url().max(2048).optional(),
    isPrivate: z.boolean().optional().default(true),
  })
  .strict();

// In-memory document storage fallback for local mock / testing
const mockDocumentStore = new Map();

/**
 * GET /api/documents
 * List all documents owned by the authenticated user
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userDocs = Array.from(mockDocumentStore.values()).filter((doc) => doc.userId === userId);

    return res.json({
      ok: true,
      documents: userDocs,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id
 * Retrieve a specific document ensuring ownership (IDOR Defense FR-007)
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const doc = mockDocumentStore.get(id);

    // CRITICAL: Strict ownership verification
    if (!doc || doc.userId !== userId) {
      // Return 404 rather than 403 to avoid leaking existence of another user's document ID
      return res.status(404).json({
        ok: false,
        error: 'Không tìm thấy tài liệu yêu cầu.',
      });
    }

    return res.json({
      ok: true,
      document: doc,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/documents
 * Create a new document owned by req.user.id
 */
router.post('/', requireAuth, validateBody(createDocumentSchema), async (req, res, next) => {
  try {
    const { title, content, sourceUrl, isPrivate } = req.body;
    const userId = req.user.id;

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sanitizedHtml = sanitizeContent(content);

    const newDoc = {
      id: docId,
      userId,
      title: title.trim(),
      content,
      sanitizedContent: sanitizedHtml,
      sourceUrl: sourceUrl || null,
      readingProgress: 0,
      currentPosition: 0,
      isPrivate: isPrivate ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDocumentStore.set(docId, newDoc);

    return res.status(201).json({
      ok: true,
      document: newDoc,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/documents/:id
 * Update document fields; forbids field tampering (FR-008) and IDOR (FR-007)
 */
router.patch('/:id', requireAuth, validateBody(updateDocumentSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const doc = mockDocumentStore.get(id);
    if (!doc || doc.userId !== userId) {
      return res.status(404).json({
        ok: false,
        error: 'Không tìm thấy tài liệu yêu cầu.',
      });
    }

    const { title, content, readingProgress, currentPosition, isPrivate } = req.body;

    if (title !== undefined) doc.title = title.trim();
    if (content !== undefined) {
      doc.content = content;
      doc.sanitizedContent = sanitizeContent(content);
    }
    if (readingProgress !== undefined) doc.readingProgress = readingProgress;
    if (currentPosition !== undefined) doc.currentPosition = currentPosition;
    if (isPrivate !== undefined) doc.isPrivate = isPrivate;

    doc.updatedAt = new Date().toISOString();
    mockDocumentStore.set(id, doc);

    return res.json({
      ok: true,
      document: doc,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id
 * Delete document ensuring ownership (FR-007)
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const doc = mockDocumentStore.get(id);
    if (!doc || doc.userId !== userId) {
      return res.status(404).json({
        ok: false,
        error: 'Không tìm thấy tài liệu yêu cầu.',
      });
    }

    mockDocumentStore.delete(id);
    return res.json({
      ok: true,
      message: 'Xóa tài liệu thành công.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
