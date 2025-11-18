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
export interface UltraRouteMatch {
    params: Record<string, string>;
    matched: boolean;
    isWildcard?: boolean;
}
export interface UltraRoute {
    path: string;
    component: (params?: Record<string, string>) => string | HTMLElement | DocumentFragment;
}
export interface UltraLinkProps {
    href: string;
    child: string | HTMLElement | DocumentFragment;
}
export interface UltraEventHandler<K extends keyof HTMLElementEventMap = keyof HTMLElementEventMap> {
    eventType: K;
    eventCallback: (event: HTMLElementEventMap[K]) => void;
}
export interface UltraTrigger<T = HTMLElement> {
    subscriber: (fn: (value: any) => void) => () => void;
    subscriberFunction: (node: T) => void;
}
export interface UltraComponentProps {
    component: string | HTMLElement | DocumentFragment;
    eventHandlers?: UltraEventHandler[];
    styles?: Partial<CSSStyleDeclaration>;
    children?: (string | HTMLElement | Node | DocumentFragment | UltraLightElement)[];
    trigger?: UltraTrigger[];
    cleanup?: UltraCleanupFunction[];
}
export interface UltraActivityProps {
    component: string | HTMLElement | DocumentFragment | UltraLightElement;
    stateOn: () => boolean;
    subscriber: (fn: () => void) => () => void;
    invert?: boolean;
    trigger?: UltraTrigger[];
    type?: 'display' | 'visibility';
    cleanup?: UltraCleanupFunction[];
}
export type UltraCleanupFunction = () => void | Promise<void>;
export interface UltraLightElement extends HTMLElement {
    _cleanup?: UltraCleanupFunction;
}
export interface UltraLightAnchor extends HTMLAnchorElement {
    _cleanup?: UltraCleanupFunction;
}
export interface UltraLightDiv extends HTMLDivElement {
    _cleanup?: UltraCleanupFunction;
}
export declare function hasCleanup(element: HTMLElement | Node): element is UltraLightElement;
//# sourceMappingURL=types.d.ts.map