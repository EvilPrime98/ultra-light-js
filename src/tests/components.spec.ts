import { describe, expect, it, suite } from 'vitest';
import { Window } from 'happy-dom';
import {
    parseHTMLString
} from '../ultra-light';

const time_out = 1 * 1000;

describe('hooks', () => {

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

});