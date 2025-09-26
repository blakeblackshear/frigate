export { createProcessor } from "./lib/core.js";
export { nodeTypes } from "./lib/node-types.js";
export type Fragment = import("hast-util-to-jsx-runtime").Fragment;
export type Jsx = import("hast-util-to-jsx-runtime").Jsx;
export type JsxDev = import("hast-util-to-jsx-runtime").JsxDev;
export type UseMdxComponents = import("./lib/util/resolve-evaluate-options.js").UseMdxComponents;
export type CompileOptions = import("./lib/compile.js").CompileOptions;
export type ProcessorOptions = import("./lib/core.js").ProcessorOptions;
export type EvaluateOptions = import("./lib/util/resolve-evaluate-options.js").EvaluateOptions;
export type RunOptions = import("./lib/util/resolve-evaluate-options.js").RunOptions;
export { compile, compileSync } from "./lib/compile.js";
export { evaluate, evaluateSync } from "./lib/evaluate.js";
export { run, runSync } from "./lib/run.js";
//# sourceMappingURL=index.d.ts.map