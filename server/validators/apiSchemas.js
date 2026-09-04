/**
 * API Input Validation Schemas (FR-008, FR-014)
 * Uses Zod schemas to enforce strict types, length constraints,
 * and strip/reject untrusted fields (mass assignment defense).
 */

import { z } from 'zod';

/**
 * Validation schema for /api/generate (Gemini Proxy)
 */
export const generateSchema = z
  .object({
    prompt: z
      .string({ required_error: 'Field "prompt" is required and must be a non-empty string.' })
      .trim()
      .min(1, 'Field "prompt" is required and must be a non-empty string.')
      .max(50_000, 'Prompt vượt quá độ dài tối đa 50,000 ký tự.'),
    model: z
      .string()
      .trim()
      .optional()
      .default('gemini-2.5-flash'),
    systemInstruction: z
      .string()
      .trim()
      .max(10_000, 'Chỉ dẫn hệ thống tối đa 10,000 ký tự.')
      .optional(),
  })
  .strict();

/**
 * Validation schema for /api/fetch-url (Web Article Extractor)
 */
export const fetchUrlSchema = z
  .object({
    url: z
      .string({ required_error: 'Địa chỉ liên kết (URL) không được để trống.' })
      .trim()
      .min(1, 'Địa chỉ liên kết (URL) không được để trống.')
      .refine(
        (val) => {
          try {
            const u = new URL(val);
            return u.protocol === 'http:' || u.protocol === 'https:';
          } catch {
            return false;
          }
        },
        {
          message:
            'Địa chỉ liên kết (URL) không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://.',
        }
      )
      .max(2048, 'Địa chỉ liên kết quá dài (tối đa 2048 ký tự).'),
  })
  .strict();

/**
 * Validation schema for /api/ocr (Vision Screen Reader)
 */
export const ocrSchema = z
  .object({
    image: z
      .string({ required_error: 'Dữ liệu hình ảnh không hợp lệ hoặc để trống.' })
      .trim()
      .min(1, 'Dữ liệu hình ảnh không hợp lệ hoặc để trống.'),
  })
  .strict();

/**
 * Validation schema for updating user documents (FR-008 Mass Assignment Defense)
 * Explicitly forbids tampering with role, is_admin, user_id, or created_at.
 */
export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    content: z.string().max(10_000_000).optional(),
    readingProgress: z.number().min(0).max(100).optional(),
    currentPosition: z.number().int().nonnegative().optional(),
    isPrivate: z.boolean().optional(),
  })
  .strict();
