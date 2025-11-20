// Core State Management

export interface StateSubscriber<T> {
    getValue: () => T;
    setValue: (newValue: T) => void;
    subscribe: (fn: (value: T) => void) => () => void;
}

export type UltraStateReturn<T> = StateSubscriber<T>;

export interface UltraContextReturn<T> {
    set: (newValue: T) => void;
    get: () => T;
    subscribe: (fn: (value: T) => void) => () => void;
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