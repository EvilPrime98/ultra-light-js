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
    component: (params?: Record<string, string>) => string | HTMLElement;
}
export interface UltraLinkProps {
    href: string;
    child: string | HTMLElement;
}
export interface EventHandler {
    eventType: string;
    eventCallback: (event: Event) => void;
}
export interface Trigger<T = HTMLElement> {
    subscriber: (fn: (value: any) => void) => () => void;
    subscriberFunction: (node: T) => void;
}
export interface UltraComponentProps {
    component: string | HTMLElement;
    eventHandlers?: EventHandler[];
    styles?: Partial<CSSStyleDeclaration>;
    children?: (string | HTMLElement | Node)[];
    trigger?: Trigger[];
}
export interface ActivityProps {
    component: string | HTMLElement;
    stateOn: () => boolean;
    subscriber: (fn: () => void) => () => void;
    invert?: boolean;
    trigger?: Trigger[];
}
export type CleanupFunction = () => void;
export interface ElementWithCleanup extends HTMLElement {
    _cleanup?: CleanupFunction;
}
export interface AnchorWithCleanup extends HTMLAnchorElement {
    _cleanup?: CleanupFunction;
}
export interface ContainerWithCleanup extends HTMLDivElement {
    _cleanup?: CleanupFunction;
}
//# sourceMappingURL=types.d.ts.map