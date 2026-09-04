/**
 * File Upload Security Guard (FR-016)
 * Validates binary magic bytes (does not trust file extension),
 * enforces 15MB size ceiling, and generates randomized UUID filenames.
 */

import crypto from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

/**
 * Validates buffer against size and magic bytes.
 * @param {Buffer|Uint8Array} buffer File buffer
 * @returns {Promise<{safeFilename: string, mime: string, ext: string, size: number}>}
 */
export async function validateBufferMagicBytes(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Dữ liệu file rỗng.');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error('Kích thước file vượt quá giới hạn cho phép (tối đa 15MB).');
  }

  // Ensure pure Uint8Array for fileTypeFromBuffer compatibility across environments
  const uint8Array =
    buffer instanceof Uint8Array
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);

  const detected = await fileTypeFromBuffer(uint8Array);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new Error(
      `Định dạng file không được phép: ${detected?.mime || 'không xác định'}. Chỉ chấp nhận JPEG, PNG, WEBP, PDF.`
    );
  }

  const safeFilename = `${crypto.randomUUID()}.${detected.ext}`;

  return {
    safeFilename,
    mime: detected.mime,
    ext: detected.ext,
    size: buffer.length,
  };
}

/**
 * Validates a base64 encoded image string (e.g. for /api/ocr).
 * @param {string} base64String
 * @returns {Promise<{safeFilename: string, mime: string, ext: string, buffer: Buffer}>}
 */
export async function validateBase64Image(base64String) {
  const cleanBase64 = base64String.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  if (!cleanBase64) {
    throw new Error('Dữ liệu hình ảnh không hợp lệ hoặc để trống.');
  }

  const buffer = Buffer.from(cleanBase64, 'base64');
  const fileMeta = await validateBufferMagicBytes(buffer);

  return {
    ...fileMeta,
    buffer,
  };
}
