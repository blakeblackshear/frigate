"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrackedSelector = void 0;
const react_1 = require("react");
const proxy_compare_1 = require("proxy-compare");
const utils_js_1 = require("./utils.js");
const hasGlobalProcess = typeof process === 'object';
const createTrackedSelector = (useSelector) => {
    const useTrackedSelector = () => {
        const [, forceUpdate] = (0, react_1.useReducer)((c) => c + 1, 0);
        // per-hook affected, it's not ideal but memo compatible
        const affected = (0, react_1.useMemo)(() => new WeakMap(), []);
        const prevState = (0, react_1.useRef)();
        const lastState = (0, react_1.useRef)();
        (0, react_1.useEffect)(() => {
            if (prevState.current !== lastState.current &&
                (0, proxy_compare_1.isChanged)(prevState.current, lastState.current, affected, new WeakMap())) {
                prevState.current = lastState.current;
                forceUpdate();
            }
        });
        const selector = (0, react_1.useCallback)((nextState) => {
            lastState.current = nextState;
            if (prevState.current &&
                prevState.current !== nextState &&
                !(0, proxy_compare_1.isChanged)(prevState.current, nextState, affected, new WeakMap())) {
                // not changed
                return prevState.current;
            }
            prevState.current = nextState;
            return nextState;
        }, [affected]);
        const state = useSelector(selector);
        if (hasGlobalProcess && process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            (0, utils_js_1.useAffectedDebugValue)(state, affected);
        }
        const proxyCache = (0, react_1.useMemo)(() => new WeakMap(), []); // per-hook proxyCache
        return (0, proxy_compare_1.createProxy)(state, affected, proxyCache);
    };
    return useTrackedSelector;
};
exports.createTrackedSelector = createTrackedSelector;
