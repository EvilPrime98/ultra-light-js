import { Properties } from "csstype";

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
    subscriber: ((fn: (value: unknown) => void) => () => void) | ((fn: (value: unknown) => void) => () => void)[];
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
    [K in keyof T]: T[K] extends <A>(comp: never, arg: A) => infer R
        ? <A>(arg: A) => R
        : T[K] extends (comp: never, ...args: infer Args) => infer R
            ? (...args: Args) => R
            : IUltraCompStateStateful<T[K]>;
};

type HTMLElementUnion =
| HTMLElement
| HTMLInputElement
| HTMLAnchorElement
| HTMLButtonElement
| HTMLImageElement
| HTMLFormElement
| HTMLSelectElement
| HTMLTextAreaElement
| HTMLVideoElement
| HTMLAudioElement
| HTMLIFrameElement
| HTMLTableElement
| HTMLMetaElement
| HTMLLinkElement
| HTMLScriptElement;

type AnyKey<T> = T extends unknown ? keyof T : never;

export type AllHTMLAttributes = {
  [K in AnyKey<HTMLElementUnion>]?: unknown;
};

export type CSSProperties = Properties<string | number>;

/**
 * Shared prop shape for ultra-light.js's custom elements (`UltraComponent`,
 * `UltraActivity`, `UltraLink`, and any custom ultraelement built on the same
 * conventions). Covers everything that isn't specific to a given component's own
 * identity (e.g. `component` or `href`): event handlers, HTML attributes, styles,
 * class names, children, triggers, mount callbacks, and cleanup functions.
 */
export interface UltraElementProps {
    /**
     * Object containing the event handlers.
     */
    eventHandler?: Partial<Record<keyof HTMLElementEventMap, EventListenerOrEventListenerObject>>;
    /**
     * Object containing the HTML attributes.
     */
    attributes?: Partial<Record<keyof AllHTMLAttributes, string>>;
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
     * May be async — a returned cleanup function is registered after the promise resolves.
     *
     * If the component was constructed inside an `ultraScope` and that scope is
     * disposed before the next frame, pending callbacks are skipped; a cleanup resolved
     * by an async callback after disposal runs immediately instead of being registered.
     */
    onMount?: ((node: UltraLightElement) => void | UltraCleanupFunction | Promise<void | UltraCleanupFunction>)[];
    /**
     * Array of cleanup functions.
     */
    cleanup?: UltraCleanupFunction[];
}