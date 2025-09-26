"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJsLoaderFactory = createJsLoaderFactory;
const babel_1 = require("@docusaurus/babel");
const importFaster_1 = require("../importFaster");
const currentBundler_1 = require("../currentBundler");
const BabelJsLoaderFactory = ({ isServer, babelOptions, }) => {
    return {
        loader: require.resolve('babel-loader'),
        options: (0, babel_1.getBabelOptions)({ isServer, babelOptions }),
    };
};
async function createSwcJsLoaderFactory() {
    const loader = await (0, importFaster_1.importSwcLoader)();
    const getOptions = await (0, importFaster_1.importGetSwcLoaderOptions)();
    return ({ isServer }) => {
        return {
            loader,
            options: getOptions({ isServer }),
        };
    };
}
// Same as swcLoader, except we use the built-in SWC loader
async function createRspackSwcJsLoaderFactory() {
    const loader = 'builtin:swc-loader';
    const getOptions = await (0, importFaster_1.importGetSwcLoaderOptions)();
    return ({ isServer }) => {
        return {
            loader,
            options: getOptions({ isServer }),
        };
    };
}
// Confusing: function that creates a function that creates actual js loaders
// This is done on purpose because the js loader factory is a public API
// It is injected in configureWebpack plugin lifecycle for plugin authors
async function createJsLoaderFactory({ siteConfig, }) {
    const currentBundler = await (0, currentBundler_1.getCurrentBundler)({ siteConfig });
    const isSWCLoader = siteConfig.future.experimental_faster.swcJsLoader;
    if (isSWCLoader) {
        if (siteConfig.webpack?.jsLoader) {
            throw new Error(`You can't use siteConfig.webpack.jsLoader and siteConfig.future.experimental_faster.swcJsLoader at the same time.
To avoid any configuration ambiguity, you must make an explicit choice:
- If you want to use Docusaurus Faster and SWC (recommended), remove siteConfig.webpack.jsLoader
- If you want to use a custom JS loader, use siteConfig.future.experimental_faster.swcJsLoader: false`);
        }
        return currentBundler.name === 'rspack'
            ? createRspackSwcJsLoaderFactory()
            : createSwcJsLoaderFactory();
    }
    const jsLoader = siteConfig.webpack?.jsLoader ?? 'babel';
    if (jsLoader instanceof Function) {
        return ({ isServer }) => jsLoader(isServer);
    }
    if (jsLoader === 'babel') {
        return BabelJsLoaderFactory;
    }
    throw new Error(`Docusaurus bug: unexpected jsLoader value${jsLoader}`);
}
//# sourceMappingURL=jsLoader.js.map