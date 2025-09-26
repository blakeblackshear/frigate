"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBridgeValue = exports.BridgeProvider = exports.useContextUpdate = exports.useContext = exports.useContextSelector = exports.createContext = void 0;
const react_1 = require("react");
const scheduler_1 = require("scheduler");
const CONTEXT_VALUE = Symbol();
const ORIGINAL_PROVIDER = Symbol();
const isSSR = typeof window === 'undefined' ||
    /ServerSideRendering/.test(window.navigator && window.navigator.userAgent);
const useIsomorphicLayoutEffect = isSSR ? react_1.useEffect : react_1.useLayoutEffect;
// for preact that doesn't have runWithPriority
const runWithNormalPriority = scheduler_1.unstable_runWithPriority
    ? (fn) => {
        try {
            (0, scheduler_1.unstable_runWithPriority)(scheduler_1.unstable_NormalPriority, fn);
        }
        catch (e) {
            if (e.message === 'Not implemented.') {
                fn();
            }
            else {
                throw e;
            }
        }
    }
    : (fn) => fn();
const createProvider = (ProviderOrig) => {
    const ContextProvider = ({ value, children, }) => {
        const valueRef = (0, react_1.useRef)(value);
        const versionRef = (0, react_1.useRef)(0);
        const [resolve, setResolve] = (0, react_1.useState)(null);
        if (resolve) {
            resolve(value);
            setResolve(null);
        }
        const contextValue = (0, react_1.useRef)();
        if (!contextValue.current) {
            const listeners = new Set();
            const update = (fn, options) => {
                versionRef.current += 1;
                const action = {
                    n: versionRef.current,
                };
                if (options === null || options === void 0 ? void 0 : options.suspense) {
                    action.n *= -1; // this is intentional to make it temporary version
                    action.p = new Promise((r) => {
                        setResolve(() => (v) => {
                            action.v = v;
                            delete action.p;
                            r(v);
                        });
                    });
                }
                listeners.forEach((listener) => listener(action));
                fn();
            };
            contextValue.current = {
                [CONTEXT_VALUE]: {
                    /* "v"alue     */ v: valueRef,
                    /* versio"n"   */ n: versionRef,
                    /* "l"isteners */ l: listeners,
                    /* "u"pdate    */ u: update,
                },
            };
        }
        useIsomorphicLayoutEffect(() => {
            valueRef.current = value;
            versionRef.current += 1;
            runWithNormalPriority(() => {
                contextValue.current[CONTEXT_VALUE].l.forEach((listener) => {
                    listener({ n: versionRef.current, v: value });
                });
            });
        }, [value]);
        return (0, react_1.createElement)(ProviderOrig, { value: contextValue.current }, children);
    };
    return ContextProvider;
};
const identity = (x) => x;
/**
 * This creates a special context for `useContextSelector`.
 *
 * @example
 * import { createContext } from 'use-context-selector';
 *
 * const PersonContext = createContext({ firstName: '', familyName: '' });
 */
function createContext(defaultValue) {
    const context = (0, react_1.createContext)({
        [CONTEXT_VALUE]: {
            /* "v"alue     */ v: { current: defaultValue },
            /* versio"n"   */ n: { current: -1 },
            /* "l"isteners */ l: new Set(),
            /* "u"pdate    */ u: (f) => f(),
        },
    });
    context[ORIGINAL_PROVIDER] = context.Provider;
    context.Provider = createProvider(context.Provider);
    delete context.Consumer; // no support for Consumer
    return context;
}
exports.createContext = createContext;
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
function useContextSelector(context, selector) {
    const contextValue = (0, react_1.useContext)(context)[CONTEXT_VALUE];
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        if (!contextValue) {
            throw new Error('useContextSelector requires special context');
        }
    }
    const { 
    /* "v"alue     */ v: { current: value }, 
    /* versio"n"   */ n: { current: version }, 
    /* "l"isteners */ l: listeners, } = contextValue;
    const selected = selector(value);
    const [state, dispatch] = (0, react_1.useReducer)((prev, action) => {
        if (!action) {
            // case for `dispatch()` below
            return [value, selected];
        }
        if ('p' in action) {
            throw action.p;
        }
        if (action.n === version) {
            if (Object.is(prev[1], selected)) {
                return prev; // bail out
            }
            return [value, selected];
        }
        try {
            if ('v' in action) {
                if (Object.is(prev[0], action.v)) {
                    return prev; // do not update
                }
                const nextSelected = selector(action.v);
                if (Object.is(prev[1], nextSelected)) {
                    return prev; // do not update
                }
                return [action.v, nextSelected];
            }
        }
        catch (_e) {
            // ignored (stale props or some other reason)
        }
        return [...prev]; // schedule update
    }, [value, selected]);
    if (!Object.is(state[1], selected)) {
        // schedule re-render
        // this is safe because it's self contained
        dispatch();
    }
    useIsomorphicLayoutEffect(() => {
        listeners.add(dispatch);
        return () => {
            listeners.delete(dispatch);
        };
    }, [listeners]);
    return state[1];
}
exports.useContextSelector = useContextSelector;
/**
 * This hook returns the entire context value.
 * Use this instead of React.useContext for consistent behavior.
 *
 * @example
 * import { useContext } from 'use-context-selector';
 *
 * const person = useContext(PersonContext);
 */
function useContext(context) {
    return useContextSelector(context, identity);
}
exports.useContext = useContext;
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
function useContextUpdate(context) {
    const contextValue = (0, react_1.useContext)(context)[CONTEXT_VALUE];
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        if (!contextValue) {
            throw new Error('useContextUpdate requires special context');
        }
    }
    const { u: update } = contextValue;
    return update;
}
exports.useContextUpdate = useContextUpdate;
/* eslint-disable @typescript-eslint/no-explicit-any */
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
const BridgeProvider = ({ context, value, children, }) => {
    const { [ORIGINAL_PROVIDER]: ProviderOrig } = context;
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        if (!ProviderOrig) {
            throw new Error('BridgeProvider requires special context');
        }
    }
    return (0, react_1.createElement)(ProviderOrig, { value }, children);
};
exports.BridgeProvider = BridgeProvider;
/**
 * This hook return a value for BridgeProvider
 */
const useBridgeValue = (context) => {
    const bridgeValue = (0, react_1.useContext)(context);
    if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        if (!bridgeValue[CONTEXT_VALUE]) {
            throw new Error('useBridgeValue requires special context');
        }
    }
    return bridgeValue;
};
exports.useBridgeValue = useBridgeValue;
