import { type UltraStateReturn, type UltraContextReturn, type UltraRoute, type UltraLinkProps, type UltraTrigger, type UltraCleanupFunction, type UltraLightElement, type UltraLightAnchor, type UltraLightDiv, UltraRenderableElement } from './types';
export type { UltraStateReturn, UltraContextReturn, UltraRoute, UltraLinkProps, UltraTrigger, UltraCleanupFunction, UltraLightElement, UltraLightAnchor, UltraLightDiv };
export declare function ultraState<T>(initialValue: T): [
    () => T,
    (newValue: T) => void,
    (fn: (value: T) => void) => () => void
];
export declare function ultraEffect(fn: () => void | UltraCleanupFunction | Promise<void | UltraCleanupFunction>, subscriberArray: Array<(callback: () => void) => () => void>): UltraCleanupFunction;
export declare function UltraContext<T>(initialValue: T): UltraContextReturn<T>;
export declare function ultraQueryParams(): Record<string, string>;
export declare function UltraRouter(...routes: UltraRoute[]): UltraLightDiv;
export declare function UltraLink({ href, child }: UltraLinkProps): UltraLightElement;
export declare function UltraFragment(...children: (string | HTMLElement | Node)[]): DocumentFragment;
export declare function UltraComponent({ component, eventHandler, styles, children, trigger, cleanup }: {
    component: UltraRenderableElement;
    eventHandler?: Partial<Record<keyof HTMLElementEventMap, EventListenerOrEventListenerObject>>;
    styles?: Partial<CSSStyleDeclaration>;
    children?: (UltraRenderableElement | Node | UltraLightElement)[];
    trigger?: UltraTrigger[];
    cleanup?: UltraCleanupFunction[];
}): UltraLightElement;
export declare function UltraActivity({ component, mode, trigger, type, cleanup }: {
    component: UltraRenderableElement | UltraLightElement;
    mode: {
        state: () => boolean;
        subscriber: (fn: () => void) => () => void;
    };
    trigger?: UltraTrigger[];
    type?: 'display' | 'visibility';
    cleanup?: UltraCleanupFunction[];
}): UltraLightElement;
export declare function ultraStyles(cssString: string): Record<string, string>;
//# sourceMappingURL=ultra-light.d.ts.map