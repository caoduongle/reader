# Interface Contract: dns/promises Module Mock

**Feature Branch**: `030-mock-dns-fetchurl-tests`  
**Date**: 2026-09-05  
**Spec**: [spec.md](../spec.md)

---

## Mock Contract Specification

### Target Module
- `dns/promises` (Node.js built-in module)

### Exported Functions Mocked
- `lookup(hostname: string, options?: { all?: boolean, family?: number, hints?: number }): Promise<Array<{ address: string, family: number }> | { address: string, family: number }>`

### Contract Guarantees
1. **When called with `{ all: true }`**:
   - Returns a `Promise` resolving to an array of address objects:
     `[{ address: '93.184.216.34', family: 4 }]`
2. **When called without `{ all: true }`**:
   - Returns a `Promise` resolving to a single address object:
     `{ address: '93.184.216.34', family: 4 }`
3. **Spy Availability**:
   - The mock function is exposed via `mockLookup` so test suites can inspect `mockLookup.mock.calls` or provide custom implementations using `mockLookup.mockResolvedValueOnce(...)`.
