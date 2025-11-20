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
export interface UltraRouteMatch {
    params: Record<string, string>;
    matched: boolean;
    isWildcard?: boolean;
}
export type RouteComponentFn = (params?: Record<string, string>) => string | HTMLElement | DocumentFragment;
export interface UltraRoute {
    path: string;
    component: RouteComponentFn;
}
export interface UltraLinkProps {
    href: string;
    child: string | HTMLElement | DocumentFragment;
}
export type UltraRenderableElement = string | HTMLElement | DocumentFragment;
export type UltraCleanupFunction = () => void | Promise<void>;
export interface UltraLightElement extends HTMLElement {
    _cleanup?: UltraCleanupFunction;
}
export interface UltraTrigger<T = HTMLElement> {
    subscriber: (fn: (value: any) => void) => () => void;
    triggerFunction: (node: T) => void;
}
export declare function hasCleanup(element: HTMLElement | Node): element is UltraLightElement;
export interface UltraLightAnchor extends HTMLAnchorElement {
    _cleanup?: UltraCleanupFunction;
}
export interface UltraLightDiv extends HTMLDivElement {
    _cleanup?: UltraCleanupFunction;
}
//# sourceMappingURL=types.d.ts.map