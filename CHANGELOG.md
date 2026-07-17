# ultra-light-js

## 1.1.0

### Minor Changes

- 3723828: Add `ultraScope`, an implicit owner scope that auto-registers `ultraState`/`ultraCompState` subscriptions made synchronously during its execution for disposal, so callers no longer need to manually collect unsubscribe functions into a `cleanup` array. `UltraRouter` now runs each route's `component` construction inside its own scope and disposes it on navigation or router cleanup.

## 1.0.18

### Patch Changes

- c8e6763: Fix npm publish readiness: add `engines`, `sideEffects`, `main` fallback, and `publishConfig` to `package.json`; migrate package manager from npm to pnpm; add CI and Changesets-based release workflows; fix `eslint.config.mjs` using the non-existent `tseslint.defineConfig` API; eliminate unsafe `any` usage across source and tests for full lint compliance. No public API or runtime behavior changes.
