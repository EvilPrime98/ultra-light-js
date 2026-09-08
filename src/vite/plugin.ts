import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { renderToString, type UltraFactory } from '../ssr.js';

/** User-facing options for {@link ultraSSR}. */
export interface UltraSSRPluginOptions {
    /**
     * Path to a module that default-exports the root component factory. The plugin
     * resolves a relative path against the Vite project root. The module must be
     * plain importable ESM. Do not use Vite-only import syntax (path aliases,
     * `?raw`, CSS imports). A native dynamic `import()` loads the module.
     */
    entry: string;
    /** Path to the HTML template. Defaults to `<root>/index.html`. */
    template?: string;
    /** `id` of the mount container in the template. Defaults to `'app'`. */
    appId?: string;
    /** Filename of the emitted prerendered HTML. Defaults to `'index.ssr.html'`. */
    ssrFileName?: string;
    /**
     * Filename of the emitted bootstrap module that the prerendered HTML loads.
     * Defaults to `'entry.hydrate.js'`.
     */
    hydrateFileName?: string;
    /** URL passed through to {@link renderToString} to seed `window.location`. Defaults to `'http://localhost/'`. */
    url?: string;
}

/** {@link UltraSSRPluginOptions} with every default filled in. */
export type ResolvedUltraSSROptions = Required<UltraSSRPluginOptions>;

/** Options for {@link injectSSR}. */
export interface InjectSSROptions {
    /** Prerendered markup to place inside the mount container. */
    html: string;
    /** Critical CSS to inline into `<head>`. Skipped when empty. */
    css: string;
    /** `id` of the mount container to fill. */
    appId: string;
    /** `src` of the bootstrap `<script type="module">` to append to `<body>`. */
    scriptSrc: string;
}

/** @internal Escapes a string for literal use inside a `RegExp`. */
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Applies a {@link renderToString} result to an HTML template string. It fills the
 * `#<appId>` container with `html`, inlines `css` before `</head>`, and appends a
 * module `<script>` for `scriptSrc` before `</body>`. The function is pure and does
 * not touch the filesystem.
 *
 * The mount container in the template must be empty. The first `</div>` after the
 * opening tag closes it.
 *
 * @throws if no `<div id="<appId>">` is present in `template`.
 */
export function injectSSR(template: string, options: InjectSSROptions): string {
    const { html, css, appId, scriptSrc } = options;

    const container = new RegExp(
        `(<div\\b[^>]*\\bid=["']${escapeRegExp(appId)}["'][^>]*>)([\\s\\S]*?)(</div>)`,
        'i'
    );
    if (!container.test(template)) {
        throw new Error(
            `ultraSSR: no <div id="${appId}"> in the HTML template to inject prerendered markup into.`
        );
    }

    let out = template.replace(
        container,
        (_match, open: string, _inner: string, close: string) => `${open}${html}${close}`
    );

    if (css) {
        const style = `<style id="ultra-styles">${css}</style>`;
        out = out.includes('</head>')
            ? out.replace('</head>', `${style}</head>`)
            : `${style}${out}`;
    }

    if (!out.includes(scriptSrc)) {
        const script = `<script type="module" src="${scriptSrc}"></script>`;
        out = out.includes('</body>')
            ? out.replace('</body>', `${script}</body>`)
            : `${out}${script}`;
    }

    return out;
}

/**
 * Fills in {@link UltraSSRPluginOptions} defaults. It resolves a relative `entry`
 * or `template` against `root`.
 *
 * @throws if `entry` is missing.
 */
export function resolveOptions(
    options: UltraSSRPluginOptions,
    root: string
): ResolvedUltraSSROptions {
    if (!options.entry) {
        throw new Error(
            'ultraSSR: `entry` is required — a module that default-exports the root component factory.'
        );
    }
    const absolute = (p: string): string => (isAbsolute(p) ? p : resolve(root, p));
    return {
        entry: absolute(options.entry),
        template: options.template ? absolute(options.template) : resolve(root, 'index.html'),
        appId: options.appId ?? 'app',
        ssrFileName: options.ssrFileName ?? 'index.ssr.html',
        hydrateFileName: options.hydrateFileName ?? 'entry.hydrate.js',
        url: options.url ?? 'http://localhost/'
    };
}

/**
 * The `PluginContext` members that {@link runGenerateBundle} needs. The interface
 * is narrow so a test can call the `generateBundle` hook directly.
 */
interface EmitContext {
    emitFile(file: { type: 'asset'; fileName: string; source: string }): void;
    error(message: string): never;
}

/** A bundle entry as far as {@link runGenerateBundle} inspects it. */
interface BundleEntry {
    type: string;
    isEntry?: boolean;
    fileName: string;
}

/** The body of the plugin's `generateBundle` hook. */
async function runGenerateBundle(
    ctx: EmitContext,
    bundle: Record<string, BundleEntry>,
    options: ResolvedUltraSSROptions
): Promise<void> {
    const entryChunk = Object.values(bundle).find(
        chunk => chunk.type === 'chunk' && chunk.isEntry === true
    );
    if (!entryChunk) {
        ctx.error('ultraSSR: no entry chunk in the bundle to reference from the prerendered HTML.');
    }

    ctx.emitFile({
        type: 'asset',
        fileName: options.hydrateFileName,
        source: `import './${entryChunk.fileName}';\n`
    });

    let mod: { default?: unknown };
    try {
        mod = (await import(pathToFileURL(options.entry).href)) as { default?: unknown };
    } catch (err) {
        ctx.error(`ultraSSR: failed to load entry "${options.entry}": ${(err as Error).message}`);
    }
    if (typeof mod.default !== 'function') {
        ctx.error(
            `ultraSSR: entry "${options.entry}" must default-export a component factory function.`
        );
    }
    const factory = mod.default as UltraFactory;

    let template: string;
    try {
        template = await readFile(options.template, 'utf8');
    } catch {
        ctx.error(`ultraSSR: could not read the HTML template at "${options.template}".`);
    }

    const { html, css } = renderToString(factory, { url: options.url });
    const out = injectSSR(template, {
        html,
        css,
        appId: options.appId,
        scriptSrc: `/${options.hydrateFileName}`
    });

    ctx.emitFile({ type: 'asset', fileName: options.ssrFileName, source: out });
}

/**
 * Vite plugin that prerenders an ultra-light.js app at build time.
 *
 * On `vite build` it emits two files into the output directory:
 *
 * - **`ssrFileName`** (default `index.ssr.html`) — the HTML template with the
 *   app's initial markup inlined into `#<appId>` and its scoped CSS inlined into
 *   `<head>`, for a fast first paint and crawlable markup.
 * - **`hydrateFileName`** (default `entry.hydrate.js`) — a small module that loads
 *   the normal client entry chunk. The client still renders `#<appId>` from
 *   scratch on boot. A later change will adopt the server DOM in place.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite';
 * import { ultraSSR } from 'ultra-light-js/vite';
 *
 * export default defineConfig({
 *   plugins: [ultraSSR({ entry: 'src/app.ts' })]
 * });
 * ```
 */
export function ultraSSR(options: UltraSSRPluginOptions): Plugin {
    let resolved: ResolvedUltraSSROptions | undefined;
    return {
        name: 'ultra-light:ssr',
        apply: 'build',
        configResolved(config) {
            resolved = resolveOptions(options, config.root);
        },
        async generateBundle(outputOptions, bundle) {
            resolved ??= resolveOptions(options, process.cwd());
            await runGenerateBundle(this, bundle, resolved);
        }
    };
}
