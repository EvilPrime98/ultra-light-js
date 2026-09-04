---
"ultra-light-js": patch
---

Fixed `dist/ultra-light.js`'s relative import of `./types` missing the file extension, which broke Node's native ESM resolution (`ERR_MODULE_NOT_FOUND`) for any consumer not going through a bundler's permissive resolver (plain `node`, Vitest with the default externalized `node_modules` handling, Jest-ESM, ts-node ESM, Deno via npm specifier). Bundler-based consumers (Vite, webpack, esbuild, rollup) were unaffected and remain unaffected. The public API and `exports` map are unchanged.
