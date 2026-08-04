---
"ultra-light-js": minor
---

Add `UltraErrorBoundary` component. Wraps one or more zero-arg component factories in a try/catch, rendering `fallback` (which receives the caught error) instead of the batch if any factory throws. A single factory's result is returned directly; multiple factories are combined with `UltraFragment` when they all succeed. Synchronous only — rejected promises from async factories are not caught.
