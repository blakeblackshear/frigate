"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAffectedDebugValue = void 0;
const react_1 = require("react");
const proxy_compare_1 = require("proxy-compare");
const useAffectedDebugValue = (state, affected) => {
    const pathList = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
        pathList.current = (0, proxy_compare_1.affectedToPathList)(state, affected);
    });
    (0, react_1.useDebugValue)(state);
};
exports.useAffectedDebugValue = useAffectedDebugValue;
