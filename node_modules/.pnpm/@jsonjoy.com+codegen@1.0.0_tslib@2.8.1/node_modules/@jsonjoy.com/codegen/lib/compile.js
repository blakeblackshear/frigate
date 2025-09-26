"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileClosure = exports.compile = void 0;
const compile = (js) => eval(js);
exports.compile = compile;
const compileClosure = (fn) => (0, exports.compile)(fn.js)(...fn.deps);
exports.compileClosure = compileClosure;
//# sourceMappingURL=compile.js.map