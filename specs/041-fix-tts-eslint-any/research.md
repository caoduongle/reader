# Phase 0 Research: Fix ESLint Any in useTTS ClientTiming

**Feature**: `041-fix-tts-eslint-any`  
**Date**: 2026-09-06

## 1. ESLint no-explicit-any Error in `src/hooks/useTTS.ts`

### Problem
Executing `npm run lint` fails with the following diagnostic:
```text
E:\reader\src\hooks\useTTS.ts
  551:74  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 1 problem (1 error, 0 warnings)
```

The error occurs at line 551 within the local interface declaration:
```typescript
const audioWithCustomProps = audio as unknown as {
  __originalOnPlaying?: ((this: GlobalEventHandlers, ev: Event) => any) | null;
};
```
Here, `__originalOnPlaying` is typed as returning `any`. The ESLint rule `@typescript-eslint/no-explicit-any` prohibits the `any` keyword to ensure codebase type safety.

### Decision
Change the return type of `__originalOnPlaying` from `any` to `unknown`:
```typescript
const audioWithCustomProps = audio as unknown as {
  __originalOnPlaying?: ((this: GlobalEventHandlers, ev: Event) => unknown) | null;
};
```

### Rationale
- **Call-Site Usage**: The stored handler is invoked via:
  ```typescript
  audioWithCustomProps.__originalOnPlaying.call(audio, ev);
  ```
  The return value of this `.call(...)` expression is never assigned, read, or returned; it is simply discarded.
- **Type Safety**: `unknown` is TypeScript's type-safe counterpart of `any`. Any function type with any return value (`void`, `boolean`, `Promise<void>`, object, etc.) is assignable to a function signature returning `unknown`.
- **Zero ESLint Warnings/Errors**: `unknown` satisfies `@typescript-eslint/no-explicit-any` while preserving strict typing.
- **Strict Compliance with Constraints**: The user specified:
  - Do NOT change any other logic in the file.
  - Do NOT rename variables.
  - Do NOT refactor anything else.
  - Verification: `npm run lint` must report 0 errors, `npm run typecheck` must report 0 errors.

### Alternatives Evaluated

1. **Change return type to `void` (`((this: GlobalEventHandlers, ev: Event) => void) | null`)**:
   - *Rejected*: In TypeScript, assigning an existing handler whose return type might not be `void` (or that returns an expression) could in certain strict compiler setups or custom handlers present type incompatibilities. More importantly, DOM `onplaying` handler signatures in TypeScript DOM lib are defined as `((this: GlobalEventHandlers, ev: Event) => any) | null`. Typing the return type as `unknown` accepts any function return type without error and accurately communicates that the return value is ignored.

2. **Disable rule via inline comment (`// eslint-disable-next-line @typescript-eslint/no-explicit-any`)**:
   - *Rejected*: Violates best practices. ESLint suppression comments clutter code and bypass type safety rather than fixing the type definition. The user explicitly directed changing `any` to `unknown`.

3. **Refactor audio wrapper into a WeakMap or external helper**:
   - *Rejected*: Violates the explicit constraint: "KHÔNG được sửa bất kỳ logic nào khác trong file, không đổi tên biến, không refactor thêm."
