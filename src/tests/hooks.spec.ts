import { describe, expect, it, suite } from 'vitest';
import { parseHTML } from 'linkedom';
import {
    ultraState,
    UltraContext,
    ultraCompState,
    ultraStyles
} from '../ultra-light';

const time_out = 1 * 1000;

describe('hooks', () => {

    const { document } = parseHTML('<!doctype html><html><body></body></html>');

    suite('ultraState: primitive state', () => {

        const [get, set, subscribe] = ultraState(0);

        it('should return stateful getter, setter, and subscriber functions', () => {
            expect(get).toBeInstanceOf(Function);
            expect(set).toBeInstanceOf(Function);
            expect(subscribe).toBeInstanceOf(Function);
        });

        it('should return the initial value', () => {
            expect(get()).toBe(0);
            expect(typeof get()).toBe('number');
        });

        it('should set the value', () => {
            set(get() + 1);
            expect(get()).toBeGreaterThan(0);
            expect(typeof get()).toBe('number');
        });

        it('subscriber should notify when the value changes', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            });
            set(get() + 1);
            expect(detected).toBe(true);
        });

        it('subscriber should NOT notify when the value does not change', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            });
            set(get());
            expect(detected).toBe(false);
        });

    }, time_out);

    suite('ultraState: non-primitive state', () => {

        const [get, set, subscribe] = ultraState({
            a: 0,
            b: 0,
            c: 0,
        });

        it('should return stateful getter, setter, and subscriber functions', () => {
            expect(get).toBeInstanceOf(Function);
            expect(set).toBeInstanceOf(Function);
            expect(subscribe).toBeInstanceOf(Function);
        });

        it('should return the initial value', () => {
            expect(get()).toEqual({
                a: 0,
                b: 0,
                c: 0,
            });
            expect(typeof get()).toBe('object');
        });

        it('should set the value', () => {
            set({ ...get(), a: get().a + 1 });
            expect(get().a).toBeGreaterThan(0);
            expect(typeof get()).toBe('object');
        });

        it('subscriber should notify when the value changes', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            });
            set({ ...get(), a: get().a + 1 });
            expect(detected).toBe(true);
        });

        it('subscriber should notify when the value does not change since it is a reference', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            });
            set({ ...get() });
            expect(detected).toBe(true);
        });

        it('state should not be mutable', () => {
            expect(() => {
                get().a = 1;
            }).toThrowError();
        });

    }, time_out);

    suite('ultraContext: primitive state', () => {

        const { get, set, subscribe, own } = UltraContext(
            'test',
            'testContext'
        );

        const $container = document.createElement('div');
        const $child = document.createElement('div');
        const $grandchild = document.createElement('div');
        const $child2 = document.createElement('div');
        $child.appendChild($grandchild);
        $container.appendChild($child);

        it('should return stateful getter, setter, subscriber and own functions', () => {
            expect(get).toBeInstanceOf(Function);
            expect(set).toBeInstanceOf(Function);
            expect(subscribe).toBeInstanceOf(Function);
            expect(own).toBeInstanceOf(Function);
        });

        it('get() should return the initial value if no owner is set', () => {
            expect(get()).toBe('test');
        });

        it('set() should set a new value if no owner is set', () => {
            set('test2');
            expect(get()).toBe('test2');
            set('test');
        });

        it('subscribe() should notify when the value changes (no owner)', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            });
            set('test3');
            expect(detected).toBe(true);
            set('test');
        });

        it('own() should set a new owner', () => {
            own($container);
        });

        it('own() can not be called more than once', () => {
            expect(() => {
                own($container);
            }).toThrowError();
        });

        it('get() should return "undefined" if context is unreachable', () => {
            expect(get()).toBe('undefined');
            expect(get($child2)).toBe('undefined');
        });

        it('set() should NOT set a new value if context is unreachable', () => {
            set('test5');
            expect(get()).not.toBe('test5');
            set('test5', $child2);
            expect(get()).not.toBe('test5');
        });

        it('subscribe() should NOT notify if context is unreachable', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            }, $child2);
            set('test2', $child);
            expect(detected).toBe(false);
            set('test', $child);
        });

        it('get() should return the initial value if context is reachable', () => {
            expect(get($child)).toBe('test');
            expect(get($grandchild)).toBe('test');
        });

        it('set() should set a new value if context is reachable', () => {
            set('test2', $child);
            expect(get($child)).toBe('test2');
            set('test', $child);
            set('test2', $grandchild);
            expect(get($grandchild)).toBe('test2');
            set('test', $grandchild);
        });

        it('subscribe() should notify when the value changes (context is reachable)', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            }, $child);
            set('test2', $child);
            expect(detected).toBe(true);
        });

    }, time_out);

    suite('ultraContext: non-primitive state', () => {

        const { get, set, subscribe, own } = UltraContext(
            { a: 0, b: 0 },
            'testContext'
        );

        const $container = document.createElement('div');
        const $child = document.createElement('div');
        const $grandchild = document.createElement('div');
        const $outsider = document.createElement('div');
        $child.appendChild($grandchild);
        $container.appendChild($child);

        it('should return stateful getter, setter, subscriber and own functions', () => {
            expect(get).toBeInstanceOf(Function);
            expect(set).toBeInstanceOf(Function);
            expect(subscribe).toBeInstanceOf(Function);
            expect(own).toBeInstanceOf(Function);
        });

        it('get() should return the initial value if no owner is set', () => {
            expect(get().a).toBe(0);
            expect(get().b).toBe(0);
        });

        it('set() should set a new value if no owner is set', () => {
            set({ a: 1, b: 1 });
            expect(get().a).toBe(1);
            expect(get().b).toBe(1);
            set({ a: 0, b: 0 });
        });

        it('subscribe() should notify when the value changes (no owner)', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            });
            set({ a: 1, b: 1 });
            expect(detected).toBe(true);
            set({ a: 0, b: 0 });
        });

        it('own() should set a new owner', () => {
            own($container);
        });

        it('own() can not be called more than once', () => {
            expect(() => {
                own($container);
            }).toThrowError();
        });

        it('get() should return "undefined" if context is unreachable', () => {
            expect(get()).toBe('undefined');
            expect(get($outsider)).toBe('undefined');
        });

        it('set() should NOT set a new value if context is unreachable', () => {
            set({ a: 1, b: 1 });
            expect(get($child).a).toBe(0);
            expect(get($child).b).toBe(0);
            set({ a: 1, b: 1 }, $outsider);
            expect(get($child).a).toBe(0);
            expect(get($child).b).toBe(0);
        });

        it('subscribe() should NOT notify if context is unreachable', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            }, $outsider);
            set({ a: 1, b: 1 }, $child);
            expect(detected).toBe(false);
            set({ a: 0, b: 0 }, $child);
        });

        it('get() should return the initial value if context is reachable', () => {
            expect(get($child).a).toBe(0);
            expect(get($child).b).toBe(0);
            expect(get($grandchild).a).toBe(0);
            expect(get($grandchild).b).toBe(0);
        });

        it('set() should set a new value if context is reachable', () => {

            set({ a: 1, b: 1 }, $child);
            expect(get($child).a).toBe(1);
            expect(get($child).b).toBe(1);
            set({ a: 0, b: 0 }, $child);

            set({ a: 1, b: 1 }, $grandchild);
            expect(get($grandchild).a).toBe(1);
            expect(get($grandchild).b).toBe(1);
            set({ a: 0, b: 0 }, $grandchild);

        });

        it('subscribe() should notify when the value changes (context is reachable)', () => {
            let detected = false;
            subscribe(() => {
                detected = true;
            }, $child);
            set({ a: 1, b: 1 }, $child);
            expect(detected).toBe(true);
        });

    }, time_out);

    suite('ultraCompState: non-primitive state', () => {

        it('should throw an error if the initial value is not an object', () => {
            expect(() => {
                //@ts-expect-error: testing invalid initial value
                ultraCompState('test');
            }).toThrowError();
        });

        const foo = ultraCompState({
            a: 0,
            b: 0,
            c: 0,
            sum: ({ a, b, c }: typeof foo) => {
                return a.get() + b.get() + c.get();
            }
        });

        it('should return a stateful get, set and subscribe function for each key', () => {
            expect(foo.a.get).toBeInstanceOf(Function);
            expect(foo.a.set).toBeInstanceOf(Function);
            expect(foo.a.subscribe).toBeInstanceOf(Function);
            expect(foo.b.get).toBeInstanceOf(Function);
            expect(foo.b.set).toBeInstanceOf(Function);
            expect(foo.b.subscribe).toBeInstanceOf(Function);
            expect(foo.c.get).toBeInstanceOf(Function);
            expect(foo.c.set).toBeInstanceOf(Function);
            expect(foo.c.subscribe).toBeInstanceOf(Function);
            expect(foo.sum).toBeInstanceOf(Function);
        });

        it('get() should return the initial value for each key', () => {
            expect(foo.a.get()).toBe(0);
            expect(foo.b.get()).toBe(0);
            expect(foo.c.get()).toBe(0);
        });

        it('sum() should return the sum of a, b, and c', () => {
            expect(foo.sum()).toBe(0);
            foo.a.set(1);
            foo.b.set(2);
            foo.c.set(3);
            expect(foo.sum()).toBe(6);
        });

        it('set() should set a new value for each key', () => {
            foo.a.set(1);
            foo.b.set(2);
            foo.c.set(3);
            expect(foo.a.get()).toBe(1);
            expect(foo.b.get()).toBe(2);
            expect(foo.c.get()).toBe(3);
            foo.a.set(0);
            foo.b.set(0);
            foo.c.set(0);
        });

        it('subscribe() should notify when the value changes', () => {
            ['a', 'b', 'c'].forEach((key) => {
                let detected = false;
                foo[key].subscribe(() => {
                    detected = true;
                });
                foo[key].set(1);
                expect(detected).toBe(true);
                foo[key].set(0);
                expect(detected).toBe(true);
            });
        });

        it('subscribe() should NOT notify when another key changes', () => {
            let detected = false;
            foo.a.subscribe(() => {
                detected = true;
            });
            foo.b.set(1);
            expect(detected).toBe(false);
            foo.a.set(0);
        });

    }, time_out);

    suite('ultraStyles', () => {

        it('should return an empty object for invalid input', () => {
            // @ts-expect-error: testing invalid input
            expect(ultraStyles(null, document)).toEqual({});
            // @ts-expect-error: testing invalid input
            expect(ultraStyles(123, document)).toEqual({});
            expect(ultraStyles('', document)).toEqual({});
        });

        it('should return a map of class names to hashed class names', () => {
            const styles = ultraStyles('.foo { color: red; }', document);
            expect(styles).toHaveProperty('foo');
            expect(styles['foo']).toMatch(/^foo_[a-z0-9]+$/);
        });

        it('should extract all class names from the CSS string', () => {
            const styles = ultraStyles('.container { display: flex; } .title { font-size: 1rem; } .subtitle { color: gray; }', document);
            expect(styles).toHaveProperty('container');
            expect(styles).toHaveProperty('title');
            expect(styles).toHaveProperty('subtitle');
        });

        it('all hashed class names should share the same hash suffix', () => {
            const styles = ultraStyles('.card { padding: 1rem; } .card-body { margin: 0; }', document);
            const hashes = Object.values(styles).map(v => v.split('_').pop());
            const uniqueHashes = new Set(hashes);
            expect(uniqueHashes.size).toBe(1);
        });

        it('should return the same map for the same CSS string (cache hit)', () => {
            const css = '.cached { background: blue; }';
            const first = ultraStyles(css, document);
            const second = ultraStyles(css, document);
            expect(first).toBe(second);
        });

        it('should return different hashed names for different CSS strings', () => {
            const stylesA = ultraStyles('.box { color: red; }', document);
            const stylesB = ultraStyles('.box { color: blue; }', document);
            expect(stylesA['box']).not.toBe(stylesB['box']);
        });

        it('should inject a <style> element with id "ultra-styles" into the document', () => {
            ultraStyles('.injected { color: green; }', document);
            const styleEl = document.getElementById('ultra-styles');
            expect(styleEl).not.toBeNull();
            expect(styleEl?.tagName.toLowerCase()).toBe('style');
        });

        it('should write the scoped CSS into the style element', () => {
            const styles = ultraStyles('.scoped { color: purple; }', document);
            const styleEl = document.getElementById('ultra-styles') as HTMLStyleElement;
            expect(styleEl.textContent).toContain(styles['scoped']);
        });

        it('should not duplicate styles for the same CSS string', () => {
            const css = '.nodupe { color: pink; }';
            ultraStyles(css, document);
            ultraStyles(css, document);
            const styleEl = document.getElementById('ultra-styles') as HTMLStyleElement;
            const count = (styleEl.textContent?.match(/\.nodupe_/g) ?? []).length;
            expect(count).toBe(1);
        });

        it('should not include the original unscoped class name in the injected CSS', () => {
            const styles = ultraStyles('.original { color: orange; }', document);
            const styleEl = document.getElementById('ultra-styles') as HTMLStyleElement;
            const hashedClass = styles['original'];
            expect(styleEl.textContent).toContain(`.${hashedClass}`);
            expect(styleEl.textContent).not.toMatch(/\.original\b(?!_)/);
        });

    }, time_out);

});