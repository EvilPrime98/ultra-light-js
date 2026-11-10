// Real-browser benchmark: ultra-light.js vs hand-written vanilla (Playwright + Chromium).
// Usage: pnpm run bench:browser   [--runs=15] [--json=out.json]
// Timing covers the operation plus a forced style+layout (offsetHeight), not paint.
import process from 'node:process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const arg = (name, dflt) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? dflt;
const RUNS = Number(arg('runs', 15));
const WARMUP = 3;
const CYCLES = 200;
const jsonOut = arg('json');

const here = new URL('.', import.meta.url);
const files = {
    '/': [new URL('index.html', here), 'text/html'],
    '/vanilla.js': [new URL('vanilla.js', here), 'text/javascript'],
    '/library.js': [new URL('library.js', here), 'text/javascript'],
    '/ultra-light.global.js': [new URL('../../dist/ultra-light.global.js', here), 'text/javascript'],
};
const server = createServer((req, res) => {
    const entry = files[req.url.split('?')[0]];
    if (!entry) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': entry[1] }).end(readFileSync(entry[0]));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// setup/teardown are untimed; op is timed together with a forced layout.
const ROWS = [
    { name: 'create 1,000 rows', setup: '', op: 'impl.create(1000)', teardown: 'impl.clear()' },
    { name: 'create 10,000 rows', setup: '', op: 'impl.create(10000)', teardown: 'impl.clear()', runs: 7 },
    { name: 'update every 10th row', setup: 'impl.create(1000)', op: 'impl.update()', teardown: 'impl.clear()' },
    { name: 'select a row', setup: 'impl.create(1000); impl.select(0)', op: 'impl.select(500)', teardown: 'impl.clear()' },
    { name: 'swap two rows', setup: 'impl.create(1000)', op: 'impl.swap()', teardown: 'impl.clear()' },
    { name: 'remove one row', setup: 'impl.create(1000)', op: 'impl.remove(500)', teardown: 'impl.clear()' },
    { name: 'clear 1,000 rows', setup: 'impl.create(1000)', op: 'impl.clear()', teardown: '' },
];

const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function heap(cdp) {
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.collectGarbage');
    const { metrics } = await cdp.send('Performance.getMetrics');
    return metrics.find(m => m.name === 'JSHeapUsedSize').value;
}

async function runImpl(browser, impl) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => { throw e; });
    await page.goto(`${base}/`);
    if (impl === 'library') await page.addScriptTag({ url: '/ultra-light.global.js' });
    await page.addScriptTag({ url: `/${impl}.js` });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');

    const result = {};
    for (const row of ROWS) {
        const runs = row.runs ?? RUNS;
        const times = await page.evaluate(({ row, runs, warmup }) => {
            const run = code => new Function('impl', code)(window.impl);
            const out = [];
            for (let i = 0; i < warmup + runs; i++) {
                run(row.setup);
                document.body.offsetHeight;
                const t0 = performance.now();
                run(row.op);
                document.body.offsetHeight;
                const t1 = performance.now();
                run(row.teardown);
                if (i >= warmup) out.push(t1 - t0);
            }
            return out;
        }, { row, runs, warmup: WARMUP });
        result[row.name] = median(times);
    }

    const before = await heap(cdp);
    await page.evaluate(n => {
        for (let i = 0; i < n; i++) { window.impl.create(1000); window.impl.clear(); }
    }, CYCLES);
    const after = await heap(cdp);
    result[`mount/unmount x${CYCLES} (heap growth, KB)`] = (after - before) / 1024;

    await page.close();
    return result;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const vanilla = await runImpl(browser, 'vanilla');
const library = await runImpl(browser, 'library');
await browser.close();
server.close();

const lines = [
    `Chromium ${RUNS} runs (median), ${WARMUP} warmup. Times in ms (op + forced layout).`,
    '',
    '| row | vanilla | library | ratio |',
    '| --- | ---: | ---: | ---: |',
];
for (const name of Object.keys(vanilla)) {
    const v = vanilla[name], l = library[name];
    const heapRow = name.includes('heap');
    const fmt = x => x.toFixed(heapRow ? 0 : 2);
    const ratio = heapRow ? (l - v >= 0 ? `+${(l - v).toFixed(0)} KB` : `${(l - v).toFixed(0)} KB`) : `${(l / v).toFixed(2)}x`;
    lines.push(`| ${name} | ${fmt(v)} | ${fmt(l)} | ${ratio} |`);
}
console.log(lines.join('\n'));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ vanilla, library }, null, 2));
