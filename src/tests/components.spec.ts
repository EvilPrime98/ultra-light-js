import { describe, expect, it, suite, beforeAll } from 'vitest';
import { Window } from 'happy-dom';
import {
    parseHTMLString,
    UltraComponent,
    ultraState,
    type UltraLightElement
} from '../ultra-light';

const time_out = 1 * 1000;

describe('Components', () => {

    const happyWindow = new Window({ url: 'about:blank' });
    const document = happyWindow.document;
    const window = happyWindow;
    document.write('<!doctype html><html><body></body></html>');

    suite('parseHTMLString', () => {

        it('should return (null) from an empty HTML string', () => {
            const result = parseHTMLString(
                '', 
                document as unknown as Document
            );
            expect(result).toBeNull();
        });

        it('should return (null) from an invalid HTML string', () => {
            const result = parseHTMLString(
                'foo', 
                document as unknown as Document
            );
            expect(result).toBeNull();
        });

        it('should return (HTMLUnknownElement) from a valid HTML string with invalid tags', () => {
            const $unknown = parseHTMLString(
                '<foo></foo>', 
                document as unknown as Document
            );
            expect($unknown).toBeInstanceOf(window.HTMLUnknownElement);
        });

        it('should return a valid HTMLElement from a valid HTML string', () => {
            const $div = parseHTMLString('<div></div>', document as unknown as Document);
            expect($div).toBeInstanceOf(window.HTMLDivElement);
        });

        it('should return a valid HTMLElement with attributes from a valid HTML string', () => {
            const $div = parseHTMLString('<div id="foo"></div>', document as unknown as Document);
            expect($div).toBeInstanceOf(window.HTMLDivElement);
            expect(($div as HTMLElement)?.id).toBe('foo');
        });

        it('should return a valid HTMLElement with children from a valid HTML string', () => {
            const $div = parseHTMLString(
                `<div id="foo">
                    <p id="bar">Hello, world!</p>
                </div>`,
                document as unknown as Document
            );
            expect($div).toBeInstanceOf(window.HTMLDivElement);
            const $child = ($div as HTMLElement)?.children[0];
            expect($child).toBeInstanceOf(window.HTMLParagraphElement);
            expect($child?.textContent).toBe('Hello, world!');
            expect($child?.id).toBe('bar');
        });

        it('should return (null) from a whitespace-only string', () => {
            const result = parseHTMLString(
                '   ',
                document as unknown as Document
            );
            expect(result).toBeNull();
        });

        it('should return the same element if a non-string (HTMLElement) is provided', () => {
            const $el = document.createElement('div') as unknown as HTMLElement;
            const result = parseHTMLString(
                $el as unknown as HTMLElement,
                document as unknown as Document
            );
            expect(result).toBe($el);
        });

        it('should return only the first element from a string with multiple sibling elements', () => {
            const $first = parseHTMLString(
                '<div id="first"></div><div id="second"></div>',
                document as unknown as Document
            );
            expect($first).toBeInstanceOf(window.HTMLDivElement);
            expect(($first as HTMLElement)?.id).toBe('first');
        });

        it('should return a valid SVGElement from a valid SVG string', () => {
            const $svg = parseHTMLString(
                '<svg></svg>',
                document as unknown as Document
            );
            expect($svg).toBeInstanceOf(window.SVGElement);
            expect(($svg as Element)?.tagName.toLowerCase()).toBe('svg');
        });

        it('should return a valid SVGElement for SVG child elements', () => {
            const $circle = parseHTMLString(
                '<circle cx="50" cy="50" r="40"/>',
                document as unknown as Document
            );
            expect($circle).toBeInstanceOf(window.SVGElement);
            expect(($circle as Element)?.tagName.toLowerCase()).toBe('circle');
        });

        it('should return a valid HTMLElement from an HTMLElement node', () => {
            const $result = parseHTMLString(
                document.createElement('div') as unknown as HTMLElement,
                document as unknown as Document
            );
            expect($result).toBeInstanceOf(window.HTMLDivElement);
        });

    }, time_out);

    suite('UltraComponent', () => {

        beforeAll(() => {
            Object.assign(globalThis, { window: happyWindow, document: happyWindow.document });
        });

        it('should return an HTMLElement from a valid HTML string', () => {
            const $el = UltraComponent({ component: '<div></div>' });
            expect($el).toBeInstanceOf(window.HTMLDivElement);
        });

        it('should return a fallback (div) when given an invalid component', () => {
            const $el = UltraComponent({ component: 'not-html' });
            expect($el).toBeInstanceOf(window.HTMLDivElement);
        });

        it('should expose a _cleanup function on the returned element', () => {
            const $el = UltraComponent({ component: '<div></div>' });
            expect($el._cleanup).toBeInstanceOf(Function);
        });

        it('should attach event handlers to the element', () => {
            let clicked = false;
            const $el = UltraComponent({
                component: '<button></button>',
                eventHandler: { click: () => { clicked = true; } }
            });
            $el.click();
            expect(clicked).toBe(true);
        });

        it('should remove event handlers when _cleanup is called', () => {
            let clickCount = 0;
            const $el = UltraComponent({
                component: '<button></button>',
                eventHandler: { click: () => { clickCount++; } }
            });
            $el.click();
            expect(clickCount).toBe(1);
            $el._cleanup?.();
            $el.click();
            expect(clickCount).toBe(1);
        });

        it('should apply CSS styles to the element', () => {
            const $el = UltraComponent({
                component: '<div></div>',
                styles: { color: 'red' }
            });
            expect(($el as HTMLElement).style.color).toBe('red');
        });

        it('should apply class names to the element', () => {
            const $el = UltraComponent({
                component: '<div></div>',
                className: ['foo', 'bar']
            });
            expect($el.classList.contains('foo')).toBe(true);
            expect($el.classList.contains('bar')).toBe(true);
        });

        it('should append children to the element', () => {
            const $el = UltraComponent({
                component: '<div></div>',
                children: ['<p>Hello</p>', '<span>World</span>']
            });
            expect($el.children.length).toBe(2);
            expect($el.children[0]).toBeInstanceOf(window.HTMLParagraphElement);
            expect($el.children[1]).toBeInstanceOf(window.HTMLSpanElement);
        });

        it('should skip null children', () => {
            const $el = UltraComponent({
                component: '<div></div>',
                children: ['<p>Hello</p>', null, '<span>World</span>']
            });
            expect($el.children.length).toBe(2);
        });

        it('should call children _cleanup functions when parent _cleanup is called', () => {
            let childCleanupCalled = false;
            const $child = document.createElement('div') as unknown as UltraLightElement;
            $child._cleanup = () => { childCleanupCalled = true; };
            const $el = UltraComponent({
                component: '<div></div>',
                children: [$child as unknown as HTMLElement]
            });
            $el._cleanup?.();
            expect(childCleanupCalled).toBe(true);
        });

        it('should call triggerFunction when the subscriber notifies', () => {
            const [, set, subscriber] = ultraState(0);
            let triggered = false;
            UltraComponent({
                component: '<div></div>',
                trigger: [{ subscriber, triggerFunction: () => { triggered = true; } }]
            });
            set(1);
            expect(triggered).toBe(true);
        });

        it('should unsubscribe triggers when _cleanup is called', () => {
            const [, set, subscriber] = ultraState(0);
            let triggerCount = 0;
            const $el = UltraComponent({
                component: '<div></div>',
                trigger: [{ subscriber, triggerFunction: () => { triggerCount++; } }]
            });
            set(1);
            expect(triggerCount).toBe(1);
            $el._cleanup?.();
            set(2);
            expect(triggerCount).toBe(1);
        });

        it('should call custom cleanup functions when _cleanup is called', () => {
            let cleanupCalled = false;
            const $el = UltraComponent({
                component: '<div></div>',
                cleanup: [() => { cleanupCalled = true; }]
            });
            $el._cleanup?.();
            expect(cleanupCalled).toBe(true);
        });

    }, time_out);

});