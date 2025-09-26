import type { ComponentType, ReactNode } from 'react';
export interface Context<Value> {
    Provider: ComponentType<{
        value: Value;
        children: ReactNode;
    }>;
    displayName?: string;
}
/**
 * This creates a special context for `useContextSelector`.
 *
 * @example
 * import { createContext } from 'use-context-selector';
 *
 * const PersonContext = createContext({ firstName: '', familyName: '' });
 */
export declare function createContext<Value>(defaultValue: Value): Context<Value>;
/**
 * This hook returns context selected value by selector.
 *
 * It will only accept context created by `createContext`.
 * It will trigger re-render if only the selected value is referentially changed.
 *
 * The selector should return referentially equal result for same input for better performance.
 *
 * @example
 * import { useContextSelector } from 'use-context-selector';
 *
 * const firstName = useContextSelector(PersonContext, (state) => state.firstName);
 */
export declare function useContextSelector<Value, Selected>(context: Context<Value>, selector: (value: Value) => Selected): Selected;
/**
 * This hook returns the entire context value.
 * Use this instead of React.useContext for consistent behavior.
 *
 * @example
 * import { useContext } from 'use-context-selector';
 *
 * const person = useContext(PersonContext);
 */
export declare function useContext<Value>(context: Context<Value>): Value;
/**
 * This hook returns an update function to wrap an updating function
 *
 * Use this for a function that will change a value in
 * concurrent rendering in React 18.
 * Otherwise, there's no need to use this hook.
 *
 * @example
 * import { useContextUpdate } from 'use-context-selector';
 *
 * const update = useContextUpdate();
 *
 * // Wrap set state function
 * update(() => setState(...));
 *
 * // Experimental suspense mode
 * update(() => setState(...), { suspense: true });
 */
export declare function useContextUpdate<Value>(context: Context<Value>): (fn: () => void, options?: {
    suspense: boolean;
} | undefined) => void;
/**
 * This is a Provider component for bridging multiple react roots
 *
 * @example
 * const valueToBridge = useBridgeValue(PersonContext);
 * return (
 *   <Renderer>
 *     <BridgeProvider context={PersonContext} value={valueToBridge}>
 *       {children}
 *     </BridgeProvider>
 *   </Renderer>
 * );
 */
export declare const BridgeProvider: ({ context, value, children, }: {
    context: Context<any>;
    value: unknown;
    children: ReactNode;
}) => import("react").FunctionComponentElement<import("react").ProviderProps<unknown>>;
/**
 * This hook return a value for BridgeProvider
 */
export declare const useBridgeValue: (context: Context<any>) => any;
