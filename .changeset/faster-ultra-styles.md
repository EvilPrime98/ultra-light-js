---
"ultra-light-js": patch
---

Performance: `ultraStyles` no longer rescans and rewrites the whole `#ultra-styles` stylesheet on every new CSS string (about 6x faster injection under happy-dom). Adds hot-path benchmarks and a min+gzip size budget check in CI. No public API change.
