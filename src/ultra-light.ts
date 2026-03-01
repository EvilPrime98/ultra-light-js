import {
    type UltraStateReturn,
    type UltraContextReturn,
    type UltraRouteMatch,
    type UltraRoute,
    type UltraLinkProps,
    type UltraTrigger,
    type UltraCleanupFunction,
    type UltraLightElement,
    type UltraLightAnchor,
    type UltraLightDiv,
    hasCleanup,
    type UltraRenderableElement,
    type UltraCompStateResult,
    type IUltraCompStateStateful
} from './types';

export type {
    UltraStateReturn,
    UltraContextReturn,
    UltraRoute,
    UltraLinkProps,
    UltraTrigger,
    UltraCleanupFunction,
    UltraLightElement,
    UltraLightAnchor,
    UltraLightDiv,
    IUltraCompStateStateful
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

function parseHTMLString(htmlString: string | HTMLElement | Node): HTMLElement | Node | null {
    if (typeof htmlString !== 'string') return htmlString;    
    const trimmed = htmlString.trim();
    if (!trimmed) return null;
    const tagMatch = trimmed.match(TAG_REGEX);
    if (!tagMatch) return null;
    const tag = (tagMatch[1] as string).toLowerCase();
    if (SVG_EXCLUSIVE_TAGS.has(tag)) {
        const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        temp.innerHTML = trimmed;
        return temp.firstElementChild;
    }
    const template = document.createElement('template');
    template.innerHTML = trimmed;
    return template.content.firstElementChild;
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
    Object.keys(obj).forEach(key => deepFreeze((obj as any)[key]));
    return Object.freeze(obj);
}

/**
 * Returns a stateful getter, setter, and subscriber function for a given initial value.
 * @param initialValue 
 * @returns 
 */
export function ultraState<T>(initialValue: T): [
    () => T,
    (newValue: T) => void,
    (fn: (value: T) => void) => () => void
] {
    if (initialValue === undefined) {
        console.warn('ultraState: initialValue is undefined');
    }

    let value = (typeof initialValue === 'object' && initialValue !== null)
    ? deepFreeze(initialValue)
    : initialValue;

    const subscribers = new Set<(value: T) => void>();

    const setValue = (newValue: T): void => {
        if (typeof value !== 'object' && value === newValue) return;
        value = (typeof newValue === 'object' && newValue !== null)
        ? deepFreeze(newValue)
        : newValue;
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
        return () => subscribers.delete(fn);
    };

    return [
        () => value,
        setValue,
        subscribe
    ];
}

export function ultraEffect(
    fn: () => void | UltraCleanupFunction | Promise<void | UltraCleanupFunction>,
    subscriberArray: Array<(callback: () => void) => () => void>
): UltraCleanupFunction {

    let mainCleanup: UltraCleanupFunction | null = null;

    const runFn = async () => {
        try {
            const result = await fn();
            if (typeof result === "function") {
                mainCleanup = result;
            }
        } catch (error) {
            console.error("Error en ultraEffect:", error);
        }
    };

    runFn();

    const unsubscribers = subscriberArray.map(subscriber => {
        try {
            return subscriber(runFn);
        } catch (error) {
            console.error("Error al suscribir en ultraEffect:", error);
            return null;
        }
    });

    return async () => {
        if (mainCleanup) {
            try {
                await mainCleanup();
            } catch (error) {
                console.error("Error al ejecutar cleanup principal en ultraEffect:", error);
            }
        }
        for (const unsub of unsubscribers) {
            if (!unsub) continue;
            try {
                await Promise.resolve(unsub());
            } catch (error) {
                console.error("Error al limpiar ultraEffect:", error);
            }
        }
    };
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
 * @param routes 
 * @returns 
 */
export function UltraRouter(...routes: UltraRoute[]): UltraLightDiv {
    const paths = routes.map(r => r.path);
    const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i && p !== '/*');
    if (duplicates.length > 0) {
        console.warn('UltraRouter: Rutas duplicadas detectadas:', duplicates);
    }

    const container = document.createElement('div') as UltraLightDiv;
    container.classList.add('browser-router');

    let currentCleanup: UltraCleanupFunction | null = null;

    const renderRoute = (): void => {
        if (currentCleanup) {
            try {
                currentCleanup();
            } catch (error) {
                console.error('Error al limpiar ruta anterior:', error);
            }
        }

        const currentPath = window.location.pathname;

        let targetComponent: HTMLElement | Node | null = null;
        let routeParams: Record<string, string> = {};
        let wildcardComponent: HTMLElement | Node | null = null;

        routes.forEach(route => {
            const match = matchRoute(route.path, currentPath);

            if (match.matched && !match.isWildcard && !targetComponent) {
                routeParams = match.params;
                const component = route.component(routeParams);
                targetComponent = parseHTMLString(component);
            } else if (match.matched && match.isWildcard) {
                const component = route.component();
                wildcardComponent = parseHTMLString(component);
            }
        });

        if (!targetComponent && wildcardComponent) {
            targetComponent = wildcardComponent;
        }

        container.innerHTML = '';

        if (targetComponent) {
            container.appendChild(targetComponent);

            if ((targetComponent as UltraLightElement)._cleanup) {
                currentCleanup = (targetComponent as UltraLightElement)._cleanup!;
            }
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
 * This functional component is used to create a link element that works within
 * the UltraRouter context.
 */
export function UltraLink({
    href,
    children,
    viewTransition = false
}: UltraLinkProps
): UltraLightElement {
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
    link.addEventListener('click', clickHandler);
    children.forEach(child => {
        if (!child) return;
        const childElement = parseHTMLString(child);
        if (childElement) {
            link.appendChild(childElement);
        }
    });
    link._cleanup = () => {
        link.removeEventListener('click', clickHandler);
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
 * This functional component is used to create a custom HTML element with event handlers, styles, children, triggers, and cleanup functions.
 * Only one parent component will be rendered per instance of this component.
 * @param {Object} props - Object containing the component, eventHandler, styles, children, trigger, and cleanup.
 * @returns 
 */
export function UltraComponent({
    component,
    eventHandler = {},
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
    /**
     * Object containing the event handlers.
     */
    eventHandler?: Partial<Record<keyof HTMLElementEventMap, EventListenerOrEventListenerObject>>;
    /**
     * Object containing the CSS styles.
     */
    styles?: Partial<CSSStyleDeclaration>;
    /** 
     * Array of class names.
     */
    className?: string[];
    /**
     * Array of child components. It accepts null values for conditional rendering.
     */
    children?: (UltraRenderableElement | Node | UltraLightElement | null)[];
    /**
     * Array of trigger objects.
     */
    trigger?: UltraTrigger[];
    /** 
     * Array of functions that are called inmediately after the component is mounted.
     */
    onMount?: ((node: UltraLightElement) => void)[];
    /**
     * Array of cleanup functions.
     */
    cleanup?: UltraCleanupFunction[];
}): UltraLightElement {

    const node = parseHTMLString(component) as UltraLightElement;

    if (!node) {
        console.error('UltraComponent: No se pudo crear el nodo');
        return document.createElement('div') as UltraLightElement;
    }

    const cleanupFunctions: UltraCleanupFunction[] = [];
    
    //add cleanup functions for event handlers

    (Object.keys(eventHandler) as (keyof HTMLElementEventMap)[]).forEach((event: keyof HTMLElementEventMap) => {
        const handler = eventHandler[event];
        if (handler) {
            node.addEventListener(event, handler);
            cleanupFunctions.push(() => node.removeEventListener(event, handler));
        }
    });

    //add styles

    Object.keys(styles).forEach(key => {
        try {
            (node as HTMLElement).style[key as any] = styles[key as keyof CSSStyleDeclaration] as string;
        } catch (error) {
            console.error(`Error al aplicar estilo ${key}:`, error);
        }
    });

    //add class names

    className.forEach(className => {
        try {
            if (className) node.classList.add(className);
        } catch (error) {
            console.error(`Error al aplicar clase ${className}:`, error);
        }
    });

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

    //add onMount functions

    onMount.forEach(fn => {
        requestAnimationFrame(() => {
            try {
                fn(node);
            } catch (error) {
                console.error('Error while executing onMount function(s):', error);
            }
        });
    });

    //add cleanup functions for triggers

    trigger.forEach(t => {
        const { subscriber, triggerFunction: subscriberFunction, defer } = t;
        if (subscriber && subscriberFunction) {
            try {
                const callback = defer
                    ? () => requestAnimationFrame(() => subscriberFunction(node as HTMLElement))
                    : () => subscriberFunction(node as HTMLElement);
                const unsubscribe = subscriber(callback);
                if (unsubscribe) {
                    cleanupFunctions.push(unsubscribe);
                }
            } catch (error) {
                console.error('Error en trigger de UltraComponent:', error);
            }
        }
    });

    //add special cleanup function

    cleanup.forEach(fn => {
        try {
            cleanupFunctions.push(fn);
        } catch (error) {
            console.error('Error añadiendo cleanup de UltraComponent:', error);
        }
    });

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
 * @param {Object} props - Object containing the component, eventHandler, styles, children, mode, trigger, type, and cleanup.
 * @returns 
 */
export function UltraActivity({
    component,
    eventHandler = {},
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
     * Object containing the event handlers.
     */
    eventHandler?: Partial<Record<keyof HTMLElementEventMap, EventListenerOrEventListenerObject>>;
    /**
     * Object containing the CSS styles.
     */
    styles?: Partial<CSSStyleDeclaration>;
    /** 
     * Array of class names.
     */
    className?: string[];
    /**
     * Array of child components. It accepts null values for conditional rendering.
     */
    children?: (UltraRenderableElement | Node | UltraLightElement | null)[];
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
     * Array of trigger objects.
     */
    trigger?: UltraTrigger[];
    /**
     * Type of activity (display or visibility). Default is 'display'.
     */
    type?: 'display' | 'visibility';
    /** 
     * Array of functions that are called inmediately after the component is mounted.
     */
    onMount?: ((node: UltraLightElement) => void)[];
    /**
     * Array of cleanup functions.
     */
    cleanup?: UltraCleanupFunction[];
}): UltraLightElement {

    const supportedTypes = ['display', 'visibility'];

    if (!supportedTypes.includes(type)) {
        console.warn(`Activity: tipo no soportado. Se usará display por defecto. Tipos soportados: ${supportedTypes.join(', ')}`);
        type = 'display';
    }

    const element = parseHTMLString(component) as UltraLightElement;

    if (!element) {
        console.error('Activity: No se pudo crear el elemento');
        return document.createElement('div') as UltraLightElement;
    }

    const cleanupFunctions: UltraCleanupFunction[] = [];

    // Add cleanup functions for event handlers
    (Object.keys(eventHandler) as (keyof HTMLElementEventMap)[]).forEach((event: keyof HTMLElementEventMap) => {
        const handler = eventHandler[event];
        if (handler) {
            element.addEventListener(event, handler);
            cleanupFunctions.push(() => element.removeEventListener(event, handler));
        }
    });

    // Add styles
    Object.keys(styles).forEach(key => {
        try {
            (element as HTMLElement).style[key as any] = styles[key as keyof CSSStyleDeclaration] as string;
        } catch (error) {
            console.error(`Error al aplicar estilo ${key}:`, error);
        }
    });

    // Add class names
    className.forEach(className => {
        try {
            if (className) element.classList.add(className);
        } catch (error) {
            console.error(`Error al aplicar clase ${className}:`, error);
        }
    });

    // Add children
    children.forEach(child => {
        if (!child) return;
        const childElement = parseHTMLString(child);
        if (childElement) {
            element.appendChild(childElement);
            if (hasCleanup(childElement)) {
                cleanupFunctions.push(childElement._cleanup!);
            }
        }
    });

    // Update visibility based on mode
    const update = (): void => {
        try {
            const current = mode.state();

            if (type === 'display') {
                (element as HTMLElement).style.display = current ? '' : 'none';
            } else if (type === 'visibility') {
                (element as HTMLElement).style.visibility = current ? 'visible' : 'hidden';
            }
        } catch (error) {
            console.error('Error al actualizar Activity:', error);
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

    // Add onMount functions
    onMount.forEach(fn => {
        requestAnimationFrame(() => {
            try {
                fn(element);
            } catch (error) {
                console.error('Error while executing onMount function(s):', error);
            }
        });
    });
    
    // Add cleanup functions for triggers
    trigger.forEach(t => {
        const { subscriber, triggerFunction, defer } = t;
        if (subscriber && triggerFunction) {
            try {
                const callback = defer
                    ? () => requestAnimationFrame(() => triggerFunction(element as HTMLElement))
                    : () => triggerFunction(element as HTMLElement);
                const unsub = subscriber(callback);
                if (unsub) {
                    cleanupFunctions.push(unsub);
                }
            } catch (error) {
                console.error('Error en trigger de Activity:', error);
            }
        }
    });

    // Add special cleanup functions
    cleanup.forEach(fn => {
        try {
            cleanupFunctions.push(fn);
        } catch (error) {
            console.error('Error añadiendo cleanup de Activity:', error);
        }
    });

    // Add cleanup function for element
    element._cleanup = () => {
        cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error al limpiar Activity:', error);
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
export function ultraStyles(cssString: string): Record<string, string> {

    if (!cssString || typeof cssString !== 'string') {
        console.warn('ultraStyles: cssString inválido');
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
 * @returns 
 */
export function ultraCompState<T extends Record<string, unknown>>(
    initialComp: T
): UltraCompStateResult<T> {
    const comp = {} as UltraCompStateResult<T>;
    (Object.keys(initialComp) as (keyof T)[]).forEach(key => {
        if (typeof initialComp[key] === 'function') {
            (comp as any)[key] = (...args: any[]) => {
                return (initialComp[key] as Function)(comp, ...args);
            }
            return;
        }
        const [getValue, setValue, subscribeToValue] = ultraState(initialComp[key]);
        (comp as any)[key] = {
            get: getValue,
            set: setValue,
            subscribe: subscribeToValue,
        };
    });
    return comp;
}