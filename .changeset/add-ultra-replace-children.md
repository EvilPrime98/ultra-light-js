---
"ultra-light-js": minor
---

Add `ultraReplaceChildren(parent, ...newChildren)`, a safe drop-in for native `Element.replaceChildren()` that invokes `_cleanup` on any outgoing `UltraLightElement` child before replacing, so event listeners, trigger subscriptions, and `onMount`-returned cleanups don't leak. Plain children without `_cleanup` are skipped, not touched.
