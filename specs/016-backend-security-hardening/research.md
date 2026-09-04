# Phase 0: Security Hardening Research & Vulnerability Analysis

**Feature**: `016-backend-security-hardening`  
**Role**: Application Security Engineer (AppSec Engineer)  
**Target Scope**: Node.js Express Gateway (`server.js`), Database Layer (PostgreSQL / Supabase RLS), Python Audio Service (`python-backend/server.py`), and CI/CD Security.

This document analyzes each of the 20 AppSec standards according to the required specification structure:
**Đánh giá rủi ro hiện tại** $\rightarrow$ **Tệp tin liên quan** $\rightarrow$ **Code cấu hình/vá lỗi cụ thể**.

---

## 1. Hide API Keys (Giấu khóa API và Secret)

- **Đánh giá rủi ro hiện tại**:
  - `server.js` hiện đọc `GEMINI_API_KEY` từ `process.env`. Tuy nhiên, nếu không có nguyên tắc bảo vệ nghiêm ngặt, việc vô tình import các biến môi trường này vào code client qua Vite (`import.meta.env.VITE_*`) hoặc commit file `.env` vào repository sẽ khiến API Key bị lộ hoàn toàn.
  - Kẻ tấn công có thể trích xuất key từ mã nguồn frontend hoặc inspect network requests, dẫn đến việc bị cạn kiệt hạn ngạch (quota exhaustion) và phát sinh chi phí ngoài ý muốn.
- **Tệp tin liên quan**:
  - `server.js`
  - `.env`
  - `.env.example`
  - `vite.config.ts`
  - `src/services/ai.ts`
- **Code cấu hình / vá lỗi cụ thể**:
  ```javascript
  // server.js - Đảm bảo chỉ đọc key ở môi trường backend, tuyệt đối không gửi key về client
  import dotenv from 'dotenv';
  dotenv.config();

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '' || GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    console.warn('[Security Warning]: GEMINI_API_KEY is not securely configured.');
  }

  // Chặn rò rỉ biến môi trường qua header hoặc payload
  app.disable('x-powered-by');
  ```
  Trong `vite.config.ts`, kiểm tra để không cấu hình `define: { 'process.env': ... }` phơi bày toàn bộ environment variables. Chỉ cho phép các biến có tiền tố `VITE_` dành riêng cho public client.

---

## 2. Purge Git Secrets (Thanh lọc bí mật khỏi lịch sử Git)

- **Đánh giá rủi ro hiện tại**:
  - Dù file `.env` hiện tại nằm trong `.gitignore`, bất kỳ commit nào trong quá khứ vô tình thêm file `.env`, file private key (`.pem`, `.key`), hoặc token sẽ lưu vĩnh viễn trong Git object database (commit tree). Kẻ xấu khi clone repo có thể `git checkout` hoặc `git log -p` để trích xuất bí mật đã từng tồn tại.
- **Tệp tin liên quan**:
  - `.gitignore`
  - Git history / commit objects
  - `scripts/purge-git-secrets.bat` (hoặc `.sh`)
- **Code cấu hình / vá lỗi cụ thể**:
  Cập nhật `.gitignore` phòng ngừa toàn diện:
  ```gitignore
  # Security: Environment & Secret files
  .env
  .env.*
  !.env.example
  *.pem
  *.key
  *.cert
  credentials.json
  service-account.json
  ```
  Quy trình sử dụng `git-filter-repo` (công cụ chính thức được Git khuyến nghị thay thế cho BFG):
  ```bash
  # 1. Cài đặt git-filter-repo qua pip (nếu chưa có)
  pip install git-filter-repo

  # 2. Tạo bản sao lưu an toàn của repo
  git clone --mirror https://github.com/org/repo.git repo-backup.git

  # 3. Quét và loại bỏ triệt để file .env khỏi toàn bộ lịch sử commit
  git filter-repo --invert-paths --path .env --path-glob '*.env.*' --force

  # 4. Thay thế secret string cụ thể (nếu từng gõ trực tiếp trong file code)
  # Tạo file expressions.txt chứa cú pháp: secret_value==>REDACTED
  git filter-repo --replace-text expressions.txt --force

  # 5. Ép push lại lên remote sau khi đã thông báo cho toàn đội ngũ
  git push origin --force --all
  git push origin --force --tags
  ```

---

## 3. Use Public DB Key (Phân lập khóa Database: Anon Key vs Service Role Key)

- **Đánh giá rủi ro hiện tại**:
  - Khi tích hợp hệ quản trị cơ sở dữ liệu Supabase/PostgreSQL, việc đưa nhầm `SUPABASE_SERVICE_ROLE_KEY` lên client cho phép bất kỳ người dùng nào vượt qua toàn bộ cơ chế Row-Level Security (RLS) để chiếm quyền quản trị viên tối cao (Full DB Access/Drop tables).
- **Tệp tin liên quan**:
  - `src/lib/supabaseClient.ts`
  - `server/lib/supabaseAdmin.js`
  - `.env.example`
- **Code cấu hình / vá lỗi cụ thể**:
  Tách bạch rõ rệt 2 client:
  ```typescript
  // src/lib/supabaseClient.ts (CLIENT-SIDE - CHỈ DÙNG ANON KEY)
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Security]: Supabase Client initialized without public credentials.');
  }

  // Client này tuân thủ 100% các policy RLS
  export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  ```
  ```javascript
  // server/lib/supabaseAdmin.js (SERVER-SIDE ONLY - TUYỆT ĐỐI KHÔNG BUNDLE CHO CLIENT)
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be defined strictly in server environment.');
  }

  export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  ```

---

## 4. Enable Row-Level Security (RLS) (Bảo vệ dữ liệu ở tầng Database)

- **Đánh giá rủi ro hiện tại**:
  - Trong PostgreSQL/Supabase, nếu bảng dữ liệu không được bật Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), bất kỳ client nào có anon key đều có thể thực hiện `SELECT * FROM documents` hoặc xóa dữ liệu của người dùng khác.
- **Tệp tin liên quan**:
  - `supabase/migrations/20260904_security_hardening.sql`
  - `specs/016-backend-security-hardening/data-model.md`
- **Code cấu hình / vá lỗi cụ thể**:
  ```sql
  -- 1. Bật RLS bắt buộc cho tất cả các bảng dữ liệu
  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;

  -- 2. Thiết lập Policy cách ly người dùng nghiêm ngặt: auth.uid() = user_id
  -- Policy cho bảng documents:
  CREATE POLICY "Users can only select their own documents"
    ON public.documents
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can only insert their own documents"
    ON public.documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can only update their own documents"
    ON public.documents
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can only delete their own documents"
    ON public.documents
    FOR DELETE
    USING (auth.uid() = user_id);
  ```

---

## 5. Encrypt Sensitive Data (Mã hóa dữ liệu nhạy cảm ở trạng thái nghỉ)

- **Đánh giá rủi ro hiện tại**:
  - Các thông tin như token dịch vụ bên thứ ba (Google AI, OpenAI), ghi chú đọc cá nhân, hoặc dữ liệu nhận dạng cá nhân (PII) nếu lưu dưới dạng plaintext trong database sẽ bị rò rỉ nếu database backup bị đánh cắp hoặc bị lỗi dump dữ liệu.
- **Tệp tin liên quan**:
  - `supabase/migrations/20260904_security_hardening.sql`
  - `server/lib/crypto.js`
- **Code cấu hình / vá lỗi cụ thể**:
  Sử dụng chuẩn mã hóa tiêu chuẩn công nghiệp **AES-256-GCM** (có Authenticated Encryption Tag):
  ```javascript
  // server/lib/crypto.js
  import crypto from 'node:crypto';

  const ALGORITHM = 'aes-256-gcm';
  const IV_LENGTH = 12; // 96 bits for GCM
  const TAG_LENGTH = 16; // 128 bits auth tag

  // DATA_ENCRYPTION_KEY phải là chuỗi 32-byte hex hoặc buffer từ env
  const ENCRYPTION_KEY = Buffer.from(
    process.env.DATA_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'hex'
  );

  export function encryptSensitiveText(plainText) {
    if (!plainText) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Lưu định dạng: iv:authTag:encryptedPayload
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  export function decryptSensitiveText(cipherText) {
    if (!cipherText) return null;
    const parts = cipherText.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  ```
  Phía database PostgreSQL có thể sử dụng `pgcrypto`:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  -- Mã hóa khi ghi: pgp_sym_encrypt(secret_text, current_setting('app.encryption_key'))
  -- Giải mã khi đọc: pgp_sym_decrypt(encrypted_bytea, current_setting('app.encryption_key'))
  ```

---

## 6. Enforce Server-Side Authentication (Bắt buộc xác thực phía Server)

- **Đánh giá rủi ro hiện tại**:
  - `server.js` hiện tại chưa có middleware xác thực; bất kỳ client nào gửi request tới `/api/generate`, `/api/fetch-url`, `/api/ocr` đều được xử lý nếu đáp ứng header CORS.
  - Khi mở rộng tính năng đồng bộ cloud hoặc người dùng, nếu tin tưởng client gửi `userId` trong `req.body`, kẻ tấn công có thể dễ dàng mạo danh bất kỳ user nào.
- **Tệp tin liên quan**:
  - `server/middleware/auth.js`
  - `server.js`
- **Code cấu hình / vá lỗi cụ thể**:
  ```javascript
  // server/middleware/auth.js
  import jwt from 'jsonwebtoken';

  export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: 'Yêu cầu xác thực. Vui lòng cung cấp Authorization header hợp lệ (Bearer token).',
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

    if (!jwtSecret) {
      console.error('[Security Critical]: JWT_SECRET is not configured on the server.');
      return res.status(500).json({ ok: false, error: 'Cấu hình hệ thống xác thực chưa hoàn tất.' });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256', 'RS256'],
      });
      // Gán định danh đã kiểm thực vào req.user - KHÔNG BAO GIỜ TIN req.body.userId
      req.user = {
        id: decoded.sub || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
      };
      next();
    } catch (err) {
      return res.status(401).json({
        ok: false,
        error: 'Token xác thực không hợp lệ hoặc đã hết hạn.',
      });
    }
  }
  ```

---

## 7. Lock Record Access (Ngăn chặn Insecure Direct Object Reference - IDOR)

- **Đánh giá rủi ro hiện tại**:
  - Lỗ hổng IDOR xảy ra khi endpoint cập nhật hoặc đọc bản ghi theo id (`GET /api/documents/:id`, `DELETE /api/documents/:id`) chỉ truy vấn `WHERE id = :id` mà không đối soát với `user_id` của phiên đăng nhập hiện tại. Bất kỳ người dùng nào đổi số ID trên URL đều có thể truy cập toàn bộ tài liệu của người khác.
- **Tệp tin liên quan**:
  - `server/routes/documents.js`
  - `server/middleware/verifyOwnership.js`
- **Code cấu hình / vá lỗi cụ thể**:
  ```javascript
  // Luôn bắt buộc kiểm tra đồng thời ID bản ghi VÀ user_id từ req.user
  export async function getDocumentById(req, res) {
    const { id } = req.params;
    const userId = req.user.id; // Lấy từ token đã verify ở middleware auth

    // TRUY VẤN AN TOÀN: Bắt buộc kèm điều kiện sở hữu
    const result = await db.query(
      'SELECT id, title, content, updated_at FROM documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      // Trả về 404 thay vì 403 để tránh rò rỉ sự tồn tại của ID bản ghi thuộc user khác
      return res.status(404).json({
        ok: false,
        error: 'Không tìm thấy tài liệu yêu cầu.',
      });
    }

    return res.json({ ok: true, document: result.rows[0] });
  }
  ```

---

## 8. Block Field Tampering (Chống thao túng trường / Mass Assignment)

- **Đánh giá rủi ro hiện tại**:
  - Khi xử lý payload cập nhật (`req.body`), nếu sử dụng trực tiếp `db.update(req.body)` hoặc `Object.assign()`, kẻ tấn công có thể inject thêm các trường nguy hiểm như `{ "role": "admin", "is_admin": true, "balance": 99999999, "user_id": "other_uuid" }` để leo thang đặc quyền.
- **Tệp tin liên quan**:
  - `server/validators/documentSchemas.js`
  - `server/validators/userSchemas.js`
- **Code cấu hình / vá lỗi cụ thể**:
  Sử dụng Zod Schema với `.strict()` để từ chối các trường không được phép:
  ```javascript
  // server/validators/documentSchemas.js
  import { z } from 'zod';

  export const updateDocumentSchema = z
    .object({
      title: z.string().min(1).max(255).optional(),
      content: z.string().max(10_000_000).optional(),
      currentPosition: z.number().int().nonnegative().optional(),
      readingProgress: z.number().min(0).max(100).optional(),
      settings: z
        .object({
          voice: z.string().optional(),
          speed: z.number().min(0.5).max(3.0).optional(),
          fontSize: z.number().min(12).max(48).optional(),
        })
        .optional(),
    })
    .strict(); // Từ chối ngay nếu xuất hiện bất kỳ trường lạ nào (như role, user_id, is_admin)
  ```

---

## 9. Secure Session Cookies (Bảo mật Cookie phiên làm việc)

- **Đánh giá rủi ro hiện tại**:
  - Nếu session token hoặc refresh token được lưu trong cookie không có cờ `HttpOnly`, mã độc XSS có thể truy cập `document.cookie` để đánh cắp token. Nếu thiếu cờ `Secure`, cookie sẽ bị gửi qua HTTP plaintext. Nếu thiếu `SameSite`, website dễ bị tấn công CSRF.
- **Tệp tin liên quan**:
  - `server.js`
  - `server/lib/cookies.js`
- **Code cấu hình / vá lỗi cụ thể**:
  ```javascript
  // server/lib/cookies.js
  const IS_PROD = process.env.NODE_ENV === 'production';

  export const SESSION_COOKIE_OPTIONS = {
    httpOnly: true, // Ngăn chặn hoàn toàn JavaScript client truy cập (chống XSS đánh cắp cookie)
    secure: IS_PROD, // Chỉ truyền qua kênh HTTPS đã mã hóa TLS
    sameSite: 'lax', // Chống Cross-Site Request Forgery (CSRF), có thể dùng 'strict' cho API nhạy cảm
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  };

  export function setSessionCookie(res, token) {
    res.cookie('voxread_session', token, SESSION_COOKIE_OPTIONS);
  }

  export function clearSessionCookie(res) {
    res.clearCookie('voxread_session', {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
  }
  ```

---

## 10. Hash Passwords (Băm mật khẩu an toàn bằng Argon2id)

- **Đánh giá rủi ro hiện tại**:
  - Sử dụng các hàm băm yếu (MD5, SHA-1, SHA-256 đơn thuần) hoặc lưu trữ mật khẩu không có salt ngẫu nhiên giúp tin tặc dễ dàng dùng bảng cầu vồng (rainbow tables) hoặc GPU cracking để giải mã mật khẩu của người dùng khi database bị xâm phạm.
- **Tệp tin liên quan**:
  - `server/services/passwordService.js`
- **Code cấu hình / vá lỗi cụ thể**:
  Sử dụng **Argon2id** (thuật toán chiến thắng cuộc thi Password Hashing Competition, chống tấn công ASIC/GPU bằng bộ nhớ chuyên sâu):
  ```javascript
  // server/services/passwordService.js
  import argon2 from 'argon2';

  const ARGON2_OPTIONS = {
    type: argon2.argon2id, // Kháng cả side-channel attacks và GPU cracking
    memoryCost: 2 ** 16, // 64 MB RAM
    timeCost: 3, // 3 iterations
    parallelism: 1, // 1 thread
  };

  export async function hashPassword(plainPassword) {
    if (!plainPassword || typeof plainPassword !== 'string' || plainPassword.length < 10) {
      throw new Error('Mật khẩu phải có độ dài tối thiểu 10 ký tự.');
    }
    return await argon2.hash(plainPassword, ARGON2_OPTIONS);
  }

  export async function verifyPassword(hashedPassword, candidatePassword) {
    if (!hashedPassword || !candidatePassword) return false;
    try {
      return await argon2.verify(hashedPassword, candidatePassword);
    } catch {
      return false;
    }
  }
  ```

---

## 11. Rate Limit Login & Sensitive APIs (Chống Brute-force & DDoS)

- **Đánh giá rủi ro hiện tại**:
  - `server.js` hiện tại chưa cấu hình rate limiting. Kẻ xấu có thể gửi hàng nghìn request mỗi phút vào `/api/generate` hoặc `/api/ocr` để làm cạn kiệt tài khoản Gemini API, hoặc gửi vô hạn request thử mật khẩu vào endpoint đăng nhập.
- **Tệp tin liên quan**:
  - `server/middleware/rateLimiter.js`
  - `server.js`
- **Code cấu hình / vá lỗi cụ thể**:
  Sử dụng `express-rate-limit`:
  ```javascript
  // server/middleware/rateLimiter.js
  import rateLimit from 'express-rate-limit';

  // 1. Chống brute-force đăng nhập: Tối đa 5 lần thử trong 15 phút
  export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: 'Quá nhiều lần thử đăng nhập không thành công. Vui lòng thử lại sau 15 phút.',
    },
  });

  // 2. Bảo vệ API AI Proxy (Gemini, OCR): Tối đa 30 requests / 1 phút mỗi IP
  export const aiProxyRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: 'Tần suất gọi dịch vụ AI vượt quá giới hạn cho phép (30 req/phút). Vui lòng chậm lại.',
    },
  });

  // 3. Giới hạn chung toàn hệ thống: Tối đa 120 requests / 1 phút
  export const globalApiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
  ```

---

## 12. Add Bot Protection (Chống Bot với Cloudflare Turnstile & Honeypot)

- **Đánh giá rủi ro hiện tại**:
  - Các biểu mẫu công khai (đăng ký, gửi phản hồi, cào nội dung URL công khai) rất dễ bị bot tự động spam, gây tắc nghẽn tài nguyên và tạo tài khoản ảo hàng loạt.
- **Tệp tin liên quan**:
  - `server/middleware/botProtection.js`
  - `server.js`
- **Code cấu hình / vá lỗi cụ thể**:
  Kết hợp **Cloudflare Turnstile** (thay thế reCAPTCHA thân thiện, bảo vệ quyền riêng tư) và kỹ thuật **Honeypot**:
  ```javascript
  // server/middleware/botProtection.js
  export async function verifyTurnstileAndHoneypot(req, res, next) {
    // 1. Kiểm tra Honeypot field (trường ẩn mà người dùng thật không bao giờ điền)
    const { _hp_website, turnstileToken } = req.body || {};
    if (_hp_website) {
      // Bot đã tự động điền trường ẩn này -> Chặn âm thầm với 400
      console.warn('[Bot Detected]: Honeypot field was populated.');
      return res.status(400).json({ ok: false, error: 'Xác thực bot không thành công.' });
    }

    // Nếu là môi trường dev hoặc test có thể bypass nếu cấu hình
    if (process.env.NODE_ENV === 'test') return next();

    const turnstileSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      // Nếu chưa cấu hình secret thì cho phép tiếp tục nhưng cảnh báo
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
      console.error('[Turnstile Verify Error]:', err);
      return res.status(500).json({ ok: false, error: 'Lỗi kiểm tra hệ thống chống bot.' });
    }
  }
  ```

---

## 13. Parameterize Queries (Tuyệt đối dùng Prepared Statements chống SQL Injection)

- **Đánh giá rủi ro hiện tại**:
  - Ghép chuỗi SQL (`"SELECT * FROM users WHERE email = '" + req.body.email + "'"` ) là nguyên nhân hàng đầu gây ra lỗi SQL Injection nghiêm trọng, cho phép tin tặc trích xuất toàn bộ cơ sở dữ liệu, sửa đổi mật khẩu hoặc xóa trắng database.
- **Tệp tin liên quan**:
  - `server/db/index.js`
  - Các query handlers
- **Code cấu hình / vá lỗi cụ thể**:
  Sử dụng 100% prepared statements với tham số vị trí:
  ```javascript
  // server/db/index.js
  import pg from 'pg';
  const { Pool } = pg;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  });

  // Wrapper query chuẩn hóa: BẮT BUỘC TRUYỀN PARAMS
  export async function query(text, params = []) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB Query]', { text, duration, rows: res.rowCount });
    }
    return res;
  }

  // Ví dụ chuẩn an toàn:
  // query('SELECT id, title FROM documents WHERE id = $1 AND user_id = $2', [docId, userId]);
  ```

---

## 14. Validate All Input (Kiểm thực toàn diện bằng Zod Schema)

- **Đánh giá rủi ro hiện tại**:
  - Hiện tại `server.js` chỉ có vài dòng kiểm tra thủ công dạng `typeof prompt !== 'string'`. Việc thiếu validation chặt chẽ dẫn đến các lỗi: Prototype Pollution, payload quá khổ gây out-of-memory, hoặc dữ liệu không đúng định dạng làm sập server.
- **Tệp tin liên quan**:
  - `server/middleware/validate.js`
  - `server/validators/apiSchemas.js`
  - `server.js`
- **Code cấu hình / vá lỗi cụ thể**:
  ```javascript
  // server/middleware/validate.js
  export const validateBody = (schema) => (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: 'Dữ liệu yêu cầu không hợp lệ.',
        issues: error.errors?.map((e) => ({ path: e.path.join('.'), message: e.message })),
      });
    }
  };

  // server/validators/apiSchemas.js
  import { z } from 'zod';

  export const generateSchema = z.object({
    prompt: z.string().min(1, 'Prompt không được để trống').max(50_000, 'Prompt quá dài (tối đa 50,000 ký tự)'),
    model: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']).default('gemini-2.5-flash'),
    systemInstruction: z.string().max(10_000).optional(),
  });

  export const fetchUrlSchema = z.object({
    url: z.string().url('URL không đúng định dạng').max(2048, 'URL quá dài'),
  });

  export const ocrSchema = z.object({
    image: z.string().min(1, 'Chuỗi base64 ảnh không được để trống'),
  });
  ```

---

## 15. Escape User Content (Làm sạch dữ liệu phòng chống XSS)

- **Đánh giá rủi ro hiện tại**:
  - Khi cào dữ liệu từ web (`/api/fetch-url`) hoặc khi người dùng tạo tài liệu văn bản, nếu nội dung chứa các thẻ độc hại (`<script>`, `<svg onload=...>`, `<iframe src="javascript:...">`) và được render trực tiếp trên frontend bằng `dangerouslySetInnerHTML` hoặc trong Electron webview, kẻ tấn công có thể thực thi mã độc trong phiên duyệt của người dùng.
- **Tệp tin liên quan**:
  - `server/lib/sanitizer.js`
  - `server.js`
  - `src/utils/sanitize.ts`
- **Code cấu hình / vá lỗi cụ thể**:
  Sử dụng `sanitize-html` trên backend và `DOMPurify` trên frontend:
  ```javascript
  // server/lib/sanitizer.js
  import sanitizeHtml from 'sanitize-html';

  export function sanitizeArticleContent(rawHtmlOrText) {
    if (!rawHtmlOrText || typeof rawHtmlOrText !== 'string') return '';

    return sanitizeHtml(rawHtmlOrText, {
      allowedTags: [
        'p', 'br', 'b', 'i', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'ul', 'ol', 'li', 'span', 'table', 'tbody', 'tr', 'td', 'th',
      ],
      allowedAttributes: {
        span: ['class'],
        p: ['class'],
      },
      allowedSchemes: ['http', 'https'],
      disallowedTagsMode: 'discard',
      enforceHtmlBoundary: true,
    }).trim();
  }
  ```

---

## 16. Restrict File Uploads (Kiểm tra Magic Bytes, Dung lượng & Đổi tên File)

- **Đánh giá rủi ro hiện tại**:
  - Chỉ kiểm tra đuôi file (extension `.png`, `.pdf`) rất dễ bị qua mặt bằng kỹ thuật extension spoofing (ví dụ: `malware.php.png` hoặc file thực thi giả mạo đuôi `.txt`). Kẻ tấn công có thể upload mã độc hoặc gửi file dung lượng khổng lồ gây cạn kiệt ổ cứng.
- **Tệp tin liên quan**:
  - `server/middleware/uploadGuard.js`
  - `server.js`
- **Code cấu hình / vá lỗi cụ thể**:
  Kiểm tra magic bytes của buffer bằng `file-type`, giới hạn dung lượng 15MB và tạo tên ngẫu nhiên:
  ```javascript
  // server/middleware/uploadGuard.js
  import crypto from 'node:crypto';
  import { fileTypeFromBuffer } from 'file-type';

  const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

  export async function validateUploadedFileBuffer(buffer) {
    if (!buffer || buffer.length === 0) {
      throw new Error('File rỗng.');
    }
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('Dung lượng file vượt quá giới hạn 15MB.');
    }

    // Kiểm tra magic bytes thực tế của file thay vì tin tưởng extension từ client
    const detectedType = await fileTypeFromBuffer(buffer);
    if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
      throw new Error(`Định dạng file không được phép: ${detectedType?.mime || 'unknown'}`);
    }

    // Đổi tên an toàn bằng UUID ngẫu nhiên
    const safeFilename = `${crypto.randomUUID()}.${detectedType.ext}`;
    return {
      safeFilename,
      mimeType: detectedType.mime,
      ext: detectedType.ext,
      size: buffer.length,
    };
  }
  ```

---

## 17. Trim API Responses (Tối giản dữ liệu & Không lộ Stack Trace)

- **Đánh giá rủi ro hiện tại**:
  - Hiện tại trong `server.js`, các block `catch` trả về trực tiếp `error: errorMessage`, có thể phơi bày đường dẫn thư mục server, phiên bản module nội bộ, câu lệnh truy vấn bị lỗi, hoặc API internals.
- **Tệp tin liên quan**:
  - `server.js`
  - `server/middleware/errorHandler.js`
- **Code cấu hình / vá lỗi cụ thể**:
  ```javascript
  // server/middleware/errorHandler.js
  export function globalErrorHandler(err, req, res, next) {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Ghi log chi tiết trên server nội bộ để điều tra lỗi
    console.error('[Internal Server Error]:', {
      message: err.message,
      stack: isProd ? undefined : err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    const statusCode = err.status || err.statusCode || 500;
    
    // Phản hồi tối giản trả về cho client: KHÔNG BAO GIỜ TRẢ VỀ STACK TRACE TRÊN PRODUCTION
    res.status(statusCode).json({
      ok: false,
      error: isProd && statusCode === 500 
        ? 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.' 
        : err.message || 'Lỗi không xác định.',
      ...(isProd ? {} : { code: err.code }),
    });
  }
  ```

---

## 18. Add Security Headers (Cấu hình toàn diện với Helmet)

- **Đánh giá rủi ro hiện tại**:
  - `server.js` hiện chỉ cấu hình một vài CORS header thủ công. Việc thiếu các security header quan trọng khiến ứng dụng dễ bị Clickjacking (`X-Frame-Options`), MIME-sniffing attacks (`X-Content-Type-Options`), và thiếu chính sách tải tài nguyên an toàn (`Content-Security-Policy`).
- **Tệp tin liên quan**:
  - `server.js`
- **Code cấu hình / vá lỗi cụ thể**:
  Tích hợp `helmet` với cấu hình tối ưu:
  ```javascript
  // server.js
  import helmet from 'helmet';

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'http://127.0.0.1:*', 'http://localhost:*'],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", 'blob:', 'data:'],
          frameAncestors: ["'none'"], // Chống Clickjacking
        },
      },
      hsts: {
        maxAge: 31536000, // 1 năm
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true, // X-Content-Type-Options: nosniff
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  ```

---

## 19. Force HTTPS (Bắt buộc kết nối an toàn trên Production)

- **Đánh giá rủi ro hiện tại**:
  - Nếu triển khai backend lên môi trường cloud hoặc VPS mà cho phép kết nối qua HTTP plaintext, mọi thông tin đăng nhập, token xác thực, và tài liệu đọc sẽ truyền qua mạng dưới dạng bản rõ, có thể bị nghe lén (sniffing) hoặc sửa đổi (MitM) trên các mạng công cộng.
- **Tệp tin liên quan**:
  - `server/middleware/enforceHttps.js`
  - `server.js`
- **Code cấu hình / vá lỗi cụ thể**:
  ```javascript
  // server/middleware/enforceHttps.js
  export function enforceHttps(req, res, next) {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Kiểm tra header TLS chuẩn của reverse proxy (Cloudflare, NGINX, AWS ALB)
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    if (!isHttps) {
      const host = req.headers.host || '';
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }

    next();
  }
  ```

---

## 20. Scan Dependencies & Remediation (Quét mã độc & Vá lỗ hổng thư viện)

- **Đánh giá rủi ro hiện tại**:
  - `npm audit` hiện thông báo 3 lỗ hổng bảo mật mức Moderate liên quan đến package `qs` (`2.2.5 - 6.15.3`) nằm trong dependency chain của `express` và `body-parser`. Lỗ hổng này có thể dẫn đến denial-of-service hoặc parsing bypass.
- **Tệp tin liên quan**:
  - `package.json`
  - `package-lock.json`
  - `.github/workflows/security-audit.yml`
- **Code cấu hình / vá lỗi cụ thể**:
  Bổ sung `overrides` trong `package.json` để ép cập nhật phiên bản vá lỗi:
  ```json
  {
    "overrides": {
      "qs": "^6.15.4"
    }
  }
  ```
  Thực hiện chạy lệnh vá lỗi và cấu hình GitHub Actions Audit:
  ```bash
  # Khắc phục lỗ hổng phụ thuộc npm
  npm audit fix
  ```
  Workflow tự động (`.github/workflows/security-audit.yml`):
  ```yaml
  name: Security Audit
  on: [push, pull_request]
  jobs:
    audit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
        - run: npm audit --audit-level=moderate
  ```

---

## Technical Stack & Architecture Decisions Summary

| Tiêu chuẩn / Hạng mục | Công nghệ lựa chọn | Lý do chọn | Giải pháp thay thế đã xem xét |
| :--- | :--- | :--- | :--- |
| **Header Security** | `helmet` | Chuẩn de-facto hệ sinh thái Express, cấu hình CSP & HSTS chặt chẽ | Cấu hình thủ công từng header (dễ sót) |
| **Rate Limiting** | `express-rate-limit` | Nhẹ, tích hợp trực tiếp Express, hỗ trợ bộ nhớ RAM hoặc Redis | NGINX rate-limiting (phụ thuộc hạ tầng) |
| **Input Validation** | `zod` | TypeScript-first, hiệu năng cao, schema tái sử dụng giữa client & server | Joi / Yup (nặng hơn, kém linh hoạt TS) |
| **Password Hashing** | `argon2` | Đạt chuẩn RFC 9106, chống brute-force ASIC/GPU tốt nhất hiện nay | `bcrypt` (chấp nhận được nhưng Argon2id an toàn hơn) |
| **Content Sanitization**| `sanitize-html` | Trưởng thành, whitelist thẻ & thuộc tính an toàn, bảo vệ chống Stored XSS | Regex thay thế (rất dễ bị bypass) |
| **File Type Verification**| `file-type` | Phân tích binary magic bytes thay vì tin extension | Chỉ kiểm tra mime type trong header |
| **Database Security** | PostgreSQL RLS + `pgcrypto` | Kiểm soát bảo mật ngay tại tầng cơ sở dữ liệu, chống IDOR hoàn toàn | Chỉ check quyền ở tầng ứng dụng (dễ quên trong query) |
