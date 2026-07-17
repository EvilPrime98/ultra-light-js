---
"ultra-light.js": minor
---

Add `ultraScope`, an implicit owner scope that auto-registers `ultraState`/`ultraCompState` subscriptions made synchronously during its execution for disposal, so callers no longer need to manually collect unsubscribe functions into a `cleanup` array. `UltraRouter` now runs each route's `component` construction inside its own scope and disposes it on navigation or router cleanup.
