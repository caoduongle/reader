/**
 * Anti-Bot Protection Middleware (FR-012)
 * Combines Honeypot field inspection with Cloudflare Turnstile verification.
 */

export async function verifyBotProtection(req, res, next) {
  const { _hp_website, turnstileToken } = req.body || {};

  // 1. Honeypot check: If the hidden honeypot field has a value, a bot filled it
  if (_hp_website && typeof _hp_website === 'string' && _hp_website.trim().length > 0) {
    console.warn('[Security / Bot Alert]: Honeypot field populated by bot from IP:', req.ip);
    return res.status(400).json({
      ok: false,
      error: 'Xác thực bot không thành công.',
    });
  }

  // Allow bypass in test mode
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const turnstileSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) {
    // If not configured in environment, proceed with warning in dev
    return next();
  }

  if (!turnstileToken) {
    return res.status(400).json({
      ok: false,
      error: 'Vui lòng hoàn thành xác thực chống bot (Turnstile token required).',
    });
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: turnstileSecret,
        response: turnstileToken,
        remoteip: req.ip,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const outcome = await response.json();
    if (!outcome.success) {
      return res.status(403).json({
        ok: false,
        error: 'Xác thực bot thất bại hoặc token đã hết hạn.',
      });
    }

    next();
  } catch (err) {
    console.error('[Turnstile Verification Error]:', err);
    return res.status(500).json({
      ok: false,
      error: 'Không thể xác thực dịch vụ chống bot.',
    });
  }
}
