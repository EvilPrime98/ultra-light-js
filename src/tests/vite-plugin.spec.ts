import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { injectSSR, resolveOptions, ultraSSR, type InjectSSROptions } from '../vite/plugin.js';

describe('injectSSR', () => {

    const template =
        '<!doctype html><html><head></head><body><div id="app"></div></body></html>';
    const base: InjectSSROptions = {
        html: '<p>x</p>',
        css: '',
        appId: 'app',
        scriptSrc: '/entry.hydrate.js'
    };

    it('fills the mount container with the prerendered markup', () => {
        expect(injectSSR(template, base)).toContain('<div id="app"><p>x</p></div>');
    });

    it('appends the module bootstrap script before </body>', () => {
        expect(injectSSR(template, base)).toContain(
            '<script type="module" src="/entry.hydrate.js"></script></body>'
        );
    });

    it('does not duplicate the script when the template already has it', () => {
        const withScript = template.replace(
            '</body>',
            '<script type="module" src="/entry.hydrate.js"></script></body>'
        );
        expect(injectSSR(withScript, base).match(/entry\.hydrate\.js/g)).toHaveLength(1);
    });

    it('inlines critical CSS before </head> when present', () => {
        expect(injectSSR(template, { ...base, css: '.a{color:red}' })).toContain(
            '<style id="ultra-styles">.a{color:red}</style></head>'
        );
    });

    it('omits the style tag when there is no CSS', () => {
        expect(injectSSR(template, base)).not.toContain('ultra-styles');
    });

    it('prepends the style tag when the template has no </head>', () => {
        const out = injectSSR('<div id="app"></div></body>', { ...base, css: '.a{}' });
        expect(out.startsWith('<style id="ultra-styles">.a{}</style>')).toBe(true);
    });

    it('appends the script when the template has no </body>', () => {
        const out = injectSSR('<div id="app"></div>', base);
        expect(out.endsWith('<script type="module" src="/entry.hydrate.js"></script>')).toBe(true);
    });

    it('supports a custom appId', () => {
        expect(injectSSR('<div id="root"></div>', { ...base, appId: 'root' })).toContain(
            '<div id="root"><p>x</p></div>'
        );
    });

    it('throws when the mount container is absent', () => {
        expect(() => injectSSR('<div id="other"></div>', base)).toThrow('no <div id="app">');
    });
});

describe('resolveOptions', () => {

    it('throws when entry is missing', () => {
        expect(() => resolveOptions({ entry: '' }, '/root')).toThrow('`entry` is required');
    });

    it('fills every default and resolves relative paths against root', () => {
        const r = resolveOptions({ entry: 'src/app.ts' }, '/root');
        expect(r.appId).toBe('app');
        expect(r.ssrFileName).toBe('index.ssr.html');
        expect(r.hydrateFileName).toBe('entry.hydrate.js');
        expect(r.url).toBe('http://localhost/');
        expect(r.entry).toBe(resolve('/root', 'src/app.ts'));
        expect(r.template).toBe(resolve('/root', 'index.html'));
    });

    it('keeps absolute paths as-is and honours overrides', () => {
        const absEntry = resolve('/elsewhere/app.mjs');
        const absTemplate = resolve('/tpl/page.html');
        const r = resolveOptions(
            {
                entry: absEntry,
                template: absTemplate,
                appId: 'root',
                ssrFileName: 'out.html',
                hydrateFileName: 'boot.js',
                url: 'http://localhost/blog'
            },
            '/root'
        );
        expect(r.entry).toBe(absEntry);
        expect(r.template).toBe(absTemplate);
        expect(r.appId).toBe('root');
        expect(r.ssrFileName).toBe('out.html');
        expect(r.hydrateFileName).toBe('boot.js');
        expect(r.url).toBe('http://localhost/blog');
    });
});

describe('ultraSSR', () => {

    it('is a build-only plugin named ultra-light:ssr', () => {
        const plugin = ultraSSR({ entry: 'src/app.ts' });
        expect(plugin.name).toBe('ultra-light:ssr');
        expect(plugin.apply).toBe('build');
        expect(typeof plugin.configResolved).toBe('function');
        expect(typeof plugin.generateBundle).toBe('function');
    });
});

describe('ultraSSR generateBundle', () => {

    let dir: string;
    const entryBundle: Record<string, { type: string; isEntry: boolean; fileName: string }> = {
        'assets/index-abc.js': {
            type: 'chunk',
            isEntry: true,
            fileName: 'assets/index-abc.js'
        }
    };

    interface Emitted {
        type: string;
        fileName: string;
        source: string;
    }
    interface StubCtx {
        emitFile: (file: Emitted) => void;
        error: (message: string) => never;
    }

    beforeAll(async () => {
        dir = await mkdtemp(join(tmpdir(), 'ultra-ssr-'));
        await writeFile(join(dir, 'entry.mjs'), "export default () => '<main id=\"x\">hi</main>';\n");
        await writeFile(join(dir, 'bad.mjs'), 'export const nope = 1;\n');
        await writeFile(
            join(dir, 'index.html'),
            '<!doctype html><html><head></head><body><div id="app"></div></body></html>'
        );
    });

    afterAll(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    const callHook = (hook: unknown, thisArg: unknown, args: unknown[]): unknown => {
        if (typeof hook !== 'function') {
            throw new Error('expected the plugin hook to be a function');
        }
        return (hook as (...a: unknown[]) => unknown).apply(thisArg, args);
    };

    const makeCtx = (): { ctx: StubCtx; emitted: Emitted[] } => {
        const emitted: Emitted[] = [];
        const ctx: StubCtx = {
            emitFile: file => {
                emitted.push(file);
            },
            error: message => {
                throw new Error(message);
            }
        };
        return { ctx, emitted };
    };

    // This test skips `configResolved` on purpose. The `generateBundle` hook then
    // runs its own `process.cwd()` fallback. The absolute `entry` and `template`
    // paths make that fallback a no-op.
    const drive = (
        overrides: Partial<{ entry: string; template: string }>,
        ctx: StubCtx,
        bundle: Record<string, unknown> = entryBundle
    ): Promise<unknown> => {
        const plugin = ultraSSR({
            entry: join(dir, 'entry.mjs'),
            template: join(dir, 'index.html'),
            ...overrides
        });
        return Promise.resolve(callHook(plugin.generateBundle, ctx, [{}, bundle]));
    };

    it('emits the hydrate bootstrap and the prerendered HTML', async () => {
        const { ctx, emitted } = makeCtx();

        await drive({}, ctx);

        expect(emitted).toHaveLength(2);
        const hydrate = emitted.find(f => f.fileName === 'entry.hydrate.js');
        const ssr = emitted.find(f => f.fileName === 'index.ssr.html');
        expect(hydrate?.source).toContain("import './assets/index-abc.js'");
        expect(ssr?.source).toContain('<div id="app"><main id="x">hi</main></div>');
        expect(ssr?.source).toContain('<script type="module" src="/entry.hydrate.js"></script>');
    });

    it('runs configResolved to resolve options against the Vite root', () => {
        const plugin = ultraSSR({ entry: 'entry.mjs', template: 'index.html' });
        expect(() => callHook(plugin.configResolved, undefined, [{ root: dir }])).not.toThrow();
    });

    it('errors when the bundle has no entry chunk', async () => {
        const { ctx } = makeCtx();
        await expect(drive({}, ctx, {})).rejects.toThrow('no entry chunk');
    });

    it('errors when the entry has no default export', async () => {
        const { ctx } = makeCtx();
        await expect(drive({ entry: join(dir, 'bad.mjs') }, ctx)).rejects.toThrow(
            'must default-export'
        );
    });

    it('errors when the template file cannot be read', async () => {
        const { ctx } = makeCtx();
        await expect(drive({ template: join(dir, 'missing.html') }, ctx)).rejects.toThrow(
            'could not read the HTML template'
        );
    });
});
