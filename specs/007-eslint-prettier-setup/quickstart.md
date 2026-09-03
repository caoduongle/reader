# Quickstart & Verification Guide: ESLint 9 & Prettier Tooling

**Feature Branch**: `007-eslint-prettier-setup`  
**Date**: 2026-09-03  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  

---

## 1. Developer Tooling Commands

### Linting
```bash
# Check code with ESLint 9
npm run lint

# Automatically fix simple ESLint formatting/rule issues
npm run lint:fix
```

### Static Typechecking
```bash
# Verify TypeScript types without emitting build artifacts
npm run typecheck
```

### Code Formatting
```bash
# Format codebase with Prettier
npm run format
```

---

## 2. Verification Workflow

1. **Format verification**:
   - Run `npm run format`
   - Run `git diff` to ensure only whitespace and styling changes occurred.
2. **Linting verification**:
   - Run `npm run lint`
   - Confirm 0 fatal configuration crashes and list any remaining manual warnings.
3. **Typecheck verification**:
   - Run `npm run typecheck`
   - Verify exit code 0.
4. **Build verification**:
   - Run `npm run build`
   - Verify exit code 0.
