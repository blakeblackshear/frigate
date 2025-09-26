"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMDXLoaderItem = createMDXLoaderItem;
exports.createMDXLoaderRule = createMDXLoaderRule;
const processor_1 = require("./processor");
async function normalizeOptions(optionsInput) {
    // Because Jest doesn't like ESM / createProcessors()
    if (process.env.N0DE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        return optionsInput;
    }
    let options = optionsInput;
    // We create the processor earlier here, to avoid the lazy processor creating
    // Lazy creation messes-up with Rsdoctor ability to measure mdx-loader perf
    if (!options.processors) {
        options = { ...options, processors: await (0, processor_1.createProcessors)({ options }) };
    }
    // Cross-compiler cache permits to compile client/server MDX only once
    // We don't want to cache in dev mode (docusaurus start)
    // We only have multiple compilers in production mode (docusaurus build)
    // TODO wrong but good enough for now (example: "docusaurus build --dev")
    if (options.useCrossCompilerCache && process.env.NODE_ENV === 'production') {
        options = {
            ...options,
            crossCompilerCache: new Map(),
        };
    }
    return options;
}
async function createMDXLoaderItem(options) {
    return {
        loader: require.resolve('@docusaurus/mdx-loader'),
        options: await normalizeOptions(options),
    };
}
async function createMDXLoaderRule({ include, options, }) {
    return {
        test: /\.mdx?$/i,
        include,
        use: [await createMDXLoaderItem(options)],
    };
}
//# sourceMappingURL=createMDXLoader.js.map