import type { ReactNode } from 'react';
type AnyFunction = (...args: any[]) => any;
type Options<State, Update extends AnyFunction> = {
    defaultState?: State;
    defaultUpdate?: Update;
    stateContextName?: string;
    updateContextName?: string;
    concurrentMode?: boolean;
};
/**
 * [Deprecated] Please use object option
 */
type DeprecatedOption = boolean;
export declare const createContainer: <State, Update extends AnyFunction, Props>(useValue: (props: Props) => readonly [State, Update], options?: Options<State, Update> | DeprecatedOption) => {
    readonly Provider: (props: Props & {
        children: ReactNode;
    }) => import("react").FunctionComponentElement<import("react").ProviderProps<Update | undefined>>;
    readonly useTrackedState: () => State;
    readonly useTracked: () => [State, Update | ((...args: Parameters<Update>) => ReturnType<Update>)];
    readonly useUpdate: (() => (...args: Parameters<Update>) => ReturnType<Update>) | (() => Update);
    readonly useSelector: <Selected>(selector: (state: State) => Selected) => Selected;
};
export {};
