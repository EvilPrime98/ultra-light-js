---
"ultra-light-js": patch
---

UltraRouter no longer constructs the `/*` wildcard component when a specific route matches, so the wildcard's `onMount` side effects don't run and its listeners can't leak on navigation. UltraComponent additionally skips pending `onMount` callbacks when its owning `ultraScope` is disposed before the next frame, and runs cleanups resolved by late async `onMount`s immediately.
