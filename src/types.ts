export interface UltraStateReturn<T> {
    getValue: () => T;
    setValue: (newValue: T) => void;
    subscribe: (fn: (value: T) => void) => () => void;
}

export interface UltraContextReturn<T> {
    provide: (newValue: T) => void;
    subscribe: (fn: (value: T) => void) => () => void;
    getValue: () => T;
}

export interface RouteMatch {
    params: Record<string, string>;
    matched: boolean;
    isWildcard?: boolean;
}

export interface Route {
    path: string;
    component: (params?: Record<string, string>) => string | HTMLElement | DocumentFragment;
}

export interface UltraLinkProps {
    href: string;
    child: string | HTMLElement | DocumentFragment;
}

export interface EventHandler {
    eventType: keyof HTMLElementEventMap;
    eventCallback: (event: Event) => void;
}

export interface Trigger<T = HTMLElement> {
    subscriber: (fn: (value: any) => void) => () => void;
    subscriberFunction: (node: T) => void;
}

export interface UltraComponentProps {
    component: string | HTMLElement | DocumentFragment;
    eventHandlers?: EventHandler[];
    styles?: Partial<CSSStyleDeclaration>;
    children?: (string | HTMLElement | Node | DocumentFragment | ElementWithCleanup)[];
    trigger?: Trigger[];
    cleanup?: CleanupFunction[];
}

export interface ActivityProps {
    component: string | HTMLElement | DocumentFragment | ElementWithCleanup;
    stateOn: () => boolean;
    subscriber: (fn: () => void) => () => void;
    invert?: boolean;
    trigger?: Trigger[];
    type?: 'display' | 'visibility';
    cleanup?: CleanupFunction[];
}

export type CleanupFunction = () => void | Promise<void>;

export interface ElementWithCleanup extends HTMLElement {
    _cleanup?: CleanupFunction;
}

export interface AnchorWithCleanup extends HTMLAnchorElement {
    _cleanup?: CleanupFunction;
}

export interface ContainerWithCleanup extends HTMLDivElement {
    _cleanup?: CleanupFunction;
}

export function hasCleanup(element: HTMLElement | Node): element is ElementWithCleanup {
    return '_cleanup' in element;
}