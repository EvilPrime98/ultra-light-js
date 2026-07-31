# ultra-light-js

## 1.3.2

### Patch Changes

- a6defb1: `UltraLink` now attaches the `eventHandler` prop (including any `click` handler) before registering its internal navigation click handler, so a consumer-supplied `click` handler always runs before ultra-navigation is triggered. Previously the internal handler was registered first, so navigation could already be underway by the time the consumer's handler ran.

## 1.3.1

### Patch Changes

- cf39306: `UltraCompStateResult<T>` now correctly types comp methods that take no extra arguments (e.g. `(comp) => void`) as `() => R` instead of `<A>(arg: A) => R`. Previously, parameter-count leniency in function-type assignability let zero-arg handlers accidentally match the generic single-arg branch, forcing a spurious required argument and breaking `tsc --strict` assignment against hand-written interfaces that correctly declare them as zero-arg. Fixed arity discrimination now checks the extracted argument tuple before deciding between the zero-arg, fixed-arg, generic-arg, and multi-arg cases; the existing generic-argument-preservation behavior from the previous fix is unchanged.

## 1.3.0

### Minor Changes

- d054aa6: Add a global IIFE build (`dist/ultra-light.global.js`, exposed as `window.UltraLight`) and wire up the `unpkg`/`jsdelivr` `package.json` fields so the library can be consumed directly via `<script>` tag from a CDN, without a bundler.

## 1.2.0

### Minor Changes

- c42eacd: `UltraLink` now accepts the same shared element props as `UltraComponent` and `UltraActivity` — `eventHandler`, `attributes`, `styles`, `trigger`, `onMount`, and `cleanup` — applied to the underlying anchor element. `UltraComponent`, `UltraActivity`, and `UltraLink` now share this prop shape and its application logic through a new exported `UltraElementProps` type, instead of each declaring its own ad-hoc superset/subset.

  As part of this, `UltraActivity`'s `onMount` callbacks now respect `ultraScope` disposal the same way `UltraComponent`'s already did (a pending callback is skipped if its owning scope is disposed before the next frame).

## 1.1.2

### Patch Changes

- 936a38d: `UltraCompStateResult<T>` now preserves a comp method's generic type parameter instead of collapsing it into a union of every possible instantiation, so `ultraCompState({ ... })` methods whose return type depends on a generic argument (e.g. a keyed getter) type-check correctly at call sites and no longer require a type-safety-defeating cast.

## 1.1.1

### Patch Changes

- 6b68831: UltraRouter no longer constructs the `/*` wildcard component when a specific route matches, so the wildcard's `onMount` side effects don't run and its listeners can't leak on navigation. UltraComponent additionally skips pending `onMount` callbacks when its owning `ultraScope` is disposed before the next frame, and runs cleanups resolved by late async `onMount`s immediately.

## 1.1.0

### Minor Changes

- 3723828: Add `ultraScope`, an implicit owner scope that auto-registers `ultraState`/`ultraCompState` subscriptions made synchronously during its execution for disposal, so callers no longer need to manually collect unsubscribe functions into a `cleanup` array. `UltraRouter` now runs each route's `component` construction inside its own scope and disposes it on navigation or router cleanup.

## 1.0.18

### Patch Changes

- c8e6763: Fix npm publish readiness: add `engines`, `sideEffects`, `main` fallback, and `publishConfig` to `package.json`; migrate package manager from npm to pnpm; add CI and Changesets-based release workflows; fix `eslint.config.mjs` using the non-existent `tseslint.defineConfig` API; eliminate unsafe `any` usage across source and tests for full lint compliance. No public API or runtime behavior changes.
