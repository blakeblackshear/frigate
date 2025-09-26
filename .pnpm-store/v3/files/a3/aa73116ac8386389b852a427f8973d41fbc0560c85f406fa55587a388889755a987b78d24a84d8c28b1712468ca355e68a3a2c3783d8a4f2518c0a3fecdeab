"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContainer = void 0;
const react_1 = require("react");
const use_context_selector_1 = require("use-context-selector");
const createTrackedSelector_js_1 = require("./createTrackedSelector.js");
const hasGlobalProcess = typeof process === 'object';
const createContainer = (useValue, options) => {
    if (typeof options === 'boolean') {
        // eslint-disable-next-line no-console
        console.warn('boolean option is deprecated, please specify { concurrentMode: true }');
        options = { concurrentMode: options };
    }
    const { stateContextName = 'StateContainer', updateContextName = 'UpdateContainer', concurrentMode, } = options || {};
    const StateContext = (0, use_context_selector_1.createContext)(options === null || options === void 0 ? void 0 : options.defaultState);
    const UpdateContext = (0, react_1.createContext)(options === null || options === void 0 ? void 0 : options.defaultUpdate);
    StateContext.displayName = stateContextName;
    UpdateContext.displayName = updateContextName;
    const Provider = (props) => {
        const [state, update] = useValue(props);
        return (0, react_1.createElement)(UpdateContext.Provider, { value: update }, (0, react_1.createElement)(StateContext.Provider, { value: state }, props.children));
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
        const selected = (0, use_context_selector_1.useContextSelector)(StateContext, selector);
        (0, react_1.useDebugValue)(selected);
        return selected;
    };
    const useTrackedState = (0, createTrackedSelector_js_1.createTrackedSelector)(useSelector);
    const useUpdate = concurrentMode
        ? () => {
            if (hasGlobalProcess &&
                process.env.NODE_ENV !== 'production' &&
                (0, react_1.useContext)(UpdateContext) === undefined) {
                throw new Error('Please use <Provider>');
            }
            const contextUpdate = (0, use_context_selector_1.useContextUpdate)(StateContext);
            const update = (0, react_1.useContext)(UpdateContext);
            return (0, react_1.useCallback)((...args) => {
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
                    (0, react_1.useContext)(UpdateContext) === undefined) {
                    throw new Error('Please use <Provider>');
                }
                return (0, react_1.useContext)(UpdateContext);
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
exports.createContainer = createContainer;
