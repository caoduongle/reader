/**
 * HTTPS Redirection Middleware (FR-019)
 * Enforces TLS/HTTPS in production environments. Inspects req.secure
 * and standard reverse proxy headers (x-forwarded-proto).
 */

export function enforceHttps(req, res, next) {
  // Only enforce in production environments
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isHttps) {
    const host = req.headers.host || '127.0.0.1';
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }

  next();
}
