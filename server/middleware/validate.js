/**
 * Request Validation Middleware (FR-014)
 * Parses and verifies incoming request bodies, queries, and parameters
 * against strict Zod schemas before hitting business logic.
 */

export function validateBody(schema) {
  return (req, res, next) => {
    if (!schema || typeof schema.safeParse !== 'function') {
      return next();
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error.issues || []).map((issue) => {
        let msg = issue.message;
        const field = issue.path[0];

        // Format user-friendly and backward-compatible required messages
        if (msg.includes('received undefined') || msg.includes('expected string')) {
          if (field === 'prompt') {
            msg = 'Field "prompt" is required and must be a non-empty string.';
          } else if (field === 'url') {
            msg = 'Địa chỉ liên kết (URL) không được để trống.';
          } else if (field === 'image') {
            msg = 'Dữ liệu hình ảnh không hợp lệ hoặc để trống.';
          }
        }

        return {
          path: issue.path.join('.'),
          message: msg,
        };
      });

      const firstError = issues[0]?.message || 'Dữ liệu yêu cầu không hợp lệ.';

      return res.status(400).json({
        ok: false,
        error: firstError,
        issues,
      });
    }

    // Replace req.body with parsed & stripped data
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    if (!schema || typeof schema.safeParse !== 'function') {
      return next();
    }

    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: 'Tham số truy vấn (Query) không hợp lệ.',
        issues: result.error.issues,
      });
    }

    req.query = result.data;
    next();
  };
}
