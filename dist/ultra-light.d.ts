import type { UltraStateReturn, UltraContextReturn, Route, UltraLinkProps, EventHandler, Trigger, UltraComponentProps, ActivityProps, CleanupFunction, ElementWithCleanup, AnchorWithCleanup, ContainerWithCleanup } from './types.ts';
export type { UltraStateReturn, UltraContextReturn, Route, UltraLinkProps, EventHandler, Trigger, UltraComponentProps, ActivityProps, CleanupFunction, ElementWithCleanup, AnchorWithCleanup, ContainerWithCleanup };
export declare function ultraState<T>(initialValue: T): [
    () => T,
    (newValue: T) => void,
    (fn: (value: T) => void) => () => void
];
export declare function ultraEffect(fn: () => void | CleanupFunction | Promise<void | CleanupFunction>, subscriberArray: Array<(callback: () => void) => () => void>): CleanupFunction;
export declare function UltraContext<T>(initialValue: T): UltraContextReturn<T>;
export declare function ultraQueryParams(): Record<string, string>;
export declare function UltraRouter(...routes: Route[]): ContainerWithCleanup;
export declare function UltraLink({ href, child }: UltraLinkProps): ElementWithCleanup;
export declare function UltraFragment(...children: (string | HTMLElement | Node)[]): DocumentFragment;
export declare function UltraComponent({ component, eventHandlers, styles, children, trigger, cleanup }: UltraComponentProps): ElementWithCleanup;
export declare function Activity({ component, stateOn, subscriber, invert, trigger, type, cleanup }: ActivityProps): ElementWithCleanup;
export declare function ultraStyles(cssString: string): Record<string, string>;
//# sourceMappingURL=ultra-light.d.ts.map