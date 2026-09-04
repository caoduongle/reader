# Data Model & Security Schema: AppSec Core Hardening

**Feature**: `021-appsec-audit-hardening`  
**Date**: 2026-09-04  

---

## Core Entities

### 1. UserSession
Identity context established upon successful authentication.

| Field | Type | Storage / Location | Constraints / Validation |
|:---|:---|:---|:---|
| `id` | UUID / String | JWT payload (`sub` / `id`) | Valid format (`usr_*` or UUID), non-empty |
| `email` | String | JWT payload (`email`) | Valid email, lowercase, max 255 chars |
| `role` | String | JWT payload (`role`) | Enum: `'user'` | `'admin'` |
| `exp` | Integer | JWT payload | Epoch seconds, max 7-day duration |

---

### 2. DocumentRecord
User-owned text and reading document.

| Field | Type | Database Column | Security Rules |
|:---|:---|:---|:---|
| `id` | UUID / String | `id` (PRIMARY KEY) | Auto-generated server-side; untrusted from client on creation |
| `user_id` | UUID / String | `user_id` (REFERENCES auth.users) | **IMMUTABLE**. Binds record ownership to `UserSession.id` |
| `title` | String | `title` (VARCHAR(255)) | Zod trim, min 1, max 255 chars |
| `content` | String | `content` (TEXT) | Max 10MB; sanitized against XSS on storage |
| `sanitized_content` | String | `sanitized_content` (TEXT) | DOMPurify / sanitize-html processed |
| `is_private` | Boolean | `is_private` (BOOLEAN) | Default `true`. RLS enforces single-tenant read when private |
| `reading_progress` | Numeric | `reading_progress` | Checked between 0.0 and 100.0 |
| `current_position` | Integer | `current_position` | Checked >= 0 |

---

### 3. ParameterizedQuery
Internal database driver execution contract.

```typescript
export interface ParameterizedQuery {
  text: string;     // Must contain $1, $2, ... placeholders
  params: any[];    // Must be an Array of primitive values
}
```

---

### 4. RLSPolicyMatrix

| Table | Policy Name | Command | Policy Expression | Security Purpose |
|:---|:---|:---|:---|:---|
| `public.user_profiles` | `user_profiles_select_own` | `SELECT` | `auth.uid() = auth_user_id` | Prevent reading other users' profile details |
| `public.user_profiles` | `user_profiles_update_own` | `UPDATE` | `auth.uid() = auth_user_id` | Prevent modifying other users' profiles |
| `public.documents` | `documents_select_own` | `SELECT` | `auth.uid() = user_id` | IDOR defense for documents |
| `public.documents` | `documents_insert_own` | `INSERT` | `auth.uid() = user_id` | Prevent creating documents for another user |
| `public.documents` | `documents_update_own` | `UPDATE` | `auth.uid() = user_id` | Prevent mutating other users' documents |
| `public.documents` | `documents_delete_own` | `DELETE` | `auth.uid() = user_id` | Prevent deleting other users' documents |
| `public.bookmarks` | `bookmarks_select_own` | `SELECT` | `auth.uid() = user_id` | Tenant isolation for user bookmarks |
| `public.security_audit_logs` | `audit_logs_insert_only` | `INSERT` | `true` | Allow recording security events |
| `public.security_audit_logs` | `audit_logs_no_public_select` | `SELECT` | `false` | Forbid reading audit logs via client anon key |
