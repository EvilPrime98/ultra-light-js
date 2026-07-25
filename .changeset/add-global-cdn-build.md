---
"ultra-light-js": minor
---

Add a global IIFE build (`dist/ultra-light.global.js`, exposed as `window.UltraLight`) and wire up the `unpkg`/`jsdelivr` `package.json` fields so the library can be consumed directly via `<script>` tag from a CDN, without a bundler.
