import type { UltraContextReturn, Route, UltraLinkProps, UltraComponentProps, ActivityProps, CleanupFunction, ElementWithCleanup, ContainerWithCleanup } from './types.ts';
export declare function ultraState<T>(initialValue: T): [
    () => T,
    (newValue: T) => void,
    (fn: (value: T) => void) => () => void
];
export declare function ultraEffect(fn: () => void | Promise<void>, subscriberArray: Array<(fn: () => void) => () => void>): CleanupFunction;
export declare function UltraContext<T>(initialValue: T): UltraContextReturn<T>;
export declare function ultraQueryParams(): Record<string, string>;
export declare function UltraRouter(...routes: Route[]): ContainerWithCleanup;
export declare function UltraLink({ href, child }: UltraLinkProps): ElementWithCleanup;
export declare function UltraFragment(...children: (string | HTMLElement | Node)[]): DocumentFragment;
export declare function UltraComponent({ component, eventHandlers, styles, children, trigger }: UltraComponentProps): ElementWithCleanup;
export declare function Activity({ component, stateOn, subscriber, invert, trigger }: ActivityProps): ElementWithCleanup;
export declare function ultraStyles(cssString: string): Record<string, string>;
//# sourceMappingURL=ultra-light.d.ts.map