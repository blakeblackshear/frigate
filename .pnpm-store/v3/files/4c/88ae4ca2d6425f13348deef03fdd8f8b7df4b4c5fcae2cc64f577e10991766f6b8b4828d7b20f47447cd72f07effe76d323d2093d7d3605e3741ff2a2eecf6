import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createProxy, isChanged } from 'proxy-compare';
import { useAffectedDebugValue } from './utils.js';
const hasGlobalProcess = typeof process === 'object';
export const createTrackedSelector = (useSelector) => {
    const useTrackedSelector = () => {
        const [, forceUpdate] = useReducer((c) => c + 1, 0);
        // per-hook affected, it's not ideal but memo compatible
        const affected = useMemo(() => new WeakMap(), []);
        const prevState = useRef();
        const lastState = useRef();
        useEffect(() => {
            if (prevState.current !== lastState.current &&
                isChanged(prevState.current, lastState.current, affected, new WeakMap())) {
                prevState.current = lastState.current;
                forceUpdate();
            }
        });
        const selector = useCallback((nextState) => {
            lastState.current = nextState;
            if (prevState.current &&
                prevState.current !== nextState &&
                !isChanged(prevState.current, nextState, affected, new WeakMap())) {
                // not changed
                return prevState.current;
            }
            prevState.current = nextState;
            return nextState;
        }, [affected]);
        const state = useSelector(selector);
        if (hasGlobalProcess && process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useAffectedDebugValue(state, affected);
        }
        const proxyCache = useMemo(() => new WeakMap(), []); // per-hook proxyCache
        return createProxy(state, affected, proxyCache);
    };
    return useTrackedSelector;
};
