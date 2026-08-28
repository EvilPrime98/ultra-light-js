---
'ultra-light-js': patch
---

`parseHTMLString` now reuses a per-`Document` `<template>` / `<svg>` parse host instead of allocating a fresh one on every call, removing an element allocation from the library's hottest path. The public signature is unchanged and every call site that adopts the result via `appendChild` / `replaceChildren` behaves exactly as before. Multi-document callers (e.g. `happy-dom`) keep their own cached host via a `WeakMap`, so a detached document and its host are collected together.

One observable nuance: the returned node is now fully detached (`parentNode === null`) the moment `parseHTMLString` returns, rather than still being parented to a throwaway host until the caller adopts it.
