# Tasks: Deterministic DNS Mocking for Web Article Fetcher Tests

**Feature Branch**: `030-mock-dns-fetchurl-tests`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test setup inspection and preparation

- [X] T001 Inspect existing mocks and import ordering in tests/unit/fetchUrl.test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the mockLookup handler structure required by all user stories

- [X] T002 Implement mockLookup Vitest spy returning valid public IP record in tests/unit/fetchUrl.test.ts

**Checkpoint**: Mock handler defined and ready for registration

---

## Phase 3: User Story 1 - Deterministic In-Memory DNS Resolution in Unit Tests (Priority: P1) 🎯 MVP

**Goal**: Eliminate real network DNS lookups by mocking `dns/promises` at the top of `fetchUrl.test.ts`, preventing flaky CI timeouts.

**Independent Test**: Execute `tests/unit/fetchUrl.test.ts` and verify that the test "allows fetching public URL with mocked HTML response" resolves `example.com` via `mockLookup` without performing real DNS lookups.

### Implementation for User Story 1
- [X] T003 [US1] Register `vi.mock('dns/promises')` hoisting mock before application imports in tests/unit/fetchUrl.test.ts
- [X] T004 [US1] Add beforeEach hook to reset mockLookup between test executions in tests/unit/fetchUrl.test.ts
- [X] T005 [US1] Add spy assertion in `allows fetching public URL with mocked HTML response` verifying `mockLookup` was called with `example.com` in tests/unit/fetchUrl.test.ts
- [X] T006 [US1] Audit all test cases in tests/unit/fetchUrl.test.ts to confirm all domain-based tests resolve via mockLookup

**Checkpoint**: User Story 1 MVP complete. All domain-based tests run in-memory with zero external DNS requests.

---

## Phase 4: User Story 2 - Configurable Mock for Simulated Malicious DNS Resolutions (Priority: P2)

**Goal**: Support test-specific mock overrides to simulate DNS rebinding and malicious resolution without external infrastructure.

**Independent Test**: Use `mockLookup.mockResolvedValueOnce` to resolve a domain to `127.0.0.1` and verify `assertPublicHost` halts the request with HTTP 400.

### Implementation for User Story 2
- [X] T007 [US2] Add unit test using mockLookup.mockResolvedValueOnce resolving public domain to 127.0.0.1 in tests/unit/fetchUrl.test.ts
- [X] T008 [US2] Verify POST /api/fetch-url rejects the malicious resolved IP with HTTP 400 in tests/unit/fetchUrl.test.ts

**Checkpoint**: User Story 2 complete. Security tests can simulate dynamic DNS resolutions.

---

## Phase 5: Polish & Quality Gates

**Purpose**: Reliability verification across environments

- [X] T009 [P] Run `npx vitest run tests/unit/fetchUrl.test.ts` 5 consecutive times to verify 100% stability and zero timeouts
- [X] T010 [P] Run full test suite `npm test` to verify zero repository regressions
- [X] T011 [P] Run `npm run typecheck` and `npm run lint` to verify clean formatting and strict typing

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1 - defines `mockLookup`.
- **User Story 1 (Phase 3)**: Depends on Phase 2 - registers `vi.mock('dns/promises')` and asserts on `example.com`.
- **User Story 2 (Phase 4)**: Depends on Phase 3 - adds override test case.
- **Polish (Phase 5)**: Depends on Phase 3 and Phase 4.

### Parallel Opportunities
- T009, T010, T011 can run in parallel during polish phase.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Register `vi.mock('dns/promises')` with `mockLookup` returning `{ address: '93.184.216.34', family: 4 }`.
2. Run `npm test -- tests/unit/fetchUrl.test.ts`.
3. Verify all 23 tests pass instantly without network latency.

### Incremental Delivery
1. Phase 1 & 2: Setup mock.
2. Phase 3 (MVP): Hermetic DNS resolution.
3. Phase 4: DNS-rebinding simulation test.
4. Phase 5: Multi-run verification & linting.
