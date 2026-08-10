---
"ultra-light-js": minor
---

`UltraTrigger.triggerFunction` may now optionally return a cleanup function, the same way `onMount` does. If returned, it runs before the *next* firing of that trigger entry (tearing down whatever the previous firing set up) and, if one is still pending, on component teardown as well — shared across every subscriber on that trigger entry. Existing `triggerFunction`s that return nothing continue to work unchanged.
