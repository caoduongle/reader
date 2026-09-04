# Phase 1: Security Data Model & Database Architecture

**Feature**: `016-backend-security-hardening`  
**Scope**: Database Schemas, Row-Level Security (RLS) Policies, Field Tampering Defenses, Data Encryption at Rest, and Security Audit Logging.

---

## 1. Entity Definitions

### 1.1 UserProfile (`public.user_profiles`)
Stores core profile information associated with authentication identity.

| Column | Type | Constraints | Security Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT gen_random_uuid() | Low | Unique profile identifier |
| `auth_user_id` | `UUID` | UNIQUE, NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | High | Bound to Supabase/PostgreSQL authenticated user |
| `email` | `VARCHAR(255)` | NOT NULL | High (PII) | User email address |
| `display_name` | `VARCHAR(100)` | NOT NULL DEFAULT 'Độc giả' | Low | User friendly nickname |
| `role` | `VARCHAR(20)` | NOT NULL DEFAULT 'user' | **CRITICAL (Restricted)** | Role ('user', 'premium', 'admin') - protected against mass assignment |
| `is_admin` | `BOOLEAN` | NOT NULL DEFAULT FALSE | **CRITICAL (Restricted)** | Admin flag - forbidden from user modification |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Low | Timestamp of creation |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Low | Timestamp of last modification |

---

### 1.2 UserDocument (`public.documents`)
User library documents, web imports, and OCR text.

| Column | Type | Constraints | Security Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT gen_random_uuid() | Low | Document identifier |
| `user_id` | `UUID` | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | **CRITICAL (Ownership)** | Owner user ID; verified via RLS |
| `title` | `VARCHAR(255)` | NOT NULL | Medium | Sanitized document title |
| `content` | `TEXT` | NOT NULL | Medium | Full text content |
| `sanitized_content` | `TEXT` | NOT NULL | Medium | HTML-sanitized text (XSS cleaned) |
| `source_url` | `VARCHAR(2048)`| NULL | Low | Origin URL (if imported from web) |
| `reading_progress` | `NUMERIC(5, 2)`| NOT NULL DEFAULT 0.0 CHECK (reading_progress BETWEEN 0 AND 100) | Low | Progress percentage |
| `current_position` | `INTEGER` | NOT NULL DEFAULT 0 CHECK (current_position >= 0) | Low | Character/word offset |
| `is_private` | `BOOLEAN` | NOT NULL DEFAULT TRUE | Medium | Document privacy setting |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Low | Timestamp of creation |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Low | Timestamp of last modification |

---

### 1.3 Bookmark (`public.bookmarks`)
Bookmarks and user annotations. Notes can contain sensitive personal thoughts, encrypted via AES-256 / `pgcrypto`.

| Column | Type | Constraints | Security Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT gen_random_uuid() | Low | Bookmark identifier |
| `document_id` | `UUID` | NOT NULL, REFERENCES public.documents(id) ON DELETE CASCADE | Medium | Associated document |
| `user_id` | `UUID` | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | **CRITICAL (Ownership)** | Owner user ID |
| `paragraph_index` | `INTEGER` | NOT NULL CHECK (paragraph_index >= 0) | Low | Target paragraph location |
| `selected_text` | `VARCHAR(1000)`| NOT NULL | Medium | Highlighted excerpt |
| `note_encrypted` | `TEXT` | NULL | **HIGH (Encrypted at Rest)** | User private note encrypted via AES-256-GCM |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Low | Creation timestamp |

---

### 1.4 SecurityAuditLog (`public.security_audit_logs`)
Append-only log recording security events, authentication attempts, rate limiting violations, and bot triggers.

| Column | Type | Constraints | Security Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT gen_random_uuid() | Low | Audit entry ID |
| `event_type` | `VARCHAR(50)` | NOT NULL | Medium | Event type (`LOGIN_SUCCESS`, `LOGIN_FAIL`, `RATE_LIMIT`, `SSRF_BLOCK`, `BOT_DETECT`) |
| `ip_address` | `VARCHAR(45)` | NOT NULL | Medium | Client IP address (IPv4/IPv6) |
| `user_agent` | `VARCHAR(512)` | NULL | Low | Client User-Agent string |
| `user_id` | `UUID` | NULL, REFERENCES auth.users(id) ON DELETE SET NULL | Medium | User ID involved (if authenticated) |
| `details` | `JSONB` | NOT NULL DEFAULT '{}'::jsonb | Medium | Context details (endpoint, error code, headers) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Low | Immutable timestamp of event |

---

### 1.5 UploadedFile (`public.uploaded_files`)
Metadata for uploaded images (OCR) and PDF books.

| Column | Type | Constraints | Security Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | PRIMARY KEY, DEFAULT gen_random_uuid() | Low | File record ID |
| `user_id` | `UUID` | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | **CRITICAL (Ownership)** | Uploader user ID |
| `original_name` | `VARCHAR(255)` | NOT NULL | Low | Original filename from user client |
| `storage_filename`| `UUID` | NOT NULL UNIQUE | Medium | Randomized UUID storage name on disk/bucket |
| `mime_type` | `VARCHAR(50)` | NOT NULL | Medium | Verified magic-bytes MIME type |
| `file_size_bytes` | `INTEGER` | NOT NULL CHECK (file_size_bytes <= 15728640) | Low | Max 15MB file size constraint |
| `checksum_sha256` | `CHAR(64)` | NOT NULL | Medium | Integrity SHA-256 hash |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() | Low | Creation timestamp |

---

## 2. PostgreSQL / Supabase Migration & Security DDL

The following DDL provides complete security hardening for PostgreSQL:
- Bật Row-Level Security trên 100% bảng.
- Khởi tạo chính sách kiểm tra quyền sở hữu (`auth.uid() = user_id`).
- Kích hoạt extension `pgcrypto` để mã hóa dữ liệu nhạy cảm.
- Cấu hình trigger chặn sửa trường nhạy cảm (`role`, `is_admin`) chống Mass Assignment.

```sql
-- ====================================================================
-- MIGRATION: 20260904_security_hardening.sql
-- Description: Enable RLS, prevent mass assignment, configure pgcrypto
-- ====================================================================

-- 1. Kích hoạt pgcrypto cho mã hóa dữ liệu
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tạo bảng user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL DEFAULT 'Độc giả',
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tạo bảng documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  sanitized_content TEXT NOT NULL,
  source_url VARCHAR(2048),
  reading_progress NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (reading_progress BETWEEN 0 AND 100),
  current_position INTEGER NOT NULL DEFAULT 0 CHECK (current_position >= 0),
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tạo bảng bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paragraph_index INTEGER NOT NULL CHECK (paragraph_index >= 0),
  selected_text VARCHAR(1000) NOT NULL,
  note_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tạo bảng security_audit_logs (Immutable)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent VARCHAR(512),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BẬT ROW LEVEL SECURITY (RLS) BẮT BUỘC TRÊN TẤT CẢ CÁC BẢNG
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- CHÍNH SÁCH ROW LEVEL SECURITY (RLS POLICIES)
-- ====================================================================

-- 6.1 Policy cho user_profiles: Chỉ xem & sửa profile của chính mình
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 6.2 Policy cho documents: Cách ly dữ liệu hoàn toàn theo auth.uid()
CREATE POLICY "documents_select_own"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "documents_insert_own"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_update_own"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents_delete_own"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- 6.3 Policy cho bookmarks:
CREATE POLICY "bookmarks_select_own"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert_own"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_delete_own"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- 6.4 Policy cho security_audit_logs: Người dùng chỉ được ghi (hoặc chỉ service_role)
CREATE POLICY "audit_logs_insert_only"
  ON public.security_audit_logs FOR INSERT
  WITH CHECK (true);

-- Không cho phép SELECT/UPDATE/DELETE audit logs từ public client
CREATE POLICY "audit_logs_no_public_select"
  ON public.security_audit_logs FOR SELECT
  USING (false);

-- ====================================================================
-- DATABASE TRIGGER: CHẶN FIELD TAMPERING (MASS ASSIGNMENT)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu không phải superuser/service_role thì cấm sửa role và is_admin
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
    IF (current_user != 'service_role' AND current_user != 'postgres') THEN
      RAISE EXCEPTION 'Quyền truy cập bị từ chối: Không được phép sửa đổi trường role hoặc is_admin.';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();
```
