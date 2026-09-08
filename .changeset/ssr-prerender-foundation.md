---
"ultra-light-js": minor
---

Add experimental server-side prerendering. `renderToString` (new `ultra-light-js/ssr` entry) runs a component factory in Node and returns its markup plus the scoped CSS it registered. `ultraSSR` (new `ultra-light-js/vite` entry) is a Vite plugin that emits a prerendered `index.ssr.html` and an `entry.hydrate.js` bootstrap on `vite build`, for a faster first paint and crawlable markup. Both are opt-in and rely on `happy-dom` (and `vite`) as optional peer dependencies. The client still renders `#app` from scratch on boot; adopting the server DOM in place is a follow-up.
