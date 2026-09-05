# Research Findings: Deterministic DNS Mocking for Web Article Fetcher Tests

**Feature Branch**: `030-mock-dns-fetchurl-tests`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Node.js `dns/promises` Mocking in Vitest

### Problem
In `lib/ssrfGuard.js`, `assertPublicHost(hostname)` performs an asynchronous DNS lookup via `import { lookup } from 'dns/promises'`:
```javascript
addresses = await lookup(normalized, { all: true });
```
When `tests/unit/fetchUrl.test.ts` executes tests using non-literal domain names (such as `example.com`), `assertPublicHost` issues an actual DNS query to the operating system's configured DNS resolver. In CI environments or environments with network latency, this real network lookup can exceed Vitest's 5000ms default test timeout, causing flaky test failures despite correct implementation logic.

### Decision
Mock `dns/promises` at the top of `tests/unit/fetchUrl.test.ts` using Vitest's built-in module mocking:
```typescript
const mockLookup = vi.fn().mockImplementation(async (hostname: string, options?: { all?: boolean }) => {
  if (options && options.all) {
    return [{ address: '93.184.216.34', family: 4 }];
  }
  return { address: '93.184.216.34', family: 4 };
});

vi.mock('dns/promises', () => {
  return {
    lookup: mockLookup,
  };
});
```

### Rationale
1. **Module Hoisting**: Vitest hoists `vi.mock()` calls before any imports. Variables prefixed with `mock` (like `mockLookup`) are permitted inside the mock factory.
2. **Contract Compatibility**: `assertPublicHost` specifically calls `lookup(hostname, { all: true })` and expects an array of `{ address, family }` objects. Providing `{ address: '93.184.216.34', family: 4 }` perfectly mirrors Node.js's native `dns/promises.lookup` return structure.
3. **Hermetic Testing**: Completely decouples test execution from internet connectivity, eliminating DNS timeouts and reducing test execution time to a few milliseconds.
4. **Zero Production Changes**: Preserves 100% of production code in `lib/ssrfGuard.js`, `lib/safeFetch.js`, and `server.js`.

---

## 2. Interaction with SSRF Security Tests

### Analysis
Does mocking `dns/promises.lookup` break existing SSRF blocking tests?
- In `lib/ssrfGuard.js`:
  ```javascript
  // 1. Rejects localhost and *.local immediately
  if (normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
    throw new Error('Access to local host is forbidden');
  }

  // 2. Direct IP literals are validated directly without DNS lookup
  if (net.isIP(normalized)) {
    if (isPrivateOrReservedIp(normalized)) {
      throw new Error('Access to private or reserved IP is forbidden');
    }
    return;
  }
  ```
- All test cases testing SSRF rejection on `127.0.0.1:3001`, `10.0.0.1`, `192.168.1.1`, `169.254.169.254`, `172.20.0.1`, and `localhost:8008` hit branch 1 or branch 2. They **never** invoke `lookup()`.
- Therefore, the mock will not mask or interfere with IP-literal SSRF protections.

---

## 3. Test Observability & Spy Capabilities

### Decision
Because `mockLookup` is created as a `vi.fn()`, tests can:
1. Assert that `mockLookup` is called when a domain name is fetched.
2. Override `mockLookup.mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }])` to test DNS-rebinding-style attacks where a domain resolves to a private IP.
3. Clear/reset calls between tests using `beforeEach(() => { mockLookup.mockClear(); })`.
