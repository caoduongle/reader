# Interface Contract: Audio Event Handler Typing

**Feature**: `041-fix-tts-eslint-any`  
**Date**: 2026-09-06

## 1. Type Signature Contract

### Target File
`src/hooks/useTTS.ts` (around line 550)

### Interface Definition
```typescript
const audioWithCustomProps = audio as unknown as {
  __originalOnPlaying?: ((this: GlobalEventHandlers, ev: Event) => unknown) | null;
};
```

### Guarantees
1. **ESLint Compatibility**: Uses `unknown` return type rather than `any`, satisfying the project's `@typescript-eslint/no-explicit-any` rule with zero lint errors.
2. **TypeScript Compilation**: Compiles with `tsc --noEmit` without type errors.
3. **Runtime Preservation**: At runtime, `typeof audioWithCustomProps.__originalOnPlaying === 'function'` is checked before executing `.call(audio, ev)`. Discarding an `unknown` return value does not cause runtime overhead or side effects.
