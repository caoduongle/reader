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
 * Validation schema for /api/speak/edge (Microsoft Edge TTS)
 * Feature 048-desktop-tts-migration: thay thế pipeline RVC, giọng Edge TTS
 * giờ được tổng hợp trực tiếp tại đây (Node) thay vì qua python-backend.
 */
export const speakEdgeSchema = z
  .object({
    text: z
      .string({ required_error: 'Thiếu "text" trong request.' })
      .trim()
      .min(1, 'Thiếu "text" trong request.')
      .max(10_000, 'Độ dài văn bản vượt quá giới hạn tối đa (10,000 ký tự).'),
    voice: z.string().trim().max(100).optional().default('vi-VN-HoaiMyNeural'),
    rate: z.string().trim().max(20).optional().default('+0%'),
    pitch: z.string().trim().max(20).optional().default('+0Hz'),
    volume: z.string().trim().max(20).optional().default('+0%'),
  })
  .strict();

