---
"ultra-light-js": patch
---

`UltraCompStateResult<T>` now preserves a comp method's generic type parameter instead of collapsing it into a union of every possible instantiation, so `ultraCompState({ ... })` methods whose return type depends on a generic argument (e.g. a keyed getter) type-check correctly at call sites and no longer require a type-safety-defeating cast.
