import { Window } from 'happy-dom';
import { parseHTMLString } from './ultra-light.js';
import type {
    UltraRenderableElement,
    UltraLightElement
} from './types.js';

/**
 * A component factory: a zero-argument function that returns renderable markup.
 * The same shape the client passes to `UltraComponent` / `UltraRouter` route
 * components, so a root factory can be shared between server and client.
 */
export type UltraFactory = () =>
    | UltraRenderableElement
    | UltraLightElement
    | DocumentFragment
    | null;

/** Options for {@link renderToString}. */
export interface RenderToStringOptions {
    /**
     * URL used to seed the scratch window's `location`. `UltraRouter` reads
     * `window.location.pathname`, so a factory that mounts a router renders the
     * route matching this URL. Defaults to `'http://localhost/'`.
     */
    url?: string;
}

/** Result of {@link renderToString}. */
export interface RenderToStringResult {
    /** Serialized HTML of the factory's returned subtree. `''` when the factory returns `null`. */
    html: string;
    /**
     * Critical CSS collected from the `<style id="ultra-styles">` element that
     * `ultraStyles` / `ultraStyles2` populate during the render. `''` when the
     * factory registered no scoped styles.
     */
    css: string;
}

/**
 * @internal
 * The globals {@link installDom} overwrites, captured so {@link renderToString}
 * can restore the process to its prior state even when the factory throws.
 */
interface DomBackup {
    hadWindow: boolean;
    window: unknown;
    hadDocument: boolean;
    document: unknown;
    hadRaf: boolean;
    raf: unknown;
    hadCaf: boolean;
    caf: unknown;
}

/**
 * @internal
 * Points the process globals the framework reads (`window`, `document`,
 * `requestAnimationFrame`) at a fresh `happy-dom` window. `requestAnimationFrame`
 * becomes a no-op. This stops the `onMount` callbacks and deferred triggers that
 * a server render registers. The server sends the first synchronous markup only.
 *
 * The shim is process-wide, so two `renderToString` calls must not overlap in one
 * process. This is acceptable for a build-time single-entry prerender. To remove
 * the shim, pass an explicit `document` to every component factory.
 */
function installDom(url: string): { restore: () => void } {
    const scratchWindow = new Window({ url });
    const scratchDocument = scratchWindow.document;
    scratchDocument.write('<!doctype html><html><head></head><body></body></html>');

    const g = globalThis as unknown as Record<string, unknown>;

    const backup: DomBackup = {
        hadWindow: 'window' in g,
        window: g.window,
        hadDocument: 'document' in g,
        document: g.document,
        hadRaf: 'requestAnimationFrame' in g,
        raf: g.requestAnimationFrame,
        hadCaf: 'cancelAnimationFrame' in g,
        caf: g.cancelAnimationFrame
    };

    g.window = scratchWindow;
    g.document = scratchDocument;
    g.requestAnimationFrame = () => 0;
    g.cancelAnimationFrame = () => undefined;

    const restore = (): void => {
        if (backup.hadWindow) g.window = backup.window;
        else delete g.window;
        if (backup.hadDocument) g.document = backup.document;
        else delete g.document;
        if (backup.hadRaf) g.requestAnimationFrame = backup.raf;
        else delete g.requestAnimationFrame;
        if (backup.hadCaf) g.cancelAnimationFrame = backup.caf;
        else delete g.cancelAnimationFrame;
    };

    return { restore };
}

/** @internal Serializes a parsed node to an HTML string. */
function serializeNode(node: Node | null): string {
    if (!node) return '';
    // DOCUMENT_FRAGMENT_NODE: concatenate each child's own serialization.
    if (node.nodeType === 11) {
        let out = '';
        node.childNodes.forEach(child => {
            out += serializeNode(child);
        });
        return out;
    }
    return 'outerHTML' in node ? (node as Element).outerHTML : (node.textContent ?? '');
}

/**
 * Runs a component factory in Node and returns its markup as a string, plus any
 * scoped CSS the factory registered.
 *
 * The factory runs against a throwaway `happy-dom` document. `requestAnimationFrame`
 * is stubbed out, so `onMount` callbacks and deferred triggers do **not** run. The
 * result is the first synchronous render. Guard browser-only code in the factory
 * (`fetch`, `window`-only APIs, async `ultraQuery`) with `typeof window !== 'undefined'`
 * or a similar check.
 *
 * Not safe to call concurrently within one process. It installs process-wide DOM
 * globals and restores them only when the call returns.
 *
 * @param factory Zero-arg function returning the root markup to serialize.
 * @param options See {@link RenderToStringOptions}.
 * @returns `{ html, css }` — see {@link RenderToStringResult}.
 */
export function renderToString(
    factory: UltraFactory,
    options: RenderToStringOptions = {}
): RenderToStringResult {
    const url = options.url ?? 'http://localhost/';

    const { restore } = installDom(url);
    try {
        const produced = factory();
        const node =
            produced == null
                ? null
                : parseHTMLString(produced, globalThis.document);
        const html = serializeNode(node);
        const styleEl = globalThis.document.getElementById('ultra-styles');
        const css = styleEl?.textContent ?? '';
        return { html, css };
    } finally {
        restore();
    }
}
