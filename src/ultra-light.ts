import {
    type UltraStateReturn,
    type UltraContextReturn,
    type UltraRouteMatch,
    type UltraRoute,
    type UltraTrigger,
    type UltraCleanupFunction,
    type UltraLightElement,
    type UltraLightAnchor,
    type UltraLightDiv,
    hasCleanup,
    type UltraRenderableElement,
    type UltraCompStateResult,
    type IUltraCompStateStateful,
    type AllHTMLAttributes,
    type UltraElementProps,
    type UltraErrorBoundaryProps,
    CSSProperties
} from './types';

export type {
    UltraStateReturn,
    UltraContextReturn,
    UltraRoute,
    UltraTrigger,
    UltraCleanupFunction,
    UltraLightElement,
    UltraLightAnchor,
    UltraLightDiv,
    IUltraCompStateStateful,
    UltraRenderableElement,
    UltraElementProps,
    UltraErrorBoundaryProps
}

const SVG_EXCLUSIVE_TAGS = new Set([
    'svg', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'path', 'g',
    'defs', 'symbol', 'use', 'marker', 'clipPath', 'mask', 'pattern', 'title', 'text', 'tspan',
    'linearGradient', 'radialGradient', 'meshGradient', 'stop', 'hatch', 'hatchpath',
    'animate', 'animateMotion', 'animateTransform', 'set', 'animateColor', 'mpath',
    'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
    'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight',
    'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
    'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology',
    'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
    'feTurbulence', 'view', 'font', 'glyph', 'missing-glyph', 'vkern', 'hkern',
    'color-profile', 'switch', 'cursor', 'image'
]);

const TAG_REGEX = /^<([a-z][a-z0-9-]*)/i;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @internal
 * Reusable `<template>` parse host, one for each `Document`.
 * `parseHTMLString` gives its parsed subtree to the caller. The caller adopts that
 * subtree with `appendChild` or `replaceChildren`. The host is never kept, so each
 * call can reuse it and rewrites only its `innerHTML`.
 * The `WeakMap` holds one host for each `Document`. This keeps `happy-dom` and other
 * multi-document callers on the fast path. It also lets the garbage collector remove
 * a detached `Document` and its host together.
 */
const templateHosts = new WeakMap<Document, HTMLTemplateElement>();

/** @internal Reusable `<svg>` parse host, one for each `Document`. The rationale is the same as {@link templateHosts}. */
const svgHosts = new WeakMap<Document, SVGSVGElement>();

/** @internal Returns the cached `<template>` parse host for `doc`, creating it on first use. */
function getTemplateHost(doc: Document): HTMLTemplateElement {
    let host = templateHosts.get(doc);
    if (!host) {
        host = doc.createElement('template');
        templateHosts.set(doc, host);
    }
    return host;
}

/** @internal Returns the cached `<svg>` parse host for `doc`, creating it on first use. */
function getSvgHost(doc: Document): SVGSVGElement {
    let host = svgHosts.get(doc);
    if (!host) {
        host = doc.createElementNS(SVG_NS, 'svg');
        svgHosts.set(doc, host);
    }
    return host;
}

export function parseHTMLString(
    htmlString: string | HTMLElement | Node,
    document?: Document
): HTMLElement | Node | null {
    if (!document) document = window.document;
    if (typeof htmlString !== 'string') return htmlString;
    // Trim only. TAG_REGEX is anchored `^<`, so it still matches a source string
    // that has leading whitespace. The native parser handles whitespace inside the
    // markup: it drops the insignificant kind and keeps the significant kind in
    // `<pre>` and `<textarea>`. The old code collapsed whitespace here, which
    // welded adjacent words together and removed authored indentation.
    const trimmed = htmlString.trim();
    if (!trimmed) return null;
    const tagMatch = trimmed.match(TAG_REGEX);
    if (!tagMatch) return null;
    const tag = (tagMatch[1] as string).toLowerCase();
    if (SVG_EXCLUSIVE_TAGS.has(tag)) {
        const svgHost = getSvgHost(document);
        svgHost.innerHTML = trimmed;
        const svgNode = svgHost.firstElementChild;
        // Detach the parsed subtree. This stops the shared host from holding it until the next call.
        svgHost.innerHTML = '';
        return svgNode;
    }
    const templateHost = getTemplateHost(document);
    templateHost.innerHTML = trimmed;
    const node = templateHost.content.firstElementChild;
    templateHost.innerHTML = '';
    return node;
}

function stableHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

function deepFreeze<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) return obj;
    Object.keys(obj).forEach(key => deepFreeze((obj as Record<string, unknown>)[key]));
    return Object.freeze(obj);
}

let activeScope: UltraCleanupFunction[] | null = null;

function registerInScope(unsub: UltraCleanupFunction): void {
    if (activeScope) activeScope.push(unsub);
}

/**
 * Runs `fn` inside an implicit owner scope: any `ultraState`/`ultraCompState` subscription
 * made synchronously during `fn`'s execution is auto-registered for disposal, so callers don't
 * need to manually collect and thread unsubscribe functions through a `cleanup` array.
 *
 * Only subscriptions made synchronously within `fn` are captured — anything subscribed after an
 * `await`, inside an event handler, or in a `setTimeout` runs with no active scope and still
 * needs explicit `cleanup`/`trigger` wiring.
 *
 * @param fn Function to run inside the scope. Its return value is passed through unchanged.
 * @returns A tuple of `fn`'s result and a disposer that unsubscribes everything registered during `fn`.
 */
export function ultraScope<T>(fn: () => T): [T, UltraCleanupFunction] {
    const prev = activeScope;
    const scope: UltraCleanupFunction[] = [];
    activeScope = scope;
    try {
        const result = fn();
        return [result, () => scope.forEach(unsub => {
            try {
                unsub();
            } catch (error) {
                console.error('Error while disposing ultraScope:', error);
            }
        })];
    } finally {
        activeScope = prev;
    }
}

/**
 * Returns a stateful getter, setter, and subscriber function for a given initial value.
 *
 * `subscribe` auto-registers its returned unsubscribe function with the active {@link ultraScope},
 * if any, so callers constructing state inside a scope don't need to manually collect and dispose it.
 * @param initialValue
 * @param freeze Optional parameter to freeze the state object. Default is false.
 * @returns
 */
export function ultraState<T>(initialValue: T, freeze = false): [
    () => T,
    (newValue: T) => void,
    (fn: (value: T) => void) => () => void
] {
    if (initialValue === undefined) {
        console.warn('ultraState: initialValue is undefined');
    }

    const maybeFreeze = (v: T): T =>
        (freeze && typeof v === 'object' && v !== null) ? deepFreeze(v) : v;

    let value = maybeFreeze(initialValue);

    const subscribers = new Set<(value: T) => void>();

    const setValue = (newValue: T): void => {
        if (typeof value !== 'object' && value === newValue) return;
        value = maybeFreeze(newValue);
        subscribers.forEach(fn => {
            try {
                fn(value);
            } catch (error) {
                console.error('Error en subscriber de ultraState:', error);
            }
        });
    };

    const subscribe = (fn: (value: T) => void): (() => void) => {
        subscribers.add(fn);
        const unsubscribe = (): void => { subscribers.delete(fn); };
        registerInScope(unsubscribe);
        return unsubscribe;
    };

    return [
        () => value,
        setValue,
        subscribe
    ];
}

export function UltraContext<T>(
    initialValue: T,
    displayName?: string
): UltraContextReturn<T> {
    let owner: UltraLightElement | null = null;
    let assigned = false;
    displayName = (!displayName) ? 'context' : displayName;
    if (initialValue === undefined) {
        console.warn('UltraContext: initialValue is undefined');
    }
    let value = initialValue;
    const subscribers = new Set<(value: T) => void>();
    function canReach(
        candidate?: UltraLightElement
    ): boolean {
        if (!owner) return true;
        if (!candidate) return false;
        if (!owner?.contains(candidate)) {
            console.warn('UltraContext: unreachable context');
            return false;
        }else{
            return true;
        }
    };
    function getValue(
        candidate?: UltraLightElement
    ): T{
        if (!canReach(candidate)) return "undefined" as T;
        return value;
    }
    function setValue(
        newValue: T,
        candidate?: UltraLightElement,
    ): void {
        if (!canReach(candidate)) return;
        if (typeof value !== 'object' && value === newValue) return;
        value = newValue;
        subscribers.forEach(fn => {
            try {
                fn(value);
            } catch (error) {
                console.error('UltraContext: error in subscriber:', error);
            }
        });
    };
    function subscribe(
        fn: (value: T) => void,
        candidate?: UltraLightElement,
    ): (() => void){
        if (!canReach(candidate)) return () => {};
        subscribers.add(fn);
        return () => subscribers.delete(fn);
    };
    function own(
        newOwner: UltraLightElement
    ): void {
        if (assigned) {
            throw new Error(
                `UltraContext: context owner for "${displayName}" cannot be reassigned.\n`
                + `Current owner: ${owner?.tagName || 'null'}.`
            );
        }
        owner = newOwner;
        assigned = true;
    };
    return {
        set: setValue,
        get: getValue,
        subscribe,
        own
    };
}

export function ultraQueryParams(): Record<string, string> {
    const urlData = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};
    urlData.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

function matchRoute(routePath: string, currentPath: string): UltraRouteMatch {
    if (routePath === currentPath) {
        return { params: {}, matched: true };
    }

    if (routePath === '/*') {
        return { params: {}, matched: true, isWildcard: true };
    }

    const routeParts = routePath.split('/').filter(p => p);
    const pathParts = currentPath.split('/').filter(p => p);

    if (routeParts.length !== pathParts.length) {
        return { matched: false, params: {} };
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i]!.startsWith(':')) {
            params[routeParts[i]!.slice(1)] = pathParts[i]!;
        } else if (routeParts[i] !== pathParts[i]) {
            return { matched: false, params: {} };
        }
    }

    return { params, matched: true };
}

/**
 * This functional component is used to create an SPA router.
 *
 * Each matched route's `component` function runs inside its own {@link ultraScope}, so any
 * `ultraState`/`ultraCompState` subscription made synchronously during construction is
 * automatically disposed on navigation away or when the router's `_cleanup` runs.
 * @param routes
 * @returns
 */

export function UltraRouter(
    ...routes: UltraRoute[]
): UltraLightDiv {
    
    const paths = routes.map(r => r.path);
    const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i && p !== '/*');
    
    if (duplicates.length > 0) {
        console.warn('UltraRouter: Duplicate routes detected:', duplicates.join(', '));
    }

    const container = document.createElement('div') as UltraLightDiv;
    container.classList.add('browser-router');

    let currentCleanup: UltraCleanupFunction | null = null;

    const renderRoute = (): void => {

        if (currentCleanup) {
            try {
                currentCleanup();
            } catch (error) {
                console.error('Error while cleaning up previous route:', error);
            }
        }

        const currentPath = window.location.pathname;

        let targetComponent: HTMLElement | Node | null = null;
        let scopeDispose: UltraCleanupFunction | null = null;

        for (const route of routes) {
            const match = matchRoute(route.path, currentPath);
            if (match.matched && !match.isWildcard) {
                const routeParams = match.params;
                const [component, dispose] = ultraScope(() => route.component(routeParams));
                targetComponent = parseHTMLString(component);
                scopeDispose = dispose;
                break;
            }
        }

        if (!targetComponent) {
            const wildcardRoute = routes.find(route => matchRoute(route.path, currentPath).isWildcard);
            if (wildcardRoute) {
                const [component, dispose] = ultraScope(() => wildcardRoute.component());
                targetComponent = parseHTMLString(component);
                scopeDispose = dispose;
            }
        }

        container.innerHTML = '';

        if (targetComponent) {
            container.appendChild(targetComponent);
        }

        const nodeCleanup = (targetComponent as UltraLightElement | null)?._cleanup;

        if (nodeCleanup || scopeDispose) {
            currentCleanup = () => {
                nodeCleanup?.();
                scopeDispose?.();
            };
        }
    };

    renderRoute();

    const handler = (): void => renderRoute();
    window.addEventListener('popstate', handler);

    const cleanup = (): void => {
        window.removeEventListener('popstate', handler);
    };

    container._cleanup = () => {
        if (cleanup) cleanup();
        if (currentCleanup) currentCleanup();
    };

    return container;
}

/**
 * Navigates to a new page within the UltraRouter context.
 * @param props
 * @param props.href The href of the link. It should be a relative path.
 * @param props.viewTransition When true, the navigation to the new page will happen using the viewtransition API.
 */
export function ultraNavigate({
    href,
    viewTransition = false
}:{
    href: string;
    viewTransition?: boolean;
}): void {
    function navigate() {
        try {
            window.history.pushState({}, '', href);
            window.scrollTo({ top: 0, behavior: 'instant' });
            window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
            console.error('ultraNavigate: Navigation error:', error);
        }
    }
    if (!href) {
        console.warn('ultraNavigate: a valid href is required');
        return;
    }
    if (!viewTransition) {
        navigate();
    }else{
        if (!document.startViewTransition) {
            navigate();
            return;
        }
        document.startViewTransition(navigate);
    }
}

/**
 * Applies the shared {@link UltraElementProps} (event handlers, attributes, styles,
 * class names, triggers, mount callbacks, and cleanup functions) to `node`, pushing
 * every teardown it registers onto `cleanupFunctions`.
 *
 * Children are deliberately **not** handled here: `UltraComponent`, `UltraActivity`,
 * and `UltraLink` each append children slightly differently (e.g. `UltraActivity`
 * needs to track fragment children separately for its visibility targeting), so that
 * step stays local to each caller.
 * @internal
 */
function applyUltraElementProps(
    node: UltraLightElement,
    {
        eventHandler = {},
        attributes = {},
        styles = {},
        className = [],
        trigger = [],
        onMount = [],
        cleanup = []
    }: UltraElementProps,
    cleanupFunctions: UltraCleanupFunction[]
): void {

    let disposed = false;
    registerInScope(() => {
        disposed = true;
    });

    (Object.keys(eventHandler) as (keyof HTMLElementEventMap)[]).forEach((event: keyof HTMLElementEventMap) => {
        const handler = eventHandler[event];
        if (handler) {
            node.addEventListener(event, handler);
            cleanupFunctions.push(() => node.removeEventListener(event, handler));
        }
    });

    (Object.keys(attributes) as (keyof AllHTMLAttributes)[]).forEach(key => {
        try {
            node.setAttribute(key as string, attributes[key] as string);
        } catch (error) {
            console.error(`Error applying attribute ${String(key)}:`, error);
        }
    });

    Object.keys(styles).forEach(key => {
        try {
            (node.style as unknown as Record<string, string>)[key] = styles[key as keyof CSSStyleDeclaration] as string;
        } catch (error) {
            console.error(`Error applying style ${key}:`, error);
        }
    });

    className.forEach(cls => {
        try {
            if (cls) node.classList.add(cls);
        } catch (error) {
            console.error(`Error applying class ${cls}:`, error);
        }
    });

    onMount.forEach(fn => {
        requestAnimationFrame(() => {
            void (async () => {
                if (disposed) return;
                try {
                    const result = fn(node);
                    const cleanupFn = result instanceof Promise ? await result : result;
                    if (!cleanupFn) return;
                    if (disposed) {
                        cleanupFn();
                    } else {
                        cleanupFunctions.push(cleanupFn);
                    }
                } catch (error) {
                    console.error('Error while executing onMount function(s):', error);
                }
            })();
        });
    });

    trigger.forEach(t => {
        const { subscriber, triggerFunction, defer } = t;
        if (subscriber && triggerFunction) {
            try {
                // Cleanup returned by a firing is torn down before the next
                // firing runs, and (via the push below) on component teardown
                // if one is still pending — shared across every subscriber on
                // this trigger entry, since they all share one triggerFunction call.
                let pendingCleanup: void | UltraCleanupFunction;

                const runTrigger = (): void => {
                    if (pendingCleanup) {
                        try {
                            pendingCleanup();
                        } catch (error) {
                            console.error('Error in trigger cleanup:', error);
                        }
                    }
                    try {
                        pendingCleanup = triggerFunction(node);
                    } catch (error) {
                        console.error('Error in triggerFunction:', error);
                    }
                };

                const callback = defer
                    ? () => requestAnimationFrame(runTrigger)
                    : runTrigger;

                const subscribers = Array.isArray(subscriber) ? subscriber : [subscriber];
                subscribers.forEach(sub => {
                    const unsubscribe = sub(callback);
                    if (unsubscribe) {
                        cleanupFunctions.push(unsubscribe);
                    }
                });

                cleanupFunctions.push(() => pendingCleanup?.());
            } catch (error) {
                console.error('Error in trigger:', error);
            }
        }
    });

    cleanup.forEach(fn => {
        try {
            cleanupFunctions.push(fn);
        } catch (error) {
            console.error('Error adding cleanup:', error);
        }
    });

}

/**
 * This functional component is used to create a link element that works within
 * the UltraRouter context. Beyond navigation, it accepts the same shared
 * {@link UltraElementProps} as `UltraComponent`/`UltraActivity` (event handlers,
 * attributes, styles, triggers, onMount callbacks, cleanup), applied to the
 * underlying anchor element.
 */
export function UltraLink({
    href,
    children = [],
    viewTransition = false,
    className = [],
    eventHandler = {},
    attributes = {},
    styles = {},
    trigger = [],
    onMount = [],
    cleanup = []
}: {
    /**
     * The href of the link. It should be a relative path.
     */
    href: string;
    /**
     * When true, the link will be transitioned to the new page using the viewtransition API.
     * This is useful for transitioning between pages with animations.
     */
    viewTransition?: boolean;
} & UltraElementProps): UltraLightElement {
    if (!href) {
        console.warn('UltraLink: href is required');
    }
    const link = document.createElement('a') as UltraLightAnchor;
    link.href = href;
    function navigate() {
        try {
            window.history.pushState({}, '', href);
            window.scrollTo({ top: 0, behavior: 'instant' });
            window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
            console.error('UltraLink: Navigation error:', error);
        }
    }
    function clickHandler(
        e: MouseEvent
    ): void {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        if (window.location.pathname === href) return;
        if (!viewTransition) {
            navigate();
        } else {
            if (!document.startViewTransition) {
                navigate();
                return;
            }
            document.startViewTransition(navigate);
        }
    };
    const cleanupFunctions: UltraCleanupFunction[] = [];

    children.forEach(child => {
        if (!child) return;
        const childElement = parseHTMLString(child);
        if (childElement) {
            link.appendChild(childElement);
        }
    });
    className.forEach(sel => {
        if (!sel) return;
        link.classList.add(sel);
    });

    applyUltraElementProps(
        link,
        { eventHandler, attributes, styles, trigger, onMount, cleanup },
        cleanupFunctions
    );

    link.addEventListener('click', clickHandler);

    link._cleanup = () => {
        link.removeEventListener('click', clickHandler);
        cleanupFunctions.forEach(fn => {
            try {
                fn();
            } catch (error) {
                console.error('Error while cleaning up UltraLink:', error);
            }
        });
    };
    return link;
}

/**
 * This functional component is used to create a fragment of HTML components. Useful 
 * when needing to render multiple elements at once. It accepts null values for conditional rendering.
 * @param children 
 * @returns 
 */
export function UltraFragment(
    ...children: (string | HTMLElement | Node | null)[]
): DocumentFragment {

    const fragment = document.createDocumentFragment();

    children.forEach(component => {
        if (!component) return;
        const element = parseHTMLString(component);
        if (element) {
            fragment.appendChild(element);
        }
    });

    return fragment;

}

/**
 * Safely replaces `parent`'s children with `newChildren`, the way the native
 * `Element.replaceChildren()` does — except any outgoing child that carries
 * an `_cleanup` (i.e. was itself built with `UltraComponent`/`UltraActivity`/
 * `UltraLink`, or has `_cleanup` set manually) has it invoked first, so event
 * listeners, trigger subscriptions, and `onMount`-returned cleanups don't
 * leak. Plain nodes without `_cleanup` are skipped, not touched.
 *
 * Prefer this over calling `parent.replaceChildren(...)` directly whenever
 * `parent` may contain `UltraLightElement` children — the native API gives
 * no hook into node removal, so nothing else in ultra-light.js can run that
 * cleanup on your behalf.
 * @param parent The element whose children are being replaced.
 * @param newChildren The new children (strings, `HTMLElement`s, or `Node`s;
 * `null`/`undefined` entries are skipped for conditional rendering).
 * @returns
 */
export function ultraReplaceChildren(
    parent: HTMLElement,
    ...newChildren: (string | HTMLElement | Node | null | undefined)[]
): void {

    Array.from(parent.children).forEach(outgoing => {
        if (hasCleanup(outgoing)) {
            try {
                outgoing._cleanup?.();
            } catch (error) {
                console.error('Error while cleaning up outgoing child in ultraReplaceChildren:', error);
            }
        }
    });

    const parsedChildren: (HTMLElement | Node)[] = [];
    newChildren.forEach(child => {
        if (!child) return;
        const element = parseHTMLString(child);
        if (element) parsedChildren.push(element);
    });

    parent.replaceChildren(...parsedChildren);

}

/**
 * This functional component wraps one or more component factories in a
 * try/catch, rendering `fallback` instead if any factory throws. A single
 * factory's result is returned directly; multiple factories are combined
 * with {@link UltraFragment}. Synchronous only — a rejected promise from an
 * async factory is not caught.
 * @param props Object containing `factories` (a single factory or array of
 * factories) and `fallback` (receives the caught error, returns the
 * replacement element).
 * @returns
 */
export function UltraErrorBoundary({
    factories,
    fallback
}: UltraErrorBoundaryProps): UltraLightElement | DocumentFragment {

    try {
        if (!Array.isArray(factories)) {
            return factories();
        }
        return UltraFragment(...factories.map(factory => factory()));
    } catch (error) {
        return fallback(error);
    }

}

/**
 * This functional component is used to create a custom HTML element with event handlers, styles, children, triggers, and cleanup functions.
 * Only one parent component will be rendered per instance of this component.
 * @param props Object containing `component` plus the shared {@link UltraElementProps} (eventHandler, attributes, styles, className, children, trigger, onMount, cleanup).
 * @returns
 */
export function UltraComponent({
    component,
    eventHandler = {},
    attributes = {},
    styles = {},
    className = [],
    children = [],
    trigger = [],
    onMount = [],
    cleanup = [],
}: {
    /**
     * The parent component to be rendered. It accepts children in plain HTML.
     */
    component: UltraRenderableElement;
} & UltraElementProps): UltraLightElement {

    const node = parseHTMLString(component) as UltraLightElement;

    if (!node) {
        console.error('UltraComponent: Could not create node');
        return document.createElement('div') as UltraLightElement;
    }

    const cleanupFunctions: UltraCleanupFunction[] = [];

    //add children

    children.forEach(child => {
        if (!child) return;
        const childElement = parseHTMLString(child);
        if (childElement) {
            node.appendChild(childElement);
            if (hasCleanup(childElement)) {
                cleanupFunctions.push(childElement._cleanup!);
            }
        }
    });

    //add shared props: event handlers, attributes, styles, class names, onMount, triggers, cleanup

    applyUltraElementProps(
        node,
        { eventHandler, attributes, styles, className, trigger, onMount, cleanup },
        cleanupFunctions
    );

    //add cleanup function for node

    node._cleanup = () => {
        cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error al limpiar UltraComponent:', error);
            }
        });
    };

    return node;

}

/**
 * This component is used to control the visibility of a component based on a state.
 * @param props Object containing `component`, `mode`, `type`, plus the shared {@link UltraElementProps} (eventHandler, attributes, styles, className, children, trigger, onMount, cleanup).
 * @returns
 */
export function UltraActivity({
    component,
    eventHandler = {},
    attributes = {},
    styles = {},
    className = [],
    children = [],
    mode,
    trigger = [],
    type = 'display',
    onMount = [],
    cleanup = []
}: {
    /**
     * The parent component to be rendered. It accepts children in plain HTML.
     */
    component: UltraRenderableElement | UltraLightElement;
    /**
     * Object containing the state and subscriber functions to control visibility.
     */
    mode: {
        /**
         * Returns a boolean value indicating whether the component should be visible or not.
         * @returns
         */
        state: () => boolean;
        /**
         * Stateful subscriber function(s) that indicate(s) when the state will be checked.
         */
        subscriber: ((fn: () => void) => () => void) | ((fn: () => void) => () => void)[];
    };
    /**
     * Type of activity (display or visibility). Default is 'display'.
     */
    type?: 'display' | 'visibility';
} & UltraElementProps): UltraLightElement {

    const supportedTypes = ['display', 'visibility'];

    if (!supportedTypes.includes(type)) {
        console.warn(`Activity: type not supported. Display will be used by default. Supported types: ${supportedTypes.join(', ')}`);
        type = 'display';
    }

    const element = parseHTMLString(component) as UltraLightElement;

    if (!element) {
        console.error('Activity: Could not create element');
        return document.createElement('div') as UltraLightElement;
    }

    const childrenElements = children.filter(child => child !== null).map(child => parseHTMLString(child));

    const cleanupFunctions: UltraCleanupFunction[] = [];

    //add shared props: event handlers, attributes, styles, class names, onMount, triggers, cleanup
    //(applied before `update()` below so a typed activity's own display/visibility toggle wins over
    //any `styles.display`/`styles.visibility` the caller passed in)

    applyUltraElementProps(
        element,
        { eventHandler, attributes, styles, className, trigger, onMount, cleanup },
        cleanupFunctions
    );

    const fragmentChildren:(HTMLElement|Node)[] = []; //only used when the component is a fragment
    if (element.nodeType === 11 /* DOCUMENT_FRAGMENT_NODE */) {
        Array.from(element.childNodes).forEach(child => fragmentChildren.push(child));
    }
    childrenElements.forEach(childElement => {
        if (childElement) {
            if (element.nodeType === 11 /* DOCUMENT_FRAGMENT_NODE */) {
                fragmentChildren.push(childElement);
            }
            element.appendChild(childElement);
            if (hasCleanup(childElement)) {
                cleanupFunctions.push(childElement._cleanup!);
            }
        }
    });

    const update = (): void => {
        try {
            const current = mode.state();
            const targets = (element.nodeType === 11 /* DOCUMENT_FRAGMENT_NODE */)
            ? fragmentChildren as HTMLElement[]
            : [element as HTMLElement];
            if (type === 'display') {
                targets.forEach(el => el.style.display = current ? '' : 'none');
            } else if (type === 'visibility') {
                targets.forEach(el => el.style.visibility = current ? 'visible' : 'hidden');
            }
        } catch (error) {
            console.error('Error while updating Activity:', error);
        }
    };

    if (Array.isArray(mode.subscriber)) {
        mode.subscriber.forEach(subscriber => {
            const unsubscribe = subscriber(update);
            if (unsubscribe) {
                cleanupFunctions.push(unsubscribe);
            }
        });
    } else {
        const unsubscribe = mode.subscriber(update);
        if (unsubscribe) {
            cleanupFunctions.push(unsubscribe);
        }
    }

    update();

    element._cleanup = () => {
        cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error while cleaning up Activity:', error);
            }
        });
    };

    return element;

}

const styleCache = new Map<string, Record<string, string>>();

/**
 * Returns a map of class names and their corresponding hashed class names.
 * Alternative to css modules.
 * @param cssString A valid CSS context.
 * @returns 
 */
export function ultraStyles(
    cssString: string,
    document?: Document
): Record<string, string> {

    if (!document) document = window.document;
    
    if (!cssString || typeof cssString !== 'string') {
        console.warn('ultraStyles: invalid cssString');
        return {};
    }

    const hash = stableHash(cssString);

    if (styleCache.has(hash)) {
        return styleCache.get(hash)!;
    }

    let styleEl = document.getElementById('ultra-styles') as HTMLStyleElement | null;
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ultra-styles';
        document.head.appendChild(styleEl);
    }

    const classMap: Record<string, string> = {};
    const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match: RegExpExecArray | null;
    const classNames = new Set<string>();

    while ((match = classRegex.exec(cssString)) !== null) {
        classNames.add(match[1]!);
    }

    let scopedCSS = cssString;
    classNames.forEach(className => {
        const hashedClass = `${className}_${hash}`;
        classMap[className] = hashedClass;
        const pattern = new RegExp(`\\.${className}\\b`, 'g');
        scopedCSS = scopedCSS.replace(pattern, `.${hashedClass}`);
    });

    if (!styleEl.textContent?.includes(`/*${hash}*/`)) {
        styleEl.textContent += `\n/*${hash}*/\n${scopedCSS}`;
    }

    styleCache.set(hash, classMap);

    return classMap;
}

/**
 * Returns a stateful object that contains ultraState getters, setters, and subscribers.
 * Useful for managing complex states, global contexts, or nested states. Accepts functions as values.
 * Functions are called with the state object as the first argument.
 * @param initialComp Initial composite state object.
 * @param freeze Optional parameter to freeze ALL the state objects. Default is false.
 * @returns 
 */
export function ultraCompState<T extends Record<string, unknown>>(
    initialComp: T,
    freeze = false
): UltraCompStateResult<T> {
    if (typeof initialComp !== 'object' || initialComp === null) {
        throw new Error('ultraCompState: initial value cannot be a primitive or null.');
    }
    const comp: Record<string, unknown> = {};
    (Object.keys(initialComp) as (keyof T)[]).forEach(key => {
        if (typeof initialComp[key] === 'function') {
            const fn = initialComp[key] as (...args: unknown[]) => unknown;
            comp[key as string] = (...args: unknown[]) => fn(comp, ...args);
            return;
        }
        const [getValue, setValue, subscribeToValue] = ultraState(initialComp[key], freeze);
        comp[key as string] = {
            get: getValue,
            set: setValue,
            subscribe: subscribeToValue,
        };
    });
    return comp as UltraCompStateResult<T>;
}

export function ultraQuery() {

    const [cache, setCache, subscribeToCache] = ultraState<Record<string, unknown>>({});
    const [isFetching, setIsFetching, subscribeToFetching] = ultraState<boolean>(false);
    const [hasError, setHasError, subscribeToHasError] = ultraState<boolean>(false);
    const [error, setError, subscribeToError] = ultraState<unknown>(null);

    const timerMap = new Map<string, ReturnType<typeof setTimeout>>();
    const pendingMap = new Map<string, Promise<void>>();

    const invalidateCache = (key: string) => {
        const newCache = { ...cache() };
        delete newCache[key];
        setCache(newCache);
        if (timerMap.has(key)) {
            clearTimeout(timerMap.get(key));
            timerMap.delete(key);
        }
    };

    const addCache = (key: string, value: unknown, staleTime: number) => {
        if (timerMap.has(key)) {
            clearTimeout(timerMap.get(key));
        }
        setCache({ ...cache(), [key]: value });
        const timer = setTimeout(() => {
            invalidateCache(key);
        }, staleTime);
        timerMap.set(key, timer);
    };

    const fetch = async (
        key: string,
        fetcher: () => Promise<unknown>,
        staleTime: number = 5 * 60 * 1000
    ) => {
        if (Object.hasOwn(cache(), key)) {
            return {
                hasError,
                isFetching,
                data: cache()[key],
            };
        }

        if (pendingMap.has(key)) {
            await pendingMap.get(key);
            return {
                hasError,
                isFetching,
                data: cache()[key],
            };
        }

        setIsFetching(true);
        setHasError(false);
        setError(null);

        const pending: Promise<void> = (async () => {
            try {
                const data = await fetcher();
                addCache(key, data, staleTime);
            } catch (error) {
                setHasError(true);
                setError(error);
            } finally {
                setIsFetching(false);
                pendingMap.delete(key);
            }
        })();

        pendingMap.set(key, pending);
        await pending;

        return {
            hasError,
            isFetching,
            data: cache()[key],
        };
    };

    return {
        //states
        fetch,
        isFetching,
        hasError,
        error,
        //subscriber
        subscribeToFetching,
        subscribeToHasError,
        subscribeToError,
        subscribeToCache,
        //functions
        cache,
        invalidateCache,
    };

}

/**
 * Utility function to create a portal element outside of the application flow.
 * @param app A selector that identifies the application element.
 * @param portal A component to be ported to the application.
 */
export function ultraPortal(
    app: string | HTMLElement,
    portal: UltraRenderableElement
){  
    
    const $app = (typeof app === 'string') ? document.querySelector(app) : app;
    if (!$app) {
        throw new Error('UltraPortal: No application found with selector:');
    }

    const $portalElement = parseHTMLString(portal);
    if (!$portalElement) {
        throw new Error('UltraPortal: Invalid portal element');
    }

    $app.after($portalElement);

}

function isValidCssObject(
    value: unknown
) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype &&
        Object.keys(value).length > 0
    );
}

export function ultraStyles2<T extends Record<string, CSSProperties>>(
    cssObject: T,
    document: Document = window.document
): Record<keyof T, string> {

    if (!isValidCssObject(cssObject)) {
        console.warn('ultraStyles2: invalid cssObject');
        return {} as Record<keyof T, string>;
    }

    let $styleEl = document.getElementById('ultra-styles') as HTMLStyleElement | null;
    if (!$styleEl) {
        $styleEl = document.createElement('style');
        $styleEl.id = 'ultra-styles';
        document.head.appendChild($styleEl);
    }

    const returnable: Record<string, string> = {};
    const hash = stableHash(JSON.stringify(cssObject));

    if (styleCache.has(hash)) {
        return styleCache.get(hash)! as Record<keyof T, string>;
    }

    let cssString = '';

    for (const selector of Object.keys(cssObject)) {
        const className = `${selector}_${hash}`;
        returnable[selector] = className;
        cssString += `.${className}{`;
        const styles = cssObject[selector];
        for (const prop in styles) {
            const value = styles[prop as keyof CSSProperties];
            if (value === undefined || value === null) continue;
            const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
            cssString += `${kebabProp}:${String(value)};`;
        }
        cssString += `}\n`;
    }

    $styleEl.appendChild(document.createTextNode(cssString));

    styleCache.set(hash, returnable);

    return returnable as Record<keyof T, string>;

}