# ultra-light-js

## 1.6.0

### Minor Changes

- 2e18e52: `parseHTMLString` no longer normalizes whitespace before parsing. It previously
  ran `.trim().replace(/\n/g, '').replace(/\s{2,}/g, ' ')` on every call, which
  corrupted whitespace-significant content — `<pre>` and `<textarea>` bodies lost
  their indentation and newlines, and a newline between two words in a text node
  (`foo\nbar`) was stripped with no replacement, welding them into `foobar`. The
  string is now only trimmed at the ends so `TAG_REGEX` still matches sources with
  leading whitespace; everything else is left to the native HTML parser, which
  already discards insignificant whitespace and keeps the significant kind.

  This also removes two full-string `.replace()` scans and their intermediate
  allocations from the hottest path in the library — every component factory funnels
  through `parseHTMLString`.

  Observable change: consumers that relied on the old collapsing (for example
  authored multi-line templates compared against `textContent`) will see the
  original whitespace preserved instead of collapsed. The public signature is
  unchanged.

### Patch Changes

- 155435c: `parseHTMLString` now reuses a per-`Document` `<template>` / `<svg>` parse host instead of allocating a fresh one on every call, removing an element allocation from the library's hottest path. The public signature is unchanged and every call site that adopts the result via `appendChild` / `replaceChildren` behaves exactly as before. Multi-document callers (e.g. `happy-dom`) keep their own cached host via a `WeakMap`, so a detached document and its host are collected together.

  One observable nuance: the returned node is now fully detached (`parentNode === null`) the moment `parseHTMLString` returns, rather than still being parented to a throwaway host until the caller adopts it.

## 1.5.0

### Minor Changes

- 9447d49: Add `ultraReplaceChildren(parent, ...newChildren)`, a safe drop-in for native `Element.replaceChildren()` that invokes `_cleanup` on any outgoing `UltraLightElement` child before replacing, so event listeners, trigger subscriptions, and `onMount`-returned cleanups don't leak. Plain children without `_cleanup` are skipped, not touched.
- a20b57e: `UltraTrigger.triggerFunction` may now optionally return a cleanup function, the same way `onMount` does. If returned, it runs before the _next_ firing of that trigger entry (tearing down whatever the previous firing set up) and, if one is still pending, on component teardown as well — shared across every subscriber on that trigger entry. Existing `triggerFunction`s that return nothing continue to work unchanged.

## 1.4.0

### Minor Changes

- a49bfb4: Add `UltraErrorBoundary` component. Wraps one or more zero-arg component factories in a try/catch, rendering `fallback` (which receives the caught error) instead of the batch if any factory throws. A single factory's result is returned directly; multiple factories are combined with `UltraFragment` when they all succeed. Synchronous only — rejected promises from async factories are not caught.

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
