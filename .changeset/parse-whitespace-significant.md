---
'ultra-light-js': minor
---

`parseHTMLString` no longer normalizes whitespace before parsing. It previously
ran `.trim().replace(/\n/g, '').replace(/\s{2,}/g, ' ')` on every call, which
corrupted whitespace-significant content — `<pre>` and `<textarea>` bodies lost
their indentation and newlines, and a newline between two words in a text node
(`foo\nbar`) was stripped with no replacement, welding them into `foobar`. The
string is now only trimmed at the ends so `TAG_REGEX` still matches sources with
leading whitespace; everything else is left to the native HTML parser, which
already discards insignificant whitespace and keeps the significant kind.

This also removes two full-string `.replace()` scans and their intermediate
allocations from the hottest path in the library — every component factory funnels
through `parseHTMLString`.

Observable change: consumers that relied on the old collapsing (for example
authored multi-line templates compared against `textContent`) will see the
original whitespace preserved instead of collapsed. The public signature is
unchanged.
