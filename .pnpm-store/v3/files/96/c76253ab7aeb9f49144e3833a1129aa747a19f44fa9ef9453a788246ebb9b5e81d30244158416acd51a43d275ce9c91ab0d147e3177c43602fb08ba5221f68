import { createContext as createContextOrig, createElement, useCallback, useContext as useContextOrig, useDebugValue, } from 'react';
import { createContext, useContextSelector, useContextUpdate, } from 'use-context-selector';
import { createTrackedSelector } from './createTrackedSelector.js';
const hasGlobalProcess = typeof process === 'object';
export const createContainer = (useValue, options) => {
    if (typeof options === 'boolean') {
        // eslint-disable-next-line no-console
        console.warn('boolean option is deprecated, please specify { concurrentMode: true }');
        options = { concurrentMode: options };
    }
    const { stateContextName = 'StateContainer', updateContextName = 'UpdateContainer', concurrentMode, } = options || {};
    const StateContext = createContext(options === null || options === void 0 ? void 0 : options.defaultState);
    const UpdateContext = createContextOrig(options === null || options === void 0 ? void 0 : options.defaultUpdate);
    StateContext.displayName = stateContextName;
    UpdateContext.displayName = updateContextName;
    const Provider = (props) => {
        const [state, update] = useValue(props);
        return createElement(UpdateContext.Provider, { value: update }, createElement(StateContext.Provider, { value: state }, props.children));
    };
    const useSelector = (selector) => {
        if (hasGlobalProcess && process.env.NODE_ENV !== 'production') {
            const selectorOrig = selector;
            selector = (state) => {
                if (state === undefined) {
                    throw new Error('Please use <Provider>');
                }
                return selectorOrig(state);
            };
        }
        const selected = useContextSelector(StateContext, selector);
        useDebugValue(selected);
        return selected;
    };
    const useTrackedState = createTrackedSelector(useSelector);
    const useUpdate = concurrentMode
        ? () => {
            if (hasGlobalProcess &&
                process.env.NODE_ENV !== 'production' &&
                useContextOrig(UpdateContext) === undefined) {
                throw new Error('Please use <Provider>');
            }
            const contextUpdate = useContextUpdate(StateContext);
            const update = useContextOrig(UpdateContext);
            return useCallback((...args) => {
                let result;
                contextUpdate(() => {
                    result = update(...args);
                });
                return result;
            }, [contextUpdate, update]);
        }
        : // not concurrentMode
            () => {
                if (typeof process === 'object' &&
                    process.env.NODE_ENV !== 'production' &&
                    useContextOrig(UpdateContext) === undefined) {
                    throw new Error('Please use <Provider>');
                }
                return useContextOrig(UpdateContext);
            };
    const useTracked = () => [useTrackedState(), useUpdate()];
    return {
        Provider,
        useTrackedState,
        useTracked,
        useUpdate,
        useSelector,
    };
};
