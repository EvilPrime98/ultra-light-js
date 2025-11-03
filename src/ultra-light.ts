import type {
    UltraStateReturn,
    UltraContextReturn,
    RouteMatch,
    Route,
    UltraLinkProps,
    EventHandler,
    Trigger,
    UltraComponentProps,
    ActivityProps,
    CleanupFunction,
    ElementWithCleanup,
    AnchorWithCleanup,
    ContainerWithCleanup
} from './types.ts';

export type {
    UltraStateReturn,
    UltraContextReturn,
    Route,
    UltraLinkProps,
    EventHandler,
    Trigger,
    UltraComponentProps,
    ActivityProps,
    CleanupFunction,
    ElementWithCleanup,
    AnchorWithCleanup,
    ContainerWithCleanup
}

function parseHTMLString(htmlString: string | HTMLElement | Node): HTMLElement | Node | null {
    if (typeof htmlString !== 'string') return htmlString;    
    const trimmed = htmlString.trim();
    const svgTags = ['svg', 'line', 'circle', 'rect', 'path', 'polygon', 'polyline', 
    'ellipse', 'text', 'g', 'defs', 'use', 'symbol', 'marker',
    'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient'];
    const tagMatch = trimmed.match(/^<([a-z][a-z0-9]*)/i);
    const isSVGElement = tagMatch && svgTags.includes(tagMatch[1].toLowerCase());   
    if (isSVGElement) {
        const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        temp.innerHTML = trimmed;
        return temp.firstChild;
    }
    const template = document.createElement('template');
    template.innerHTML = trimmed;
    return template.content.firstChild;
}

function stableHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

export function ultraState<T>(initialValue: T): [
    () => T,
    (newValue: T) => void,
    (fn: (value: T) => void) => () => void
] {
    if (initialValue === undefined) {
        console.warn('ultraState: initialValue is undefined');
    }

    let value = initialValue;
    const subscribers = new Set<(value: T) => void>();

    const setValue = (newValue: T): void => {
        value = newValue;
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
    fn: () => void | Promise<void>,
    subscriberArray: Array<(fn: () => void) => () => void>
): CleanupFunction {
    const fnExecution = async (): Promise<void> => {
        try {
            await fn();
        } catch (error) {
            console.error('Error en ultraEffect:', error);
        }
    };

    fnExecution();

    const unsubscribers = subscriberArray.map(subscriber => {
        try {
            return subscriber(fn);
        } catch (error) {
            console.error('Error al suscribir en ultraEffect:', error);
            return null;
        }
    });

    return () => {
        unsubscribers.forEach(unsub => {
            try {
                unsub && unsub();
            } catch (error) {
                console.error('Error al limpiar ultraEffect:', error);
            }
        });
    };
}

export function UltraContext<T>(initialValue: T): UltraContextReturn<T> {
    if (initialValue === undefined) {
        console.warn('UltraContext: initialValue is undefined');
    }

    let value = initialValue;
    const subscribers = new Set<(value: T) => void>();

    const provide = (newValue: T): void => {
        value = newValue;
        subscribers.forEach(fn => {
            try {
                fn(value);
            } catch (error) {
                console.error('Error en subscriber de UltraContext:', error);
            }
        });
    };

    const getValue = (): T => value;

    const subscribe = (fn: (value: T) => void): (() => void) => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
    };

    return {
        provide,
        subscribe,
        getValue
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

function matchRoute(routePath: string, currentPath: string): RouteMatch {
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
        if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
            return { matched: false, params: {} };
        }
    }

    return { params, matched: true };
}

export function UltraRouter(...routes: Route[]): ContainerWithCleanup {
    const paths = routes.map(r => r.path);
    const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i && p !== '/*');
    if (duplicates.length > 0) {
        console.warn('UltraRouter: Rutas duplicadas detectadas:', duplicates);
    }

    const container = document.createElement('div') as ContainerWithCleanup;
    container.classList.add('browser-router');

    let currentCleanup: CleanupFunction | null = null;

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

            if ((targetComponent as ElementWithCleanup)._cleanup) {
                currentCleanup = (targetComponent as ElementWithCleanup)._cleanup!;
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
        cleanup();
        if (currentCleanup) currentCleanup();
    };

    container._cleanup = () => {
        if (cleanup) cleanup();
        if (currentCleanup) currentCleanup();
    };

    return container;
}

export function UltraLink({ href, child }: UltraLinkProps): ElementWithCleanup {
    if (!href) {
        console.warn('UltraLink: href is required');
    }

    const link = document.createElement('a') as AnchorWithCleanup;
    link.href = href;

    const clickHandler = (e: MouseEvent): void => {
        if (e.ctrlKey || e.metaKey) {
            return;
        }

        e.preventDefault();

        try {
            window.history.pushState({}, '', href);
            window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (error) {
            console.error('Error al navegar:', error);
        }
    };

    link.addEventListener('click', clickHandler);

    const childElement = parseHTMLString(child);
    if (childElement) {
        link.appendChild(childElement);
    }

    link._cleanup = () => {
        link.removeEventListener('click', clickHandler);
    };

    return link;
}

export function UltraFragment(...children: (string | HTMLElement | Node)[]): DocumentFragment {
    const fragment = document.createDocumentFragment();

    children.forEach(component => {
        const element = parseHTMLString(component);
        if (element) {
            fragment.appendChild(element);
        }
    });

    return fragment;
}

export function UltraComponent({
    component,
    eventHandlers = [],
    styles = {},
    children = [],
    trigger = []
}: UltraComponentProps): ElementWithCleanup {
    const node = parseHTMLString(component) as ElementWithCleanup;

    if (!node) {
        console.error('UltraComponent: No se pudo crear el nodo');
        return document.createElement('div') as ElementWithCleanup;
    }

    const cleanupFunctions: CleanupFunction[] = [];

    if (eventHandlers.length > 0) {
        eventHandlers.forEach(eventHandler => {
            const { eventType, eventCallback } = eventHandler;
            if (eventType && eventCallback) {
                (node as HTMLElement).addEventListener(eventType, eventCallback);
                cleanupFunctions.push(() => {
                    (node as HTMLElement).removeEventListener(eventType, eventCallback);
                });
            }
        });
    }

    Object.keys(styles).forEach(key => {
        try {
            (node as HTMLElement).style[key as any] = styles[key as keyof CSSStyleDeclaration] as string;
        } catch (error) {
            console.error(`Error al aplicar estilo ${key}:`, error);
        }
    });

    children.forEach(child => {
        const childElement = parseHTMLString(child);
        if (childElement) {
            node.appendChild(childElement);
        }
    });

    trigger.forEach(t => {
        const { subscriber, subscriberFunction } = t;
        if (subscriber && subscriberFunction) {
            try {
                const unsubscribe = subscriber(() => subscriberFunction(node as HTMLElement));
                if (unsubscribe) {
                    cleanupFunctions.push(unsubscribe);
                }
            } catch (error) {
                console.error('Error en trigger de UltraComponent:', error);
            }
        }
    });

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

export function Activity({
    component,
    stateOn,
    subscriber,
    invert = false,
    trigger = [],
    type = 'display'
}: ActivityProps): ElementWithCleanup {

    const supportedTypes = ['display', 'visibility'];

    if (!supportedTypes.includes(type)) {
        console.warn(`Activity: tipo no soportado. Se usará display por defecto. Tipos soportados: ${supportedTypes.join(', ')}`);
        type = 'display';
    }
    
    const element = parseHTMLString(component) as ElementWithCleanup;

    if (!element) {
        console.error('Activity: No se pudo crear el elemento');
        return document.createElement('div') as ElementWithCleanup;
    }

    const cleanupFunctions: CleanupFunction[] = [];

    const update = (): void => {
        try {
            const current = invert ? !stateOn() : stateOn();
            
            if (type === 'display') {
                (element as HTMLElement).style.display = current ? '' : 'none';
            } else if (type === 'visibility') {
                (element as HTMLElement).style.visibility = current ? 'visible' : 'hidden';
            }
        } catch (error) {
            console.error('Error al actualizar Activity:', error);
        }
    };

    const unsubscribe = subscriber(update);
    if (unsubscribe) {
        cleanupFunctions.push(unsubscribe);
    }

    update();

    trigger.forEach(t => {
        const { subscriber, subscriberFunction } = t;
        if (subscriber && subscriberFunction) {
            try {
                const unsub = subscriber(() => subscriberFunction(element as HTMLElement));
                if (unsub) {
                    cleanupFunctions.push(unsub);
                }
            } catch (error) {
                console.error('Error en trigger de Activity:', error);
            }
        }
    });

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
        classNames.add(match[1]);
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