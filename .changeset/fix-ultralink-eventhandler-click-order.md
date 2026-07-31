---
"ultra-light-js": patch
---

`UltraLink` now attaches the `eventHandler` prop (including any `click` handler) before registering its internal navigation click handler, so a consumer-supplied `click` handler always runs before ultra-navigation is triggered. Previously the internal handler was registered first, so navigation could already be underway by the time the consumer's handler ran.
