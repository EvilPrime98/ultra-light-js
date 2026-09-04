import { bench, describe } from 'vitest';
import { Window } from 'happy-dom';
import { parseHTMLString } from '../ultra-light.js';

// happy-dom is not a real browser. This suite measures the JS-side overhead of
// parseHTMLString only. Use the numbers for a relative before/after comparison.
// Issues #32, #33, and #34 all change the parser internals. Do not read the
// numbers as browser parity. `time` and `warmupTime` are pinned low, but set
// here, so a local run and the CI job sample the same way.
const BENCH_OPTS = { time: 500, warmupTime: 200 };

const happyWindow = new Window({ url: 'about:blank' });
const doc = happyWindow.document as unknown as Document;

const SMALL = '<div class="x"></div>';

const MEDIUM = `
<article class="card">
  <header><h2>Title</h2><span class="badge">new</span></header>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  <ul><li>one</li><li>two</li><li>three</li></ul>
  <footer><button>OK</button><button>Cancel</button></footer>
</article>`;

// ~120 elements. The suite builds it once, so every run parses the same input.
const LARGE = `<ul class="grid">${Array.from(
    { length: 120 },
    (_, i) => `<li class="row"><span class="i">${i}</span><a href="#${i}">link ${i}</a></li>`,
).join('')}</ul>`;

const SVG =
    '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/><rect x="10" y="10" width="20" height="20"/></svg>';

describe('parseHTMLString', () => {
    bench('small — single element', () => {
        parseHTMLString(SMALL, doc);
    }, BENCH_OPTS);

    bench('medium — nested component (~15 elements)', () => {
        parseHTMLString(MEDIUM, doc);
    }, BENCH_OPTS);

    bench('large — component (~120 elements)', () => {
        parseHTMLString(LARGE, doc);
    }, BENCH_OPTS);

    // The list-render case that #32's parse cache targets: one template, many rows.
    bench('repeated — same string parsed 50x', () => {
        for (let i = 0; i < 50; i++) parseHTMLString(SMALL, doc);
    }, BENCH_OPTS);

    bench('svg — createElementNS branch', () => {
        parseHTMLString(SVG, doc);
    }, BENCH_OPTS);
});
