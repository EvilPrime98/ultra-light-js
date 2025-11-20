// Core State Management

export interface StateSubscriber<T> {
    getValue: () => T;
    setValue: (newValue: T) => void;
    subscribe: (fn: (value: T) => void) => () => void;
}

export type UltraStateReturn<T> = StateSubscriber<T>;

export interface UltraContextReturn<T> {
    provide: (newValue: T) => void;
    subscribe: (fn: (value: T) => void) => () => void;
    getValue: () => T;
}

// Routing

export interface UltraRouteMatch {
    params: Record<string, string>;
    matched: boolean;
    isWildcard?: boolean;
}

export type RouteComponentFn = (params?: Record<string, string>) => 
    string | HTMLElement | DocumentFragment;

export interface UltraRoute {
    path: string;
    component: RouteComponentFn;
}

export interface UltraLinkProps {
    href: string;
    child: string | HTMLElement | DocumentFragment;
}

// Component System

export type UltraRenderableElement = string | HTMLElement | DocumentFragment;

export type UltraCleanupFunction = () => void | Promise<void>;

export interface UltraLightElement extends HTMLElement {
    _cleanup?: UltraCleanupFunction;
}

export interface UltraTrigger<T = HTMLElement> {
    subscriber: (fn: (value: any) => void) => () => void;
    triggerFunction: (node: T) => void;
}

export interface UltraComponentProps {
    component: UltraRenderableElement;
    events?: Partial<Record<keyof HTMLElementEventMap, EventListenerOrEventListenerObject>>;
    styles?: Partial<CSSStyleDeclaration>;
    children?: (UltraRenderableElement | Node | UltraLightElement)[];
    trigger?: UltraTrigger[];
    cleanup?: UltraCleanupFunction[];
}

export interface UltraActivityProps {
    component: UltraRenderableElement | UltraLightElement;
    mode: {
        state: () => boolean;
        subscriber: (fn: () => void) => () => void;
    }
    trigger?: UltraTrigger[];
    type?: 'display' | 'visibility';
    cleanup?: UltraCleanupFunction[];
}

// Type Guards & Utilities

export function hasCleanup(element: HTMLElement | Node): element is UltraLightElement {
    return '_cleanup' in element;
}

// Specialized Element Types

export interface UltraLightAnchor extends HTMLAnchorElement {
    _cleanup?: UltraCleanupFunction;
}

export interface UltraLightDiv extends HTMLDivElement {
    _cleanup?: UltraCleanupFunction;
}