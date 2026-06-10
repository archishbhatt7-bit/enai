---
name: Auth file extension
description: React context providers with JSX must use .tsx extension, not .ts
---

**Rule:** Any file containing JSX (including React context providers like AuthProvider) must use the `.tsx` extension, not `.ts`.

**Why:** esbuild (used by Vite) does not process JSX syntax in `.ts` files. The error manifests as `Expected ">" but found "value"` at the JSX attribute position. Vite HMR also caches the old path, requiring a full workflow restart after renaming.

**How to apply:** When creating context providers, auth files, or any utility that returns JSX elements, always use `.tsx`. Only use `.ts` for pure logic without JSX.
