import { describe, expect, expectTypeOf, it, suite, vi, beforeAll } from 'vitest';
import { parseHTML } from 'linkedom';
import { Window } from 'happy-dom';
import {
    ultraState,
    UltraContext,
    ultraCompState,
    ultraStyles,
    ultraQuery,
    ultraNavigate,
    ultraStyles2,
    ultraQueryParams,
    ultraScope,
    type IUltraCompStateStateful
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

    suite('ultraScope', () => {

        it('should return the wrapped function\'s result unchanged', () => {
            const [result] = ultraScope(() => 42);
            expect(result).toBe(42);
        });

        it('should return a disposer function', () => {
            const [, dispose] = ultraScope(() => 0);
            expect(dispose).toBeInstanceOf(Function);
        });

        it('should auto-register ultraState subscriptions made synchronously inside the scope', () => {
            const [get, set, subscribe] = ultraState(0);
            let notified = false;

            const [, dispose] = ultraScope(() => {
                subscribe(() => { notified = true; });
            });

            dispose();
            set(get() + 1);
            expect(notified).toBe(false);
        });

        it('should auto-register ultraCompState subscriptions made synchronously inside the scope', () => {
            const comp = ultraCompState({ count: 0 });
            let notified = false;

            const [, dispose] = ultraScope(() => {
                comp.count.subscribe(() => { notified = true; });
            });

            dispose();
            comp.count.set(comp.count.get() + 1);
            expect(notified).toBe(false);
        });

        it('should NOT capture subscriptions made outside of any scope', () => {
            const [get, set, subscribe] = ultraState(0);
            let notified = false;

            subscribe(() => { notified = true; });

            set(get() + 1);
            expect(notified).toBe(true);
        });

        it('should NOT capture subscriptions made after the scope has already returned', () => {
            const [get, set, subscribe] = ultraState(0);
            let notified = false;
            let lateSubscribe: (() => void) | null = null;

            ultraScope(() => {
                lateSubscribe = () => subscribe(() => { notified = true; });
            });
            lateSubscribe!();

            set(get() + 1);
            expect(notified).toBe(true);
        });

        it('should restore the previous active scope after a nested ultraScope call', () => {
            const [outerGet, outerSet, outerSubscribe] = ultraState(0);
            const [innerGet, innerSet, innerSubscribe] = ultraState(0);
            let outerNotified = false;
            let innerNotified = false;

            const [, disposeOuter] = ultraScope(() => {
                const [, disposeInner] = ultraScope(() => {
                    innerSubscribe(() => { innerNotified = true; });
                });
                disposeInner();
                outerSubscribe(() => { outerNotified = true; });
            });

            innerSet(innerGet() + 1);
            expect(innerNotified).toBe(false);

            disposeOuter();
            outerSet(outerGet() + 1);
            expect(outerNotified).toBe(false);
        });

        it('should be safe to call the disposer more than once', () => {
            const [, , subscribe] = ultraState(0);
            let dispose: () => void = () => {};

            expect(() => {
                [, dispose] = ultraScope(() => {
                    subscribe(() => {});
                });
                dispose();
                dispose();
            }).not.toThrowError();
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

        it('state should be mutable if freeze is false', () => {
            expect(() => {
                get().a = 1;
            }).not.toThrowError();
        });

    }, time_out);

    suite('ultraState: non-primitive state: freeze option is enabled', () => {

        const [get, set, subscribe] = ultraState({
            a: 0,
            b: 0,
            c: 0,
        }, true);

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

        it('state should not be mutable if freeze is true', () => {
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
            (['a', 'b', 'c'] as const).forEach((key) => {
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

        it('should preserve a generic type parameter on a comp method instead of collapsing it to a union of all instantiations', () => {
            interface IUserPref {
                filter: 'Alphabetically' | 'Creation Date';
                comicType: 'cover' | 'detail';
            }

            interface IUserPrefCtx {
                pref: IUltraCompStateStateful<IUserPref>;
                getPref: <K extends keyof IUserPref>(prefKey: K) => IUserPref[K];
            }

            const userPref: IUserPrefCtx = ultraCompState({
                pref: { filter: 'Alphabetically', comicType: 'cover' } as IUserPref,
                getPref: <K extends keyof IUserPref>(
                    comp: IUserPrefCtx,
                    prefKey: K
                ): IUserPref[K] => comp.pref.get()[prefKey],
            });

            expectTypeOf(userPref.getPref('filter')).toEqualTypeOf<IUserPref['filter']>();
            expectTypeOf(userPref.getPref('comicType')).toEqualTypeOf<IUserPref['comicType']>();

            expect(userPref.getPref('filter')).toBe('Alphabetically');
            expect(userPref.getPref('comicType')).toBe('cover');
        });

    }, time_out);

    suite('ultraQuery', () => {

        it('should expose fetch, isFetching, hasError, cache, invalidateCache, and subscribe functions', () => {
            const q = ultraQuery();
            expect(q.fetch).toBeInstanceOf(Function);
            expect(q.isFetching).toBeInstanceOf(Function);
            expect(q.hasError).toBeInstanceOf(Function);
            expect(q.cache).toBeInstanceOf(Function);
            expect(q.invalidateCache).toBeInstanceOf(Function);
            expect(q.subscribeToFetching).toBeInstanceOf(Function);
            expect(q.subscribeToError).toBeInstanceOf(Function);
            expect(q.subscribeToCache).toBeInstanceOf(Function);
        });

        it('fetch() should call the fetcher and return data', async () => {
            const { fetch, cache } = ultraQuery();
            const fetcher = vi.fn().mockResolvedValue({ id: 1 });
            const result = await fetch('key', fetcher);
            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(result?.data).toEqual({ id: 1 });
            expect(cache()['key']).toEqual({ id: 1 });
        });

        it('fetch() should return cached data on second call without calling fetcher again', async () => {
            const { fetch } = ultraQuery();
            const fetcher = vi.fn().mockResolvedValue({ id: 2 });
            await fetch('key', fetcher);
            const result = await fetch('key', fetcher);
            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(result?.data).toEqual({ id: 2 });
        });

        it('fetch() should set isFetching to true during the request and false after', async () => {
            const { fetch, isFetching } = ultraQuery();
            let fetchingDuringRequest = false;
            const fetcher = vi.fn().mockImplementation(() => {
                fetchingDuringRequest = isFetching();
                return Promise.resolve({ id: 3 });
            });
            await fetch('key', fetcher);
            expect(fetchingDuringRequest).toBe(true);
            expect(isFetching()).toBe(false);
        });

        it('fetch() should set hasError to true when the fetcher throws', async () => {
            const { fetch, hasError } = ultraQuery();
            const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
            const result = await fetch('key', fetcher);
            expect(hasError()).toBe(true);
            expect(result?.data).toBeUndefined();
        });

        it('fetch() should reset hasError to false on a subsequent successful fetch', async () => {
            const { fetch, hasError } = ultraQuery();
            const failFetcher = vi.fn().mockRejectedValue(new Error('fail'));
            await fetch('key', failFetcher);
            expect(hasError()).toBe(true);
            const successFetcher = vi.fn().mockResolvedValue({ ok: true });
            await fetch('key', successFetcher);
            expect(hasError()).toBe(false);
        });

        it('fetch() should leave isFetching as false after an error', async () => {
            const { fetch, isFetching } = ultraQuery();
            const fetcher = vi.fn().mockRejectedValue(new Error('fail'));
            await fetch('key', fetcher);
            expect(isFetching()).toBe(false);
        });

        it('invalidateCache() should remove a key from the cache', async () => {
            const { fetch, cache, invalidateCache } = ultraQuery();
            const fetcher = vi.fn().mockResolvedValue({ id: 4 });
            await fetch('key', fetcher);
            expect(cache()['key']).toBeDefined();
            invalidateCache('key');
            expect(cache()['key']).toBeUndefined();
        });

        it('fetch() should refetch after cache invalidation', async () => {
            const { fetch, invalidateCache } = ultraQuery();
            const fetcher = vi.fn().mockResolvedValue({ id: 5 });
            await fetch('key', fetcher);
            invalidateCache('key');
            await fetch('key', fetcher);
            expect(fetcher).toHaveBeenCalledTimes(2);
        });

        it('fetch() should deduplicate concurrent in-flight requests for the same key', async () => {
            const { fetch } = ultraQuery();
            let resolve: (v: unknown) => void;
            const fetcher = vi.fn().mockImplementation(
                () => new Promise(r => { resolve = r; })
            );
            const p1 = fetch('key', fetcher);
            const p2 = fetch('key', fetcher);
            resolve!({ id: 6 });
            const [r1, r2] = await Promise.all([p1, p2]);
            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(r1?.data).toEqual({ id: 6 });
            expect(r2?.data).toEqual({ id: 6 });
        });

        it('fetch() should automatically invalidate cache after staleTime', async () => {
            vi.useFakeTimers();
            try {
                const { fetch, cache } = ultraQuery();
                const fetcher = vi.fn().mockResolvedValue({ id: 7 });
                await fetch('key', fetcher, 100);
                expect(cache()['key']).toBeDefined();
                vi.advanceTimersByTime(101);
                expect(cache()['key']).toBeUndefined();
            } finally {
                vi.useRealTimers();
            }
        });

        it('re-fetching after staleTime should not be invalidated by the old stale timer', async () => {
            vi.useFakeTimers();
            try {
                const { fetch, cache, invalidateCache } = ultraQuery();
                const fetcher = vi.fn().mockResolvedValue({ id: 8 });
                await fetch('key', fetcher, 100);
                invalidateCache('key');
                await fetch('key', fetcher, 200);
                expect(cache()['key']).toBeDefined();
                vi.advanceTimersByTime(150);
                expect(cache()['key']).toBeDefined();
                vi.advanceTimersByTime(60);
                expect(cache()['key']).toBeUndefined();
            } finally {
                vi.useRealTimers();
            }
        });

        it('subscribeToFetching() should notify when isFetching changes', async () => {
            const { fetch, subscribeToFetching } = ultraQuery();
            const events: boolean[] = [];
            subscribeToFetching(v => events.push(v));
            const fetcher = vi.fn().mockResolvedValue({ id: 9 });
            await fetch('key', fetcher);
            expect(events).toContain(true);
            expect(events[events.length - 1]).toBe(false);
        });

        it('subscribeToError() should notify when hasError becomes true', async () => {
            const { fetch, subscribeToError } = ultraQuery();
            let detected = false;
            subscribeToError(v => { if (v) detected = true; });
            const fetcher = vi.fn().mockRejectedValue(new Error('fail'));
            await fetch('key', fetcher);
            expect(detected).toBe(true);
        });

        it('subscribeToCache() should notify when a key is added or removed', async () => {
            const { fetch, invalidateCache, subscribeToCache } = ultraQuery();
            let notifications = 0;
            subscribeToCache(() => notifications++);
            const fetcher = vi.fn().mockResolvedValue({ id: 10 });
            await fetch('key', fetcher);
            expect(notifications).toBe(1);
            invalidateCache('key');
            expect(notifications).toBe(2);
        });

    }, time_out * 5);

    suite('ultraNavigate', () => {

        const happyWindow = new Window({ url: 'about:/' });

        beforeAll(() => {
            Object.assign(globalThis, {
                window: happyWindow,
                document: happyWindow.document,
                PopStateEvent: happyWindow.PopStateEvent,
            });
        });

        it('should warn and not navigate when href is empty', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const popstateSpy = vi.fn();
            happyWindow.addEventListener('popstate', popstateSpy);
            ultraNavigate({ href: '' });
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ultraNavigate'));
            expect(popstateSpy).not.toHaveBeenCalled();
            warnSpy.mockRestore();
            happyWindow.removeEventListener('popstate', popstateSpy);
        });

        it('should push history state and dispatch popstate on basic navigation', () => {
            happyWindow.history.pushState({}, '', '/start');
            const popstateSpy = vi.fn();
            happyWindow.addEventListener('popstate', popstateSpy);
            ultraNavigate({ href: '/destination' });
            expect(happyWindow.location.pathname).toBe('/destination');
            expect(popstateSpy).toHaveBeenCalledTimes(1);
            happyWindow.removeEventListener('popstate', popstateSpy);
        });

        it('should call window.scrollTo on navigation', () => {
            happyWindow.history.pushState({}, '', '/scroll-start');
            const scrollSpy = vi.spyOn(happyWindow, 'scrollTo').mockImplementation(() => { });
            ultraNavigate({ href: '/scroll-dest' });
            expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
            scrollSpy.mockRestore();
        });

        it('should navigate directly when viewTransition is false (default)', () => {
            happyWindow.history.pushState({}, '', '/no-vt-start');
            const popstateSpy = vi.fn();
            happyWindow.addEventListener('popstate', popstateSpy);
            ultraNavigate({ href: '/no-vt-dest' });
            expect(happyWindow.location.pathname).toBe('/no-vt-dest');
            expect(popstateSpy).toHaveBeenCalledTimes(1);
            happyWindow.removeEventListener('popstate', popstateSpy);
        });

        it('should call document.startViewTransition when viewTransition is true and API is available', () => {
            happyWindow.history.pushState({}, '', '/vt-start');
            const transitionSpy = vi.fn((cb: () => void) => cb());
            Object.defineProperty(happyWindow.document, 'startViewTransition', {
                value: transitionSpy,
                configurable: true,
                writable: true,
            });
            ultraNavigate({ href: '/vt-dest', viewTransition: true });
            expect(transitionSpy).toHaveBeenCalledTimes(1);
            expect(happyWindow.location.pathname).toBe('/vt-dest');
            // @ts-expect-error: startViewTransition is not optional in lib.dom types
            delete happyWindow.document.startViewTransition;
        });

        it('should fall back to direct navigation when viewTransition is true but API is unavailable', () => {
            happyWindow.history.pushState({}, '', '/vt-fallback-start');
            // @ts-expect-error: startViewTransition is not optional in lib.dom types
            delete happyWindow.document.startViewTransition;
            const popstateSpy = vi.fn();
            happyWindow.addEventListener('popstate', popstateSpy);
            ultraNavigate({ href: '/vt-fallback-dest', viewTransition: true });
            expect(happyWindow.location.pathname).toBe('/vt-fallback-dest');
            expect(popstateSpy).toHaveBeenCalledTimes(1);
            happyWindow.removeEventListener('popstate', popstateSpy);
        });

        it('should log an error and not throw when pushState fails', () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const pushStateSpy = vi.spyOn(happyWindow.history, 'pushState').mockImplementation(() => {
                throw new Error('SecurityError');
            });
            expect(() => ultraNavigate({ href: '/error-dest' })).not.toThrow();
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining('ultraNavigate'),
                expect.any(Error)
            );
            errorSpy.mockRestore();
            pushStateSpy.mockRestore();
        });

    }, time_out);

    // [agent-added]
    suite('ultraQueryParams', () => {

        const happyWindow = new Window({ url: 'about:/' });

        beforeAll(() => {
            Object.assign(globalThis, {
                window: happyWindow,
                document: happyWindow.document,
            });
        });

        it('should return an empty object when there is no query string', () => {
            happyWindow.history.pushState({}, '', '/no-query');
            expect(ultraQueryParams()).toEqual({});
        });

        it('should return a single key/value pair', () => {
            happyWindow.history.pushState({}, '', '/path?foo=bar');
            expect(ultraQueryParams()).toEqual({ foo: 'bar' });
        });

        it('should return multiple key/value pairs', () => {
            happyWindow.history.pushState({}, '', '/path?a=1&b=2&c=3');
            expect(ultraQueryParams()).toEqual({ a: '1', b: '2', c: '3' });
        });

        it('should decode URL-encoded values', () => {
            happyWindow.history.pushState({}, '', '/path?q=hello%20world&sym=%26%3D');
            expect(ultraQueryParams()).toEqual({ q: 'hello world', sym: '&=' });
        });

        it('should return the last value for a repeated key', () => {
            happyWindow.history.pushState({}, '', '/path?dup=first&dup=second');
            expect(ultraQueryParams()).toEqual({ dup: 'second' });
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

    suite('ultraStyles2', () => {

        it('should return an empty object for invalid input', () => {
            // @ts-expect-error: testing invalid input
            expect(ultraStyles2(null, document)).toEqual({});
            // @ts-expect-error: testing invalid input
            expect(ultraStyles2(123, document)).toEqual({});
            // @ts-expect-error: testing invalid input
            expect(ultraStyles2('', document)).toEqual({});
        });

        it('should return a map of class names to hashed class names', () => {
            const styles = ultraStyles2({
                'foo': { color: 'red'}
            }, document);
            expect(styles).toHaveProperty('foo');
            expect(styles['foo']).toMatch(/^foo_[a-z0-9]+$/);
        });

        it('should extract all class names from the CSS Object', () => {
            const styles = ultraStyles2({
                container: { display: 'flex' },
                title: { fontSize: '1rem' },
                subtitle: { color: 'gray' }
            }, document);
            expect(styles).toHaveProperty('container');
            expect(styles).toHaveProperty('title');
            expect(styles).toHaveProperty('subtitle');
        });

        it('all hashed class names should share the same hash suffix', () => {
            const styles = ultraStyles2({
                card: { padding: '1rem' },
                'card-body': { margin: '0' }
            }, document);
            const hashes = Object.values(styles).map(v => v.split('_').pop());
            const uniqueHashes = new Set(hashes);
            expect(uniqueHashes.size).toBe(1);
        });

        it('should return the same map for the same CSS string (cache hit)', () => {
            const css = { cached: { background: 'blue'} };
            const first = ultraStyles2(css, document);
            const second = ultraStyles2(css, document);
            expect(first).toBe(second);
        });

        it('should return different hashed names for different CSS strings', () => {
            const stylesA = ultraStyles2({ box: { color: 'red' } }, document);
            const stylesB = ultraStyles2({ box: { color: 'blue' } }, document);;
            expect(stylesA['box']).not.toBe(stylesB['box']);
        });

        it('should inject a <style> element with id "ultra-styles" into the document', () => {
            ultraStyles2({ injected: { color: 'green' } }, document);
            const styleEl = document.getElementById('ultra-styles');
            expect(styleEl).not.toBeNull();
            expect(styleEl?.tagName.toLowerCase()).toBe('style');
        });

        it('should write the scoped CSS into the style element', () => {
            const styles = ultraStyles2({ scoped: { color: 'purple' } }, document);
            const styleEl = document.getElementById('ultra-styles') as HTMLStyleElement;
            expect(styleEl.textContent).toContain(styles['scoped']);
        });

        it('should not duplicate styles for the same CSS string', () => {
            const css = { nodupe2: { color: 'pink' } };
            ultraStyles2(css, document);
            ultraStyles2(css, document);
            const styleEl = document.getElementById('ultra-styles') as HTMLStyleElement;
            const count = (styleEl.textContent?.match(/\.nodupe2_/g) ?? []).length;
            expect(count).toBe(1);
        });

        it('should not include the original unscoped class name in the injected CSS', () => {
            const styles = ultraStyles2({ original: { color: 'orange' } }, document);
            const styleEl = document.getElementById('ultra-styles') as HTMLStyleElement;
            const hashedClass = styles['original'];
            expect(styleEl.textContent).toContain(`.${hashedClass}`);
            expect(styleEl.textContent).not.toMatch(/\.original\b(?!_)/);
        });

    }, time_out);

});