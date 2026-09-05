# Data Model: Deterministic DNS Mocking for Web Article Fetcher Tests

**Feature Branch**: `030-mock-dns-fetchurl-tests`  
**Date**: 2026-09-05  
**Spec**: [spec.md](./spec.md)

---

## 1. Entities & Types

### `MockDnsRecord`
The internal structure expected by Node.js `dns/promises.lookup(hostname, { all: true })`.

| Field | Type | Description |
|---|---|---|
| `address` | `string` | IP address string (e.g. `'93.184.216.34'`). |
| `family` | `number` | IP version: `4` for IPv4, `6` for IPv6. |

Default value in mock:
```typescript
const DEFAULT_PUBLIC_DNS_RECORDS: MockDnsRecord[] = [
  { address: '93.184.216.34', family: 4 },
];
```

### `MockLookupFunction`
Vitest mock function simulating `dns/promises.lookup`:

```typescript
type MockLookupSignature = (
  hostname: string,
  options?: { all?: boolean; family?: number }
) => Promise<MockDnsRecord[] | MockDnsRecord>;
```

---

## 2. Interaction Model

```text
[POST /api/fetch-url (url: 'https://example.com/article')]
             │
             ▼
      [safeFetchHtml]
             │
             ▼
     [assertPublicHost('example.com')]
             │
      Is IP literal? ─── NO ───► Call lookup('example.com', { all: true })
                                         │
                                         ▼
                                  [mockLookup (vi.fn)]
                                         │
                                (In-Memory Resolution)
                                         │
                                         ▼
                     Returns [{ address: '93.184.216.34', family: 4 }]
                                         │
                                         ▼
                 isPrivateOrReservedIp('93.184.216.34') === false
                                         │
                                         ▼
                                [Validation Passed]
                                (Zero Network I/O)
```
