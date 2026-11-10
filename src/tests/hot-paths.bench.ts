import { bench, describe, beforeAll } from 'vitest';
import { Window } from 'happy-dom';

// Same caveat as parse-html-string.bench.ts: happy-dom measures JS-side overhead
// only. Use for relative before/after comparison, not browser parity.
const BENCH_OPTS = { time: 500, warmupTime: 200 };

const happyWindow = new Window({ url: 'http://localhost/' });
// The library reads the globals `window`/`document` in several components.
Object.assign(globalThis, {
    window: happyWindow,
    document: happyWindow.document,
    requestAnimationFrame: () => 0,
    PopStateEvent: happyWindow.PopStateEvent,
});

const lib = await import('../ultra-light.js');
const {
    ultraState, ultraCompState, UltraComponent, UltraRouter, ultraNavigate,
    ultraStyles, ultraStyles2, ultraQuery, ultraReplaceChildren, ultraScope,
} = lib;

describe('ultraState', () => {
    const [, set, subscribe] = ultraState(0);
    for (let i = 0; i < 10; i++) subscribe(() => {});
    let n = 0;
    bench('set with 10 subscribers', () => { set(++n); }, BENCH_OPTS);

    bench('create + subscribe + unsubscribe', () => {
        const [, , sub] = ultraState(0);
        sub(() => {})();
    }, BENCH_OPTS);

    bench('ultraCompState (10 keys) create', () => {
        ultraCompState({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10 });
    }, BENCH_OPTS);

    bench('ultraScope with 20 subscriptions + dispose', () => {
        const [, dispose] = ultraScope(() => {
            const [, , sub] = ultraState(0);
            for (let i = 0; i < 20; i++) sub(() => {});
        });
        dispose();
    }, BENCH_OPTS);
});

describe('UltraComponent', () => {
    const [, , sub] = ultraState(0);
    bench('flat component with props', () => {
        UltraComponent({
            component: '<div></div>',
            className: ['a', 'b'],
            attributes: { id: 'x', 'data-k': 'v' },
            styles: { color: 'red' },
            eventHandler: { click: () => {} },
            trigger: [{ subscriber: sub, triggerFunction: () => {} }],
        });
    }, BENCH_OPTS);

    bench('tree: 1 parent x 50 children, then cleanup', () => {
        const kids = Array.from({ length: 50 }, () =>
            UltraComponent({ component: '<li></li>', eventHandler: { click: () => {} } }));
        const root = UltraComponent({ component: '<ul></ul>', children: kids });
        root._cleanup?.();
    }, BENCH_OPTS);

    bench('ultraReplaceChildren (50 -> 50)', () => {
        const parent = document.createElement('div');
        const mk = () => Array.from({ length: 50 }, () => UltraComponent({ component: '<i></i>' }));
        ultraReplaceChildren(parent, ...mk());
        ultraReplaceChildren(parent, ...mk());
    }, BENCH_OPTS);
});

describe('UltraRouter', () => {
    beforeAll(() => { happyWindow.history.pushState({}, '', '/'); });
    const routes = [
        ...Array.from({ length: 20 }, (_, i) => ({
            path: `/r${i}/:id`,
            component: () => UltraComponent({ component: '<div></div>' }),
        })),
        { path: '/', component: () => UltraComponent({ component: '<div></div>' }) },
        { path: '/*', component: () => UltraComponent({ component: '<div>404</div>' }) },
    ];
    const router = UltraRouter(...routes);
    let i = 0;
    bench('navigate (param route, 22 routes)', () => {
        ultraNavigate({ href: `/r19/${i++}` });
    }, BENCH_OPTS);
    bench('navigate (wildcard fallback)', () => {
        ultraNavigate({ href: `/nope/${i++}` });
    }, BENCH_OPTS);
    void router;
});

describe('ultraStyles', () => {
    let n = 0;
    const css = (k: number) => `.a${k}{color:red}.b${k}{margin:0}.c${k}:hover{x:y}`;
    bench('new css string (hash + inject)', () => { ultraStyles(css(n++)); }, BENCH_OPTS);
    ultraStyles(css(-1));
    bench('cache hit', () => { ultraStyles(css(-1)); }, BENCH_OPTS);
    let m = 0;
    bench('ultraStyles2 new object', () => {
        ultraStyles2({ box: { backgroundColor: 'red', marginTop: 4 }, t: { fontSize: m++ } });
    }, BENCH_OPTS);
});

describe('ultraQuery', () => {
    const q = ultraQuery();
    q.fetch('hot', () => Promise.resolve(1));
    bench('fetch cache hit', async () => { await q.fetch('hot', () => Promise.resolve(1)); }, BENCH_OPTS);
    let k = 0;
    bench('fetch miss + cache write', async () => {
        await q.fetch(`k${k++}`, () => Promise.resolve(k), 1_000_000);
    }, BENCH_OPTS);
});
