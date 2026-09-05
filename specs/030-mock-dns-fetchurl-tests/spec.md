# Feature Specification: Deterministic DNS Mocking for Web Article Fetcher Tests

**Feature Branch**: `030-mock-dns-fetchurl-tests`  
**Created**: 2026-09-05  
**Status**: Draft  
**Input**: User description: "File: tests/unit/fetchUrl.test.ts. Vấn đề: Test 'allows fetching public URL with mocked HTML response' (dòng ~227) dùng URL thật 'https://example.com/article'. Dù fetch() đã được mock, hàm assertPublicHost() trong lib/ssrfGuard.js vẫn gọi DNS lookup() THẬT (từ module 'dns/promises') để resolve hostname trước khi cho phép fetch tiếp tục. Vì đây là lookup mạng thật, thời gian phản hồi phụ thuộc môi trường chạy (máy dev vs CI runner) — trên CI đôi khi vượt quá 5000ms timeout mặc định của Vitest, làm test fail dù logic hoàn toàn đúng. Yêu cầu sửa: 1. Thêm mock cho module 'dns/promises' ở đầu tests/unit/fetchUrl.test.ts (cùng chỗ với vi.mock('@google/genai', ...) đã có), dùng vi.mock để mock hàm lookup(hostname, opts): Trả về địa chỉ IP public giả hợp lệ (vd '93.184.216.34') cho MỌI hostname trong bộ test này, TRỪ các trường hợp test cố tình assert bị chặn SSRF; Có thể dùng vi.fn() cho phép override return value theo từng test nếu cần. 2. Đảm bảo mock được áp dụng TRƯỚC khi import '../../server' và '../../lib/ssrfGuard'. 3. Sau khi mock, test 'allows fetching public URL with mocked HTML response' không còn phụ thuộc DNS thật nữa — chạy nhanh, ổn định ở mọi môi trường. 4. KHÔNG cần thay đổi lib/ssrfGuard.js hay lib/safeFetch.js. 5. Rà lại toàn bộ các test khác trong cùng file có gọi tới hostname là domain thật. Kiểm tra: Chạy npx vitest run tests/unit/fetchUrl.test.ts nhiều lần liên tiếp (vd 5 lần) — phải pass ổn định 23/23 mỗi lần; Không có lệnh gọi dns/promises thật nào lọt ra ngoài."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deterministic In-Memory DNS Resolution in Unit Tests (Priority: P1) 🎯 MVP

As a developer and CI/CD runner executing the automated test suite, I want `dns/promises` resolution in `tests/unit/fetchUrl.test.ts` to be fully mocked in-memory, so that tests do not issue actual network DNS queries and never fail due to network latency, offline developer environments, or Vitest 5000ms timeout limits.

**Why this priority**: Flaky tests on CI degrade deployment velocity and mask real regressions. Eliminating network I/O from unit tests makes the test suite completely deterministic, hermetic, and fast.

**Independent Test**:
1. Run `npx vitest run tests/unit/fetchUrl.test.ts` in an offline environment (or with network disconnected).
2. Verify all tests including "allows fetching public URL with mocked HTML response" execute and pass within milliseconds.
3. Verify that the mocked `lookup` spy intercepts all domain resolution attempts and no native DNS socket requests are dispatched.

**Acceptance Scenarios**:
1. **Given** `tests/unit/fetchUrl.test.ts` imports and invokes the server endpoint with a public domain (such as `example.com`), **When** `assertPublicHost()` attempts DNS resolution, **Then** the call is served by the mocked `lookup` returning a valid public IP (e.g. `93.184.216.34`) without performing real network DNS lookup.
2. **Given** test cases targeting IP literals (such as `127.0.0.1`, `169.254.169.254`, or `10.0.0.1`), **When** `assertPublicHost()` runs, **Then** it validates the IP literal directly and rejects loopback/private IPs without invoking `lookup`.
3. **Given** the test suite executes multiple consecutive times, **When** measuring execution time and status, **Then** all 23 tests pass 100% reliably with zero DNS timeout errors.

---

### User Story 2 - Configurable Mock for Simulated Malicious DNS Resolutions (Priority: P2)

As a security test author validating SSRF defenses, I want the `lookup` mock function to be controllable via `vi.fn()`, so that test cases can dynamically simulate DNS rebinding scenarios or resolution errors when desired.

**Why this priority**: While the default mock provides safe public IPs to keep standard article-fetching tests green, having `mockLookup` exposed as a `vi.fn()` allows existing or future test cases to simulate DNS resolution to private IPs (e.g. `hostname` resolves to `127.0.0.1`) without external infrastructure.

**Independent Test**:
1. Configure `mockLookup.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }])` for a public domain name.
2. Invoke `assertPublicHost()` on that domain.
3. Verify that the function catches the private IP and throws an error blocking the request.

**Acceptance Scenarios**:
1. **Given** a test case requires simulating a domain resolving to a private IP, **When** `mockLookup` is configured to return `127.0.0.1`, **Then** `assertPublicHost()` catches the record and blocks the request with an SSRF error.
2. **Given** a test finishes overriding `mockLookup`, **When** subsequent tests run, **Then** the mock cleanly restores to the default safe public IP behavior.

---

### Edge Cases

- **Options format `{ all: true }`**: `assertPublicHost()` invokes `lookup(normalized, { all: true })`, which expects an array of `{ address: string, family: number }` objects. The mock must return an array when `{ all: true }` is passed, and a single object `{ address: string, family: number }` if called without `{ all: true }`.
- **Hoisting order**: Vitest hoists `vi.mock()` calls to the top of the file before imports. The mock must be declared at the module root before importing `../../server` and `../../lib/ssrfGuard` to guarantee that `lookup` inside `lib/ssrfGuard.js` receives the mock.
- **Production Code Isolation**: Production modules `lib/ssrfGuard.js`, `lib/safeFetch.js`, and `server.js` must remain 100% untouched.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `tests/unit/fetchUrl.test.ts` MUST mock the `dns/promises` Node.js module using `vi.mock('dns/promises', ...)`.
- **FR-002**: The mock `lookup` implementation MUST default to returning a valid public IPv4 address record (e.g. `[{ address: '93.184.216.34', family: 4 }]`) when called with `{ all: true }`.
- **FR-003**: The mock `lookup` implementation MUST be backed by a Vitest mock function (`vi.fn()`) to allow test-specific overrides and assertions.
- **FR-004**: The mock declaration MUST be placed at the top of `tests/unit/fetchUrl.test.ts` alongside existing module mocks (`@google/genai`) to ensure proper module hoisting.
- **FR-005**: All test cases in `tests/unit/fetchUrl.test.ts` utilizing non-literal domain names (e.g. `example.com`, `truyen-online.test`, `attacker.test`, `headers.test`) MUST execute without triggering real network DNS queries.
- **FR-006**: Existing SSRF protection test cases asserting immediate rejection of IP literals (`127.0.0.1`, `169.254.169.254`, `10.0.0.1`) MUST continue passing unchanged.
- **FR-007**: Production files `lib/ssrfGuard.js`, `lib/safeFetch.js`, and `server.js` MUST NOT be modified.

---

### Key Entities

- **MockLookupRecord**:
  - `address`: String representation of IP address (default `'93.184.216.34'`).
  - `family`: Integer IP protocol version (`4` or `6`).
- **MockLookupFunction**:
  - Vitest mock function (`vi.fn`) implementing `(hostname: string, options?: { all?: boolean }) => Promise<MockLookupRecord[] | MockLookupRecord>`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of test cases in `tests/unit/fetchUrl.test.ts` (23/23 tests) pass reliably across 5 consecutive runs.
- **SC-002**: 0 real outbound network DNS queries are performed during test execution.
- **SC-003**: The test "allows fetching public URL with mocked HTML response" completes deterministically in less than 100ms without relying on external network reachability.
- **SC-004**: No regressions are introduced to the full test suite (`npm test`).

---

## Assumptions

- Vitest properly hoists `vi.mock('dns/promises')` so that ESM imports in `lib/ssrfGuard.js` bind to the mocked export.
- `93.184.216.34` is recognized as a public, non-reserved IPv4 address by `isPrivateOrReservedIp()`.
