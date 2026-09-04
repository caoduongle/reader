/**
 * Secure Session Cookie Configuration & Helpers (FR-009)
 * Enforces HttpOnly, Secure, and SameSite attributes to prevent
 * Cross-Site Scripting (XSS) token theft and CSRF attacks.
 */

export const SESSION_COOKIE_NAME = 'voxread_session';

/**
 * Returns security-hardened cookie options.
 * @returns {object} Express cookie options
 */
export function getSecureCookieOptions(overrides = {}) {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Forbids client-side JS access via document.cookie
    secure: isProd, // Requires HTTPS in production
    sameSite: 'lax', // Protects against CSRF on top-level navigations
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ...overrides,
  };
}

/**
 * Attaches a secure session cookie to the response.
 * @param {object} res Express Response
 * @param {string} token Session/JWT token
 */
export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, getSecureCookieOptions());
}

/**
 * Clears the session cookie safely.
 * @param {object} res Express Response
 */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, getSecureCookieOptions({ maxAge: 0 }));
}
