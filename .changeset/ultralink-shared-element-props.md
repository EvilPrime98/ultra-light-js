---
"ultra-light-js": minor
---

`UltraLink` now accepts the same shared element props as `UltraComponent` and `UltraActivity` — `eventHandler`, `attributes`, `styles`, `trigger`, `onMount`, and `cleanup` — applied to the underlying anchor element. `UltraComponent`, `UltraActivity`, and `UltraLink` now share this prop shape and its application logic through a new exported `UltraElementProps` type, instead of each declaring its own ad-hoc superset/subset.

As part of this, `UltraActivity`'s `onMount` callbacks now respect `ultraScope` disposal the same way `UltraComponent`'s already did (a pending callback is skipped if its owning scope is disposed before the next frame).
