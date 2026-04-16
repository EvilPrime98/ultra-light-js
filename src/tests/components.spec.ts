import { describe, expect, it, suite, beforeAll, vi } from 'vitest';
import { Window } from 'happy-dom';
import {
    parseHTMLString,
    UltraComponent,
    UltraActivity,
    ultraState,
    type UltraLightElement,
    UltraRouter,
    UltraLink
} from '../ultra-light';

const time_out = 1 * 1000;
const HOST_PATH = 'about:';

describe('Components', () => {

    const happyWindow = new Window({ url: `${HOST_PATH}/` });
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

    suite('UltraActivity', () => {

        it('should set display:none when mode state is false', () => {
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => false, subscriber: () => () => { } }
            });
            expect(($el as HTMLElement).style.display).toBe('none');
        });

        it('should set display:"" when mode state is true', () => {
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => true, subscriber: () => () => { } }
            });
            expect(($el as HTMLElement).style.display).toBe('');
        });

        it('should update display when the subscriber notifies', () => {
            const ref: { update: (() => void) | null } = { update: null };
            let visible = false;
            const $el = UltraActivity({
                component: '<div></div>',
                mode: {
                    state: () => visible,
                    subscriber: (fn) => { ref.update = fn; return () => { }; }
                }
            });
            expect(($el as HTMLElement).style.display).toBe('none');
            visible = true;
            ref.update?.();
            expect(($el as HTMLElement).style.display).toBe('');
        });

        it('should stop updating display after _cleanup is called', () => {
            const ref: { update: (() => void) | null } = { update: null };
            let visible = false;
            const $el = UltraActivity({
                component: '<div></div>',
                mode: {
                    state: () => visible,
                    subscriber: (fn) => { ref.update = fn; return () => { ref.update = null; }; }
                }
            });
            $el._cleanup?.();
            visible = true;
            ref.update?.();
            expect(($el as HTMLElement).style.display).toBe('none');
        });

        it('should set visibility:hidden when mode state is false and type is "visibility"', () => {
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => false, subscriber: () => () => { } },
                type: 'visibility'
            });
            expect(($el as HTMLElement).style.visibility).toBe('hidden');
        });

        it('should set visibility:visible when mode state is true and type is "visibility"', () => {
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => true, subscriber: () => () => { } },
                type: 'visibility'
            });
            expect(($el as HTMLElement).style.visibility).toBe('visible');
        });

        it('should update visibility when the subscriber notifies and type is "visibility"', () => {
            const ref: { update: (() => void) | null } = { update: null };
            let visible = false;
            const $el = UltraActivity({
                component: '<div></div>',
                mode: {
                    state: () => visible,
                    subscriber: (fn) => { ref.update = fn; return () => { }; }
                },
                type: 'visibility'
            });
            expect(($el as HTMLElement).style.visibility).toBe('hidden');
            visible = true;
            ref.update?.();
            expect(($el as HTMLElement).style.visibility).toBe('visible');
        });

        it('should support an array of subscribers in mode', () => {
            const updates: (() => void)[] = [];
            let visible = false;
            const $el = UltraActivity({
                component: '<div></div>',
                mode: {
                    state: () => visible,
                    subscriber: [
                        (fn) => { updates.push(fn); return () => { }; },
                        (fn) => { updates.push(fn); return () => { }; }
                    ]
                }
            });
            expect(updates).toHaveLength(2);
            visible = true;
            updates[0]?.();
            expect(($el as HTMLElement).style.display).toBe('');
        });

        it('should expose a _cleanup function on the returned element', () => {
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => true, subscriber: () => () => { } }
            });
            expect($el._cleanup).toBeInstanceOf(Function);
        });

        it('should attach event handlers to the element', () => {
            let clicked = false;
            const $el = UltraActivity({
                component: '<button></button>',
                mode: { state: () => true, subscriber: () => () => { } },
                eventHandler: { click: () => { clicked = true; } }
            });
            $el.click();
            expect(clicked).toBe(true);
        });

        it('should call triggerFunction when the subscriber notifies', () => {
            const [, set, subscriber] = ultraState(0);
            let triggered = false;
            UltraActivity({
                component: '<div></div>',
                mode: { state: () => true, subscriber: () => () => { } },
                trigger: [{ subscriber, triggerFunction: () => { triggered = true; } }]
            });
            set(1);
            expect(triggered).toBe(true);
        });

        it('should unsubscribe triggers when _cleanup is called', () => {
            const [, set, subscriber] = ultraState(0);
            let triggerCount = 0;
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => true, subscriber: () => () => { } },
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
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => true, subscriber: () => () => { } },
                cleanup: [() => { cleanupCalled = true; }]
            });
            $el._cleanup?.();
            expect(cleanupCalled).toBe(true);
        });

        it('should skip null values in children array', () => {
            const $el = UltraActivity({
                component: '<div></div>',
                mode: { state: () => true, subscriber: () => () => { } },
                children: ['<span></span>', null, '<em></em>']
            });
            expect(($el as HTMLElement).children.length).toBe(2);
        });

        it('should set display:none on all DocumentFragment children when initial mode state is false', () => {
            const [getVisible, setVisible, subscribe] = ultraState(false);
            const $fragment = document.createDocumentFragment();
            const $div1 = document.createElement('div');
            const $div2 = document.createElement('div');
            $fragment.appendChild($div1);
            $fragment.appendChild($div2);
            UltraActivity({
                component: $fragment as unknown as string,
                mode: { 
                    subscriber: subscribe, 
                    state: getVisible 
                }
            });
            expect($div1.style.display).toBe('none');
            expect($div2.style.display).toBe('none');
        });

        it('should set display:"" on all DocumentFragment children when initial mode state is true', () => {
            const [getVisible, , subscribe] = ultraState(true);
            const $fragment = document.createDocumentFragment();
            const $div1 = document.createElement('div');
            const $div2 = document.createElement('div');
            $fragment.appendChild($div1);
            $fragment.appendChild($div2);
            UltraActivity({
                component: $fragment as unknown as string,
                mode: { state: getVisible, subscriber: subscribe }
            });
            expect($div1.style.display).toBe('');
            expect($div2.style.display).toBe('');
        });

        it('should reactively toggle display on DocumentFragment children when state changes', () => {
            const [getVisible, setVisible, subscribe] = ultraState(false);
            const $fragment = document.createDocumentFragment();
            const $child = document.createElement('span');
            $fragment.appendChild($child);
            UltraActivity({
                component: $fragment as unknown as string,
                mode: { state: getVisible, subscriber: subscribe }
            });
            expect($child.style.display).toBe('none');
            setVisible(true);
            expect($child.style.display).toBe('');
            setVisible(false);
            expect($child.style.display).toBe('none');
        });

        it('should set visibility:hidden on all DocumentFragment children when type is "visibility" and state is false', () => {
            const [getVisible, , subscribe] = ultraState(false);
            const $fragment = document.createDocumentFragment();
            const $div1 = document.createElement('div');
            const $div2 = document.createElement('div');
            $fragment.appendChild($div1);
            $fragment.appendChild($div2);
            UltraActivity({
                component: $fragment as unknown as string,
                mode: { state: getVisible, subscriber: subscribe },
                type: 'visibility'
            });
            expect($div1.style.visibility).toBe('hidden');
            expect($div2.style.visibility).toBe('hidden');
        });

        it('should set visibility:visible on all DocumentFragment children when type is "visibility" and state is true', () => {
            const [getVisible, , subscribe] = ultraState(true);
            const $fragment = document.createDocumentFragment();
            const $div1 = document.createElement('div');
            const $div2 = document.createElement('div');
            $fragment.appendChild($div1);
            $fragment.appendChild($div2);
            UltraActivity({
                component: $fragment as unknown as string,
                mode: { state: getVisible, subscriber: subscribe },
                type: 'visibility'
            });
            expect($div1.style.visibility).toBe('visible');
            expect($div2.style.visibility).toBe('visible');
        });

        it('should reactively toggle visibility on DocumentFragment children when state changes', () => {
            const [getVisible, setVisible, subscribe] = ultraState(true);
            const $fragment = document.createDocumentFragment();
            const $child = document.createElement('div');
            $fragment.appendChild($child);
            UltraActivity({
                component: $fragment as unknown as string,
                mode: { state: getVisible, subscriber: subscribe },
                type: 'visibility'
            });
            expect($child.style.visibility).toBe('visible');
            setVisible(false);
            expect($child.style.visibility).toBe('hidden');
        });

        it('should apply display to both pre-existing and prop-children on a DocumentFragment', () => {
            const [getVisible, , subscribe] = ultraState(false);
            const $fragment = document.createDocumentFragment();
            const $existing = document.createElement('div');
            $fragment.appendChild($existing);
            UltraActivity({
                component: $fragment as unknown as string,
                mode: { state: getVisible, subscriber: subscribe },
                children: ['<span></span>']
            });
            expect($existing.style.display).toBe('none');
        });

    }, time_out);

    suite('UltraRouter', () => {

        beforeAll(() => {
            Object.assign(globalThis, {
                window: happyWindow,
                document: happyWindow.document
            });
        });

        it('should return an HTMLDivElement with class "browser-router"', () => {
            const router = UltraRouter({
                path: '/', component: () => '<div>Home</div>'
            });
            expect(router).toBeInstanceOf(window.HTMLDivElement);
            expect(router.classList.contains('browser-router')).toBe(true);
        });

        it('should render the matching route on mount', () => {
            const router = UltraRouter({
                path: '/', component: () => '<p>Home</p>'
            });
            //@ts-expect-error
            happyWindow.document.body.appendChild(router);
            expect(router.innerHTML).toBe('<p>Home</p>');
        });

        it('should render the wildcard route when no route matches', () => {
            happyWindow.history.pushState({}, '', '/no-match');
            const router = UltraRouter(
                { path: '/', component: () => '<p>Home</p>' },
                { path: '/*', component: () => '<p>Not Found</p>' }
            );
            expect(router.querySelector('p')?.textContent).toBe('Not Found');
        });

        it('should render nothing when no route matches and there is no wildcard', () => {
            happyWindow.history.pushState({}, '', '/no-match');
            const router = UltraRouter({ path: '/', component: () => '<p>Home</p>' });
            expect(router.children.length).toBe(0);
        });

        it('should pass route params to the component function', () => {
            happyWindow.history.pushState({}, '', '/users/42');
            const router = UltraRouter({
                path: '/users/:id',
                component: ({ id } = {}) => `<p>${id}</p>`
            });
            expect(router.querySelector('p')?.textContent).toBe('42');
        });

        it('should pass multiple route params to the component function', () => {
            happyWindow.history.pushState({}, '', '/users/7/posts/99');
            const router = UltraRouter({
                path: '/users/:userId/posts/:postId',
                component: ({ userId, postId } = {}) => `<span>${userId}-${postId}</span>`
            });
            expect(router.querySelector('span')?.textContent).toBe('7-99');
        });

        it('should re-render on popstate', () => {
            happyWindow.history.pushState({}, '', '/');
            const router = UltraRouter(
                { path: '/', component: () => '<p>Home</p>' },
                { path: '/about', component: () => '<p>About</p>' }
            );
            expect(router.querySelector('p')?.textContent).toBe('Home');

            happyWindow.history.pushState({}, '', '/about');
            window.dispatchEvent(new window.PopStateEvent('popstate'));

            expect(router.querySelector('p')?.textContent).toBe('About');
        });

        it('should replace container contents on each navigation', () => {
            happyWindow.history.pushState({}, '', '/a');
            const router = UltraRouter(
                { path: '/a', component: () => '<p>A</p>' },
                { path: '/b', component: () => '<p>B</p>' }
            );
            expect(router.children.length).toBe(1);

            happyWindow.history.pushState({}, '', '/b');
            window.dispatchEvent(new window.PopStateEvent('popstate'));

            expect(router.children.length).toBe(1);
            expect(router.querySelector('p')?.textContent).toBe('B');
        });

        it('should expose a _cleanup function on the returned element', () => {
            const router = UltraRouter({ path: '/', component: () => '<div></div>' });
            expect(router._cleanup).toBeInstanceOf(Function);
        });

        it('should stop responding to popstate after _cleanup is called', () => {
            happyWindow.history.pushState({}, '', '/');
            const router = UltraRouter(
                { path: '/', component: () => '<p>Home</p>' },
                { path: '/away', component: () => '<p>Away</p>' }
            );

            router._cleanup?.();

            happyWindow.history.pushState({}, '', '/away');
            window.dispatchEvent(new window.PopStateEvent('popstate'));

            expect(router.querySelector('p')?.textContent).toBe('Home');
        });

        it('should call the active route _cleanup when the router is cleaned up', () => {
            happyWindow.history.pushState({}, '', '/');
            let routeCleanupCalled = false;
            const $el = document.createElement('div') as unknown as UltraLightElement;
            $el._cleanup = () => { routeCleanupCalled = true; };

            const router = UltraRouter({
                path: '/',
                component: () => $el as unknown as HTMLElement
            });

            router._cleanup?.();
            expect(routeCleanupCalled).toBe(true);
        });

        it('should call the previous route _cleanup when navigating away', () => {
            happyWindow.history.pushState({}, '', '/');
            let prevCleanupCalled = false;
            const $prev = document.createElement('p') as unknown as UltraLightElement;
            $prev._cleanup = () => { prevCleanupCalled = true; };

            const router = UltraRouter(
                { path: '/', component: () => $prev as unknown as HTMLElement },
                { path: '/next', component: () => '<p>Next</p>' }
            );

            happyWindow.history.pushState({}, '', '/next');
            window.dispatchEvent(new window.PopStateEvent('popstate'));

            expect(prevCleanupCalled).toBe(true);
        });

    }, time_out);

    suite('UltraLink', () => {

        beforeAll(() => {
            Object.assign(globalThis, { 
                window: happyWindow, 
                document: happyWindow.document,
                PopStateEvent: happyWindow.PopStateEvent
            });
            happyWindow.history.pushState({}, '', '/');
        });

        it('should return an HTMLAnchorElement', () => {
            const link = UltraLink({ href: '/home', children: [] });
            expect(link).toBeInstanceOf(window.HTMLAnchorElement);
        });

        it('should set the href attribute', () => {
            const link = UltraLink({ href: '/foo', children: [] }) as HTMLAnchorElement;
            expect(link.href).toBe(`${HOST_PATH}/foo`);
        });

        it('should append valid children', () => {
            const link = UltraLink({
                href: '/home',
                children: ['<span>Click me</span>', '<em>!</em>']
            });
            expect(link.children.length).toBe(2);
            expect(link.children[0]).toBeInstanceOf(window.HTMLSpanElement);
            expect(link.children[1]).toBeInstanceOf(window.HTMLElement);
        });

        it('should skip null children', () => {
            const link = UltraLink({
                href: '/home',
                children: ['<span>Click</span>', null]
            });
            expect(link.children.length).toBe(1);
        });

        it('should apply class names to the anchor element', () => {
            const link = UltraLink({
                href: '/home',
                children: [],
                className: ['nav-link', 'active']
            });
            expect(link.classList.contains('nav-link')).toBe(true);
            expect(link.classList.contains('active')).toBe(true);
        });

        it('should expose a _cleanup function', () => {
            const link = UltraLink({ href: '/home', children: [] });
            expect(link._cleanup).toBeInstanceOf(Function);
        });

        it('should warn when href is not provided', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            UltraLink({ href: '', children: [] });
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('UltraLink')
            );
            warnSpy.mockRestore();
        });

        it('should navigate to the href on click', () => {
            const link = UltraLink({ href: '/foo', children: [] });
            link.click();
            expect(window.location.pathname).toBe('/foo');
        });

        it('should not navigate when already on the target path', () => {
            happyWindow.history.pushState({}, '', '/same');
            const link = UltraLink({ href: '/same', children: [] });
            const popstateSpy = vi.fn();
            happyWindow.addEventListener('popstate', popstateSpy);
            link.click();
            expect(popstateSpy).not.toHaveBeenCalled();
            happyWindow.removeEventListener('popstate', popstateSpy);
        });

        it('should not navigate when Ctrl key is held', () => {
            happyWindow.history.pushState({}, '', '/start');
            const link = UltraLink({ href: '/ctrl-blocked', children: [] });
            const popstateSpy = vi.fn();
            window.addEventListener('popstate', popstateSpy);
            // @ts-expect-error
            link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
            expect(popstateSpy).not.toHaveBeenCalled();
            window.removeEventListener('popstate', popstateSpy);
        });

        it('should not navigate when Meta key is held', () => {
            happyWindow.history.pushState({}, '', '/start');
            const link = UltraLink({ href: '/meta-blocked', children: [] });
            const popstateSpy = vi.fn();
            window.addEventListener('popstate', popstateSpy);
            // @ts-expect-error
            link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, metaKey: true }));
            expect(popstateSpy).not.toHaveBeenCalled();
            window.removeEventListener('popstate', popstateSpy);
        });

        it('should call window.scrollTo on navigation', () => {
            happyWindow.history.pushState({}, '', '/scroll-start');
            const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => { });
            const link = UltraLink({ href: '/scroll-dest', children: [] });
            link.click();
            expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
            scrollSpy.mockRestore();
        });

        it('should call document.startViewTransition when viewTransition is true and API is available', () => {
            happyWindow.history.pushState({}, '', '/vt-start');
            const transitionSpy = vi.fn((cb: () => void) => cb());
            Object.defineProperty(document, 'startViewTransition', {
                value: transitionSpy,
                configurable: true
            });
            const link = UltraLink({ href: '/vt-dest', children: [], viewTransition: true });
            link.click();
            expect(transitionSpy).toHaveBeenCalledTimes(1);
            expect(window.location.pathname).toBe('/vt-dest');
            // @ts-expect-error — restoring to undefined to not affect other tests
            delete document.startViewTransition;
        });

        it('should navigate without transition when viewTransition is true but API is unavailable', () => {
            happyWindow.history.pushState({}, '', '/vt-fallback-start');
            // Ensure the API is absent
            // @ts-expect-error
            delete document.startViewTransition;
            const popstateSpy = vi.fn();
            window.addEventListener('popstate', popstateSpy);
            const link = UltraLink({ href: '/vt-fallback-dest', children: [], viewTransition: true });
            link.click();
            expect(window.location.pathname).toBe('/vt-fallback-dest');
            expect(popstateSpy).toHaveBeenCalledTimes(1);
            window.removeEventListener('popstate', popstateSpy);
        });

        it('should not call document.startViewTransition when viewTransition is false', () => {
            happyWindow.history.pushState({}, '', '/no-vt-start');
            const transitionSpy = vi.fn((cb: () => void) => cb());
            Object.defineProperty(document, 'startViewTransition', {
                value: transitionSpy,
                configurable: true
            });
            const link = UltraLink({ href: '/no-vt-dest', children: [], viewTransition: false });
            link.click();
            expect(transitionSpy).not.toHaveBeenCalled();
            // @ts-expect-error
            delete document.startViewTransition;
        });

    }, time_out);

});