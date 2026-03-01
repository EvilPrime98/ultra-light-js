export interface StateSubscriber<T> {
    getValue: () => T;
    setValue: (newValue: T) => void;
    subscribe: (fn: (value: T) => void) => () => void;
}

export type UltraStateReturn<T> = StateSubscriber<T>;

export interface UltraContextReturn<T> {
    set: (newValue: T, candidate?: UltraLightElement) => void;
    get: (candidate?: UltraLightElement) => T;
    subscribe: (fn: (value: T) => void, candidate?: UltraLightElement) => () => void;
    own: (newOwner: UltraLightElement) => void;
}

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

export type UltraRenderableElement = string | HTMLElement | DocumentFragment;

export type UltraCleanupFunction = () => void | Promise<void>;

export interface UltraLightElement extends HTMLElement {
    _cleanup?: UltraCleanupFunction;
}

export interface UltraTrigger<T = HTMLElement> {
    subscriber: (fn: (value: any) => void) => () => void;
    triggerFunction: (node: T) => void;
    /**
     * When true, the trigger callback is deferred to the next animation frame.
     * Useful when the trigger depends on DOM updates completing first.
     */
    defer?: boolean;
}

export function hasCleanup(element: HTMLElement | Node): element is UltraLightElement {
    return '_cleanup' in element;
}

export interface UltraLightAnchor extends HTMLAnchorElement {
    _cleanup?: UltraCleanupFunction;
}

export interface UltraLightDiv extends HTMLDivElement {
    _cleanup?: UltraCleanupFunction;
}

export interface IUltraCompStateStateful<T> {
    get: () => T;
    set: (newValue: T) => void;
    subscribe: (fn: (value: T) => void) => () => void;
}

export type UltraCompStateResult<T extends Record<string, unknown>> = {
    [K in keyof T]: T[K] extends (comp: any, ...args: infer Args) => infer R
        ? (...args: Args) => R
        : IUltraCompStateStateful<T[K]>;
};