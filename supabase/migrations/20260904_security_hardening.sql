-- ====================================================================
-- MIGRATION: 20260904_security_hardening.sql
-- Description: Enable RLS on 100% of tables, prevent mass assignment,
--              isolate tenant access, and enable pgcrypto encryption.
-- ====================================================================

-- 1. Kích hoạt extension pgcrypto cho mã hóa dữ liệu nhạy cảm
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

-- 3. Tạo bảng documents (Thư viện sách & tài liệu người dùng)
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

-- 4. Tạo bảng bookmarks (Đánh dấu trang & ghi chú riêng tư)
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paragraph_index INTEGER NOT NULL CHECK (paragraph_index >= 0),
  selected_text VARCHAR(1000) NOT NULL,
  note_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tạo bảng security_audit_logs (Ghi log bất biến, chỉ ghi không sửa)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent VARCHAR(512),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BẬT ROW LEVEL SECURITY (RLS) BẮT BUỘC TRÊN 100% CÁC BẢNG (FR-004)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- CHÍNH SÁCH ROW LEVEL SECURITY (RLS POLICIES) - CÔ LẬP NGUYÊN BẢN (FR-004, FR-007)
-- ====================================================================

-- 6.1 Policy cho user_profiles
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- 6.2 Policy cho documents: Chỉ đọc/ghi bản ghi thuộc về chính mình
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

-- 6.3 Policy cho bookmarks
CREATE POLICY "bookmarks_select_own"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert_own"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_delete_own"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- 6.4 Policy cho security_audit_logs: Client chỉ được insert, cấm select/update/delete
CREATE POLICY "audit_logs_insert_only"
  ON public.security_audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audit_logs_no_public_select"
  ON public.security_audit_logs FOR SELECT
  USING (false);

-- ====================================================================
-- DATABASE TRIGGER: CHẶN FIELD TAMPERING / MASS ASSIGNMENT (FR-008)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Cấm tuyệt đối người dùng thông thường sửa role hoặc is_admin
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_admin IS DISTINCT FROM OLD.is_admin) THEN
    IF (current_user != 'service_role' AND current_user != 'postgres') THEN
      RAISE EXCEPTION 'Quyền truy cập bị từ chối: Không được phép sửa đổi trường role hoặc is_admin.';
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_fields ON public.user_profiles;
CREATE TRIGGER trg_protect_sensitive_profile_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();
