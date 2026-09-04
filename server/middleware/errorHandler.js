/**
 * Global Error Handler & Response Trimmer Middleware (FR-017)
 * Ensures zero internal stack traces, system paths, or raw database errors
 * leak to the client in production environments.
 */

// Express error handlers strictly require 4 arguments for signature detection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err, req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production';
  let statusCode = err.status || err.statusCode || (err.name === 'ZodError' ? 400 : 500);

  // Handle entity payload too large (413) -> Returns 400 with friendly message
  if (err.type === 'entity.too.large' || statusCode === 413) {
    statusCode = 400;
    return res.status(400).json({
      ok: false,
      error: 'Kích thước hình ảnh vượt quá giới hạn cho phép (tối đa 15MB).',
    });
  }

  // Server-side structured audit logging
  console.error('[Security / Error Audit]:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    status: statusCode,
    errorName: err.name,
    message: err.message,
    stack: isProd ? undefined : err.stack,
  });

  // Handle malformed JSON body parser error
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: 'Dữ liệu JSON trong request body bị lỗi cú pháp.',
    });
  }

  // Client-facing response (stripped of stack traces and internal secrets)
  const clientErrorMessage =
    isProd && statusCode === 500
      ? 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.'
      : err.message || 'Lỗi không xác định.';

  return res.status(statusCode).json({
    ok: false,
    error: clientErrorMessage,
    ...(err.issues ? { issues: err.issues } : {}),
  });
}
