# Feature Specification: ESLint 9 Flat Config, Prettier & Quality Tooling Setup

**Feature Branch**: `007-eslint-prettier-setup`  
**Created**: 2026-09-03  
**Status**: Draft  
**Input**: User description: "Nhiệm vụ: 1. Thêm ESLint phù hợp với stack React 19 + TypeScript + Vite: dùng typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh (bộ chuẩn hiện dùng cho template Vite + React + TS). Cấu hình dạng flat config (eslint.config.js) theo chuẩn ESLint 9; 2. Thêm Prettier + file cấu hình .prettierrc. Đảm bảo không xung đột rule giữa ESLint và Prettier bằng cách dùng eslint-config-prettier để tắt các rule format trùng lặp; 3. Sửa script trong package.json: 'lint': 'eslint .', 'typecheck': 'tsc --noEmit', 'lint:fix': 'eslint . --fix', 'format': 'prettier --write .'; 4. Chạy lint:fix và format một lượt để tự sửa các lỗi style/format đơn giản, an toàn. KHÔNG tự ý sửa logic hay refactor lớn chỉ để né lỗi lint. Với lỗi cần sửa tay và có rủi ro thay đổi hành vi, KHÔNG tự sửa — liệt kê thành danh sách trong PR description kèm vị trí file/dòng, để review sau, thay vì âm thầm thêm eslint-disable tràn lan; Ràng buộc: Không disable toàn bộ 1 rule ở phạm vi file/global chỉ để lint pass; Định nghĩa hoàn thành: npm run lint chạy sạch hoặc chỉ còn lỗi đã liệt kê rõ; npm run typecheck và npm run build vẫn pass sau khi format."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ESLint 9 Flat Config & Prettier Integration (Priority: P1)

As a developer and maintainer, I want a modern ESLint 9 flat configuration (`eslint.config.js`) tailored for React 19, TypeScript, and Vite, coupled with Prettier (`.prettierrc`) and `eslint-config-prettier`, so that the codebase enforces consistent code quality and formatting without rule conflicts.

**Why this priority**: Establishing unified linting and formatting tooling early ensures code quality, prevents syntax regressions, and provides automated style enforcement across all contributors and agents.

**Independent Test**: Can be tested by running `npm run lint` and `npm run format -- --check`:
- ESLint executes using flat config (`eslint.config.js`) and analyzes TypeScript and React TSX files.
- Prettier executes using `.prettierrc` without conflicting with ESLint rules.

**Acceptance Scenarios**:

1. **Given** the repository root, **When** inspecting configuration files, **Then** `eslint.config.js` exists in ESLint 9 flat config format, integrating `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and `eslint-config-prettier`.
2. **Given** the repository root, **When** inspecting formatting configurations, **Then** `.prettierrc` exists with standard formatting rules (e.g. singleQuote, semi, trailingComma).
3. **Given** ESLint and Prettier rules, **When** running both tools, **Then** `eslint-config-prettier` turns off all conflicting stylistic formatting rules in ESLint.

---

### User Story 2 - Standardized Developer Scripts in `package.json` (Priority: P1)

As a developer, I want clear, semantic npm scripts for linting, typechecking, and automated code formatting in `package.json`, so that I can easily validate and maintain code standards locally and in CI.

**Why this priority**: Standardized commands (`lint`, `typecheck`, `lint:fix`, `format`) clarify developer workflows and distinguish static type analysis (`tsc --noEmit`) from AST linting (`eslint .`).

**Independent Test**: Can be tested by invoking each npm script individually:
- `npm run lint` invokes `eslint .`.
- `npm run typecheck` invokes `tsc --noEmit`.
- `npm run lint:fix` invokes `eslint . --fix`.
- `npm run format` invokes `prettier --write .`.

**Acceptance Scenarios**:

1. **Given** `package.json`, **When** inspecting `scripts`, **Then** `"lint"` maps to `"eslint ."`.
2. **Given** `package.json`, **When** inspecting `scripts`, **Then** `"typecheck"` maps to `"tsc --noEmit"`.
3. **Given** `package.json`, **When** inspecting `scripts`, **Then** `"lint:fix"` maps to `"eslint . --fix"` and `"format"` maps to `"prettier --write ."`.

---

### User Story 3 - Automated Style Remediation & Transparent Triage (Priority: P2)

As a code reviewer, I want automated style and formatting issues fixed safely via `lint:fix` and `format`, while any complex or behavioral lint warnings (e.g. `any` types, `useEffect` dependencies) are preserved and cataloged transparently in the PR description, so that no accidental logic regressions are introduced.

**Why this priority**: Automated formatters should only touch safe stylistic aspects. Changing hooks or types without careful architectural review can break reader state or playback lifecycles.

**Independent Test**: Can be tested by running `npm run lint:fix` and `npm run format`, then verifying:
- Safe stylistic issues (quotes, semicolons, spacing) are automatically cleaned.
- No blanket or indiscriminate `/* eslint-disable */` comments are introduced.
- `npm run typecheck` and `npm run build` pass with zero errors.
- Any unresolved manual lint issues are documented with file and line numbers.

**Acceptance Scenarios**:

1. **Given** unformatted files across `src/`, **When** executing `npm run format` and `npm run lint:fix`, **Then** formatting is unified without altering runtime behavior.
2. **Given** existing complex logic in hooks (e.g. `useTTS.ts`), **When** linting surfaces potential warnings, **Then** no risky logic refactoring is performed, and any remaining warnings are cataloged for review.
3. **Given** the entire codebase after formatting, **When** running `npm run typecheck` and `npm run build`, **Then** both commands succeed with exit code 0.

---

### Edge Cases

- **Build Output Directory Exclusion**: ESLint and Prettier must strictly ignore `dist/`, `dist-electron/`, `release/`, `node_modules/`, `python-backend/venv/`, and `specs/` to avoid linting compiled artifacts or virtual environments.
- **React 19 Hooks Compatibility**: `eslint-plugin-react-hooks` must be configured with rules compatible with React 19 functional components.
- **Rule Disabling Prohibition**: The team must not disable entire rules file-wide or globally just to achieve a passing lint status. If a specific line requires suppression for a valid technical reason, an inline comment explaining the rationale is mandatory.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST install `eslint` (v9), `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`, and `eslint-config-prettier` as devDependencies.
- **FR-002**: System MUST configure ESLint using the ESLint 9 flat config standard (`eslint.config.js`) supporting TypeScript, React TSX, and Vite.
- **FR-003**: System MUST provide a root `.prettierrc` configuration file defining clear, standard formatting conventions.
- **FR-004**: System MUST configure `eslint-config-prettier` in `eslint.config.js` to deactivate any ESLint rules that clash with Prettier.
- **FR-005**: System MUST configure ESLint and Prettier ignores to exclude `dist/`, `dist-electron/`, `release/`, `node_modules/`, `python-backend/venv/`, and `.specify/`.
- **FR-006**: System MUST update `package.json` scripts:
  - `"lint": "eslint ."`
  - `"typecheck": "tsc --noEmit"`
  - `"lint:fix": "eslint . --fix"`
  - `"format": "prettier --write ."`
- **FR-007**: System MUST execute `npm run lint:fix` and `npm run format` across the codebase to resolve safe stylistic discrepancies.
- **FR-008**: System MUST NOT perform invasive refactoring or modify business logic just to bypass lint checks. Any findings requiring manual architectural decisions MUST be logged with file paths and line numbers.
- **FR-009**: System MUST verify that `npm run typecheck` and `npm run build` pass cleanly after formatting.

---

### Non-Functional & Scope Constraints

- **NFR-001 (Zero Behavioral Drift)**: Code formatting must not change application logic, React component lifecycles, or audio playback mechanics.
- **NFR-002 (Config Compatibility)**: All ESLint configuration must follow modern ESLint 9 flat config format (`export default [...]`).
- **NFR-003 (Transparency)**: No global rule suppression or blanket file-wide disabling without explicit justification comments.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run lint` executes successfully and reports clean results or documented triage items.
- **SC-002**: `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
- **SC-003**: `npm run build` (`vite build`) completes production build successfully.
- **SC-004**: `.prettierrc` and `eslint.config.js` exist in repository root and execute harmoniously without conflicting rules.
- **SC-005**: All four developer scripts in `package.json` are validated and operational.

---

## Assumptions

- The project uses npm as its package manager, as established in feature `005-setup-scripts-cleanup`.
- Existing TypeScript compilation settings in `tsconfig.json` are respected and unchanged.
