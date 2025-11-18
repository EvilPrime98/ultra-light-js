import { type UltraStateReturn, type UltraContextReturn, type UltraRoute, type UltraLinkProps, type UltraEventHandler, type UltraTrigger, type UltraComponentProps, type UltraActivityProps, type UltraCleanupFunction, type UltraLightElement, type UltraLightAnchor, type UltraLightDiv } from './types';
export type { UltraStateReturn, UltraContextReturn, UltraRoute, UltraLinkProps, UltraEventHandler, UltraTrigger, UltraComponentProps, UltraActivityProps, UltraCleanupFunction, UltraLightElement, UltraLightAnchor, UltraLightDiv };
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
export declare function UltraComponent({ component, eventHandlers, styles, children, trigger, cleanup }: UltraComponentProps): UltraLightElement;
export declare function UltraActivity({ component, stateOn, subscriber, invert, trigger, type, cleanup }: UltraActivityProps): UltraLightElement;
export declare function ultraStyles(cssString: string): Record<string, string>;
//# sourceMappingURL=ultra-light.d.ts.map