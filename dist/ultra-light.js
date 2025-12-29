import { hasCleanup } from './types';
function parseHTMLString(htmlString) {
    if (typeof htmlString !== 'string')
        return htmlString;
    const trimmed = htmlString.trim();
    const svgExclusiveTags = new Set([
        'svg', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'path', 'g',
        'defs', 'symbol', 'use', 'marker', 'clipPath', 'mask', 'pattern',
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
    const tagMatch = trimmed.match(/^<([a-z][a-z0-9-]*)/i);
    const tag = tagMatch?.[1]?.toLowerCase();
    if (!tag)
        return null;
    const isSVGRoot = tag === 'svg';
    const isSVGExclusive = svgExclusiveTags.has(tag);
    if (isSVGRoot || isSVGExclusive) {
        const temp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        temp.innerHTML = trimmed;
        return temp.firstElementChild;
    }
    const template = document.createElement('template');
    template.innerHTML = trimmed;
    return template.content.firstElementChild;
}
function stableHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}
export function ultraState(initialValue) {
    if (initialValue === undefined) {
        console.warn('ultraState: initialValue is undefined');
    }
    let value = (typeof initialValue === 'object')
        ? Object.freeze(initialValue)
        : initialValue;
    const subscribers = new Set();
    const setValue = (newValue) => {
        if (typeof value !== 'object' && value === newValue)
            return;
        value = newValue;
        subscribers.forEach(fn => {
            try {
                fn(value);
            }
            catch (error) {
                console.error('Error en subscriber de ultraState:', error);
            }
        });
    };
    const subscribe = (fn) => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
    };
    return [
        () => value,
        setValue,
        subscribe
    ];
}
export function ultraEffect(fn, subscriberArray) {
    let mainCleanup = null;
    const runFn = async () => {
        try {
            const result = await fn();
            if (typeof result === "function") {
                mainCleanup = result;
            }
        }
        catch (error) {
            console.error("Error en ultraEffect:", error);
        }
    };
    runFn();
    const unsubscribers = subscriberArray.map(subscriber => {
        try {
            return subscriber(runFn);
        }
        catch (error) {
            console.error("Error al suscribir en ultraEffect:", error);
            return null;
        }
    });
    return async () => {
        if (mainCleanup) {
            try {
                await mainCleanup();
            }
            catch (error) {
                console.error("Error al ejecutar cleanup principal en ultraEffect:", error);
            }
        }
        for (const unsub of unsubscribers) {
            if (!unsub)
                continue;
            try {
                await Promise.resolve(unsub());
            }
            catch (error) {
                console.error("Error al limpiar ultraEffect:", error);
            }
        }
    };
}
export function UltraContext(initialValue) {
    if (initialValue === undefined) {
        console.warn('UltraContext: initialValue is undefined');
    }
    let value = initialValue;
    const subscribers = new Set();
    const setValue = (newValue) => {
        if (typeof value !== 'object' && value === newValue)
            return;
        value = newValue;
        subscribers.forEach(fn => {
            try {
                fn(value);
            }
            catch (error) {
                console.error('Error en subscriber de UltraContext:', error);
            }
        });
    };
    const getValue = () => value;
    const subscribe = (fn) => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
    };
    return {
        set: setValue,
        get: getValue,
        subscribe,
    };
}
export function ultraQueryParams() {
    const urlData = new URLSearchParams(window.location.search);
    const params = {};
    urlData.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}
function matchRoute(routePath, currentPath) {
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
    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = pathParts[i];
        }
        else if (routeParts[i] !== pathParts[i]) {
            return { matched: false, params: {} };
        }
    }
    return { params, matched: true };
}
export function UltraRouter(...routes) {
    const paths = routes.map(r => r.path);
    const duplicates = paths.filter((p, i) => paths.indexOf(p) !== i && p !== '/*');
    if (duplicates.length > 0) {
        console.warn('UltraRouter: Rutas duplicadas detectadas:', duplicates);
    }
    const container = document.createElement('div');
    container.classList.add('browser-router');
    let currentCleanup = null;
    const renderRoute = () => {
        if (currentCleanup) {
            try {
                currentCleanup();
            }
            catch (error) {
                console.error('Error al limpiar ruta anterior:', error);
            }
        }
        const currentPath = window.location.pathname;
        let targetComponent = null;
        let routeParams = {};
        let wildcardComponent = null;
        routes.forEach(route => {
            const match = matchRoute(route.path, currentPath);
            if (match.matched && !match.isWildcard && !targetComponent) {
                routeParams = match.params;
                const component = route.component(routeParams);
                targetComponent = parseHTMLString(component);
            }
            else if (match.matched && match.isWildcard) {
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
            if (targetComponent._cleanup) {
                currentCleanup = targetComponent._cleanup;
            }
        }
    };
    renderRoute();
    const handler = () => renderRoute();
    window.addEventListener('popstate', handler);
    const cleanup = () => {
        window.removeEventListener('popstate', handler);
    };
    container._cleanup = () => {
        if (cleanup)
            cleanup();
        if (currentCleanup)
            currentCleanup();
    };
    return container;
}
export function UltraLink({ href, child }) {
    if (!href) {
        console.warn('UltraLink: href is required');
    }
    const link = document.createElement('a');
    link.href = href;
    const clickHandler = (e) => {
        if (e.ctrlKey || e.metaKey) {
            return;
        }
        e.preventDefault();
        try {
            window.history.pushState({}, '', href);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
        catch (error) {
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
export function UltraFragment(...children) {
    const fragment = document.createDocumentFragment();
    children.forEach(component => {
        const element = parseHTMLString(component);
        if (element) {
            fragment.appendChild(element);
        }
    });
    return fragment;
}
export function UltraComponent({ component, eventHandler = {}, styles = {}, children = [], trigger = [], cleanup = [] }) {
    const node = parseHTMLString(component);
    if (!node) {
        console.error('UltraComponent: No se pudo crear el nodo');
        return document.createElement('div');
    }
    const cleanupFunctions = [];
    Object.keys(eventHandler).forEach((event) => {
        const handler = eventHandler[event];
        if (handler) {
            node.addEventListener(event, handler);
            cleanupFunctions.push(() => node.removeEventListener(event, handler));
        }
    });
    Object.keys(styles).forEach(key => {
        try {
            node.style[key] = styles[key];
        }
        catch (error) {
            console.error(`Error al aplicar estilo ${key}:`, error);
        }
    });
    children.forEach(child => {
        const childElement = parseHTMLString(child);
        if (childElement) {
            node.appendChild(childElement);
            if (hasCleanup(childElement)) {
                cleanupFunctions.push(childElement._cleanup);
            }
        }
    });
    trigger.forEach(t => {
        const { subscriber, triggerFunction: subscriberFunction } = t;
        if (subscriber && subscriberFunction) {
            try {
                const unsubscribe = subscriber(() => subscriberFunction(node));
                if (unsubscribe) {
                    cleanupFunctions.push(unsubscribe);
                }
            }
            catch (error) {
                console.error('Error en trigger de UltraComponent:', error);
            }
        }
    });
    cleanup.forEach(fn => {
        try {
            cleanupFunctions.push(fn);
        }
        catch (error) {
            console.error('Error añadiendo cleanup de UltraComponent:', error);
        }
    });
    node._cleanup = () => {
        cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            }
            catch (error) {
                console.error('Error al limpiar UltraComponent:', error);
            }
        });
    };
    return node;
}
export function UltraActivity({ component, mode, trigger = [], type = 'display', cleanup = [] }) {
    const supportedTypes = ['display', 'visibility'];
    if (!supportedTypes.includes(type)) {
        console.warn(`Activity: tipo no soportado. Se usará display por defecto. Tipos soportados: ${supportedTypes.join(', ')}`);
        type = 'display';
    }
    const element = parseHTMLString(component);
    if (!element) {
        console.error('Activity: No se pudo crear el elemento');
        return document.createElement('div');
    }
    const cleanupFunctions = [];
    const update = () => {
        try {
            const current = mode.state();
            if (type === 'display') {
                element.style.display = current ? '' : 'none';
            }
            else if (type === 'visibility') {
                element.style.visibility = current ? 'visible' : 'hidden';
            }
        }
        catch (error) {
            console.error('Error al actualizar Activity:', error);
        }
    };
    const unsubscribe = mode.subscriber(update);
    if (unsubscribe) {
        cleanupFunctions.push(unsubscribe);
    }
    update();
    trigger.forEach(t => {
        const { subscriber, triggerFunction } = t;
        if (subscriber && triggerFunction) {
            try {
                const unsub = subscriber(() => triggerFunction(element));
                if (unsub) {
                    cleanupFunctions.push(unsub);
                }
            }
            catch (error) {
                console.error('Error en trigger de Activity:', error);
            }
        }
    });
    cleanup.forEach(fn => {
        try {
            cleanupFunctions.push(fn);
        }
        catch (error) {
            console.error('Error añadiendo cleanup de Activity:', error);
        }
    });
    element._cleanup = () => {
        cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            }
            catch (error) {
                console.error('Error al limpiar Activity:', error);
            }
        });
    };
    return element;
}
const styleCache = new Map();
export function ultraStyles(cssString) {
    if (!cssString || typeof cssString !== 'string') {
        console.warn('ultraStyles: cssString inválido');
        return {};
    }
    const hash = stableHash(cssString);
    if (styleCache.has(hash)) {
        return styleCache.get(hash);
    }
    let styleEl = document.getElementById('ultra-styles');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'ultra-styles';
        document.head.appendChild(styleEl);
    }
    const classMap = {};
    const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
    let match;
    const classNames = new Set();
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
