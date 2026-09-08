import { describe, expect, expectTypeOf, it, suite, vi } from 'vitest';
import {
    renderToString,
    type RenderToStringResult,
    type UltraFactory
} from '../ssr.js';
import {
    UltraComponent,
    UltraFragment,
    ultraStyles2
} from '../ultra-light.js';

describe('renderToString', () => {

    suite('markup', () => {

        it('serializes a plain HTML-string factory', () => {
            const { html, css } = renderToString(() => '<p>hi</p>');
            expect(html).toBe('<p>hi</p>');
            expect(css).toBe('');
        });

        it('serializes a UltraComponent tree with children', () => {
            const { html } = renderToString(() =>
                UltraComponent({
                    component: '<div class="root"></div>',
                    children: ['<span>a</span>', '<span>b</span>']
                })
            );
            expect(html).toContain('<span>a</span>');
            expect(html).toContain('<span>b</span>');
            expect(html).toContain('class="root"');
        });

        it('concatenates the children of a DocumentFragment factory', () => {
            const { html } = renderToString(() =>
                UltraFragment('<a>x</a>', '<b>y</b>')
            );
            expect(html).toBe('<a>x</a><b>y</b>');
        });

        it('returns empty strings when the factory returns null', () => {
            expect(renderToString(() => null)).toEqual({ html: '', css: '' });
        });
    });

    suite('scoped CSS', () => {

        it('collects the styles the factory registers during render', () => {
            const { html, css } = renderToString(() => {
                const styles = ultraStyles2({ ssrBox: { color: 'red' } });
                return UltraComponent({
                    component: '<div></div>',
                    className: [styles.ssrBox]
                });
            });
            expect(css).toContain('ssrBox_');
            expect(css).toContain('color:red');
            expect(html).toContain('ssrBox_');
        });
    });

    suite('server constraints', () => {

        it('does not run onMount callbacks (requestAnimationFrame is stubbed)', () => {
            const mounted = vi.fn();
            renderToString(() =>
                UltraComponent({
                    component: '<div></div>',
                    onMount: [mounted]
                })
            );
            expect(mounted).not.toHaveBeenCalled();
        });
    });

    suite('global restoration', () => {

        it('leaves window/document as they were after a successful render', () => {
            const hadWindow = 'window' in globalThis;
            const hadDocument = 'document' in globalThis;
            renderToString(() => '<p>ok</p>');
            expect('window' in globalThis).toBe(hadWindow);
            expect('document' in globalThis).toBe(hadDocument);
        });

        it('restores the globals even when the factory throws', () => {
            const hadWindow = 'window' in globalThis;
            const boom: UltraFactory = () => {
                throw new Error('boom');
            };
            expect(() => renderToString(boom)).toThrow('boom');
            expect('window' in globalThis).toBe(hadWindow);
        });
    });

    suite('types', () => {

        it('returns a { html, css } record of strings', () => {
            expectTypeOf(renderToString).returns.toEqualTypeOf<RenderToStringResult>();
            expectTypeOf<RenderToStringResult>().toEqualTypeOf<{
                html: string;
                css: string;
            }>();
        });
    });
});
