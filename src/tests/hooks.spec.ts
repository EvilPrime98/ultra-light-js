import { describe, expect, it, suite } from 'vitest';
import { parseHTML } from 'linkedom';
import {
    ultraState,
    UltraContext
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

});