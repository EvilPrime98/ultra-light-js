---
"ultra-light.js": patch
---

Fix npm publish readiness: add `engines`, `sideEffects`, `main` fallback, and `publishConfig` to `package.json`; migrate package manager from npm to pnpm; add CI and Changesets-based release workflows; fix `eslint.config.mjs` using the non-existent `tseslint.defineConfig` API; eliminate unsafe `any` usage across source and tests for full lint compliance. No public API or runtime behavior changes.
