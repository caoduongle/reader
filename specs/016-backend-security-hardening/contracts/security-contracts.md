# Phase 1: Security API & Middleware Interface Contracts

**Feature**: `016-backend-security-hardening`  
**Target File**: `specs/016-backend-security-hardening/contracts/security-contracts.md`  
**Consumer**: Backend API Gateway (`server.js`), Express Routers, Frontend Services.

---

## 1. Authentication Contract (`server/middleware/auth.js`)

### 1.1 Specification
Intercepts incoming HTTP requests to protected routes. Validates JWT signature, expiration, and audience against the server's private secret (`JWT_SECRET` / `SUPABASE_JWT_SECRET`).

### 1.2 Signature
```typescript
interface AuthenticatedUser {
  id: string; // UUID of the authenticated user
  email: string;
  role: 'user' | 'premium' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> | void;
```

### 1.3 Response Codes
- `200 / Next`: Token is valid. `req.user` populated with verified identity.
- `401 Unauthorized`:
  ```json
  {
    "ok": false,
    "error": "Yêu cầu xác thực. Vui lòng cung cấp Authorization header hợp lệ (Bearer token)."
  }
  ```
- `500 Internal Server Error`: `JWT_SECRET` missing from server environment.

---

## 2. Rate Limiting Contract (`server/middleware/rateLimiter.js`)

### 2.1 Specification
Protects against brute-force attacks and denial-of-service by tracking client IP hit frequency.

### 2.2 Tiers
1. **`authLimiter`**:
   - Window: `15 minutes` (900,000 ms)
   - Max Requests: `5` per IP
   - Target Routes: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/reset-password`
2. **`aiLimiter`**:
   - Window: `1 minute` (60,000 ms)
   - Max Requests: `30` per IP
   - Target Routes: `POST /api/generate`, `POST /api/ocr`
3. **`globalLimiter`**:
   - Window: `1 minute` (60,000 ms)
   - Max Requests: `120` per IP
   - Target Routes: All API routes (`/api/*`)

### 2.3 Response on Violation (`429 Too Many Requests`)
Headers emitted:
- `RateLimit-Limit`: Maximum requests allowed in current window
- `RateLimit-Remaining`: `0`
- `RateLimit-Reset`: Unix timestamp when quota resets
- `Retry-After`: Seconds until quota resets

Body:
```json
{
  "ok": false,
  "error": "Tần suất gọi API vượt quá giới hạn cho phép. Vui lòng thử lại sau.",
  "retryAfterSeconds": 45
}
```

---

## 3. Input Validation Contract (`server/middleware/validate.js`)

### 3.1 Specification
Guarantees all request payloads are parsed and validated strictly using Zod before any business logic executes. Prevents Prototype Pollution, SQL syntax errors, and unexpected type injections.

### 3.2 Endpoint Schemas

#### `POST /api/generate`
```typescript
const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt không được để trống').max(50_000, 'Prompt tối đa 50,000 ký tự'),
  model: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']).default('gemini-2.5-flash'),
  systemInstruction: z.string().max(10_000).optional(),
}).strict();
```

#### `POST /api/fetch-url`
```typescript
const fetchUrlSchema = z.object({
  url: z.string().url('URL không đúng định dạng').max(2048, 'URL tối đa 2048 ký tự'),
}).strict();
```

#### `POST /api/ocr`
```typescript
const ocrSchema = z.object({
  image: z.string().min(1, 'Chuỗi base64 ảnh không được để trống'),
}).strict();
```

#### `PATCH /api/documents/:id` (Field Tampering Prevention)
```typescript
const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().max(10_000_000).optional(),
  readingProgress: z.number().min(0).max(100).optional(),
  currentPosition: z.number().int().nonnegative().optional(),
}).strict(); // Từ chối mọi trường ngoài danh mục (role, is_admin, user_id, created_at)
```

### 3.3 Response on Validation Failure (`400 Bad Request`)
```json
{
  "ok": false,
  "error": "Dữ liệu yêu cầu không hợp lệ.",
  "issues": [
    {
      "path": "prompt",
      "message": "Prompt không được để trống"
    }
  ]
}
```

---

## 4. Bot Protection Contract (`server/middleware/botProtection.js`)

### 4.1 Specification
Prevents automated scrapers and bot traffic from abusing open public endpoints. Combines client Turnstile challenge tokens with hidden Honeypot fields.

### 4.2 Request Body Requirements
```json
{
  "_hp_website": "", // MUST be empty (hidden in CSS; if filled, bot detected)
  "turnstileToken": "<CF_TURNSTILE_RESPONSE_TOKEN>"
}
```

### 4.3 Validation Logic
1. If `_hp_website.length > 0`: Return `400 Bad Request` ("Xác thực bot không thành công").
2. Server calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `CLOUDFLARE_TURNSTILE_SECRET_KEY`.
3. If outcome `success === false`: Return `403 Forbidden` ("Xác thực bot thất bại hoặc token đã hết hạn").

---

## 5. Security Headers Contract (`server/middleware/securityHeaders.js`)

### 5.1 Required HTTP Response Headers
| Header | Value | Purpose |
| :--- | :--- | :--- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 full year |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME type sniffing |
| `X-Frame-Options` | `DENY` | Completely prevents Clickjacking |
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data: https:; ...` | Restricts script and resource origins |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Protects privacy on outbound navigation |
| `Cross-Origin-Resource-Policy`| `cross-origin` | Safe media asset sharing |

---

## 6. Content Sanitization Contract (`server/lib/sanitizer.js`)

### 6.1 Specification
Cleans user-submitted text and scraped article HTML before database storage or client rendering. Completely strips `<script>`, `<iframe onload=...>`, `<object>`, inline event handlers (`onclick`, `onerror`).

### 6.2 Signature
```typescript
function sanitizeArticleContent(rawHtmlOrText: string): string;
function escapeHtmlEntities(rawText: string): string;
```

---

## 7. File Upload & Magic Bytes Contract (`server/middleware/uploadGuard.js`)

### 7.1 Specification
Prevents arbitrary file upload attacks (e.g. uploading executable scripts disguised as images or PDFs).

### 7.2 Verification Rules
1. **Magic Bytes Check**:
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - JPEG: `FF D8 FF`
   - WEBP: `52 49 46 46 ... 57 45 42 50`
   - PDF: `%PDF-` (`25 50 44 46 2D`)
2. **Size Enforcement**: Maximum size strictly limited to `15,728,640 bytes` (15MB).
3. **Randomized Renaming**: Filename generated via `crypto.randomUUID() + '.' + detectedExt`. Client-provided names are never used as storage paths.
