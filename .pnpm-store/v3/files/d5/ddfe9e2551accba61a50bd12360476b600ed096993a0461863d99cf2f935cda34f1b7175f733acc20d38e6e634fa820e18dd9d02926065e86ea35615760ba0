"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinimizers = getMinimizers;
const tslib_1 = require("tslib");
const terser_webpack_plugin_1 = tslib_1.__importDefault(require("terser-webpack-plugin"));
const css_minimizer_webpack_plugin_1 = tslib_1.__importDefault(require("css-minimizer-webpack-plugin"));
const importFaster_1 = require("./importFaster");
const currentBundler_1 = require("./currentBundler");
// See https://github.com/webpack-contrib/terser-webpack-plugin#parallel
function getTerserParallel() {
    let terserParallel = true;
    if (process.env.TERSER_PARALLEL === 'false') {
        terserParallel = false;
    }
    else if (process.env.TERSER_PARALLEL &&
        parseInt(process.env.TERSER_PARALLEL, 10) > 0) {
        terserParallel = parseInt(process.env.TERSER_PARALLEL, 10);
    }
    return terserParallel;
}
async function getJsMinimizer({ faster, }) {
    if (faster.swcJsMinimizer) {
        const terserOptions = await (0, importFaster_1.importSwcJsMinimizerOptions)();
        return new terser_webpack_plugin_1.default({
            parallel: getTerserParallel(),
            minify: terser_webpack_plugin_1.default.swcMinify,
            terserOptions,
        });
    }
    return new terser_webpack_plugin_1.default({
        parallel: getTerserParallel(),
        // See https://terser.org/docs/options/
        terserOptions: {
            parse: {
                // We want uglify-js to parse ecma 8 code. However, we don't want it
                // to apply any minification steps that turns valid ecma 5 code
                // into invalid ecma 5 code. This is why the 'compress' and 'output'
                // sections only apply transformations that are ecma 5 safe
                // https://github.com/facebook/create-react-app/pull/4234
                ecma: 2020,
            },
            compress: {
                ecma: 5,
            },
            mangle: {
                safari10: true,
            },
            output: {
                ecma: 5,
                comments: false,
                // Turned on because emoji and regex is not minified properly using
                // default. See https://github.com/facebook/create-react-app/issues/2488
                ascii_only: true,
            },
        },
    });
}
async function getLightningCssMinimizer() {
    return new css_minimizer_webpack_plugin_1.default({
        minify: css_minimizer_webpack_plugin_1.default.lightningCssMinify,
        minimizerOptions: await (0, importFaster_1.importLightningCssMinimizerOptions)(),
    });
}
async function getCssNanoMinimizer() {
    // This is an historical env variable to opt-out of the advanced minimizer
    // Sometimes there's a bug in it and people are happy to disable it
    const useSimpleCssMinifier = process.env.USE_SIMPLE_CSS_MINIFIER === 'true';
    if (useSimpleCssMinifier) {
        return new css_minimizer_webpack_plugin_1.default();
    }
    // Using the array syntax to add 2 minimizers
    // see https://github.com/webpack-contrib/css-minimizer-webpack-plugin#array
    return new css_minimizer_webpack_plugin_1.default({
        minimizerOptions: [
            // CssNano options
            {
                preset: require.resolve('@docusaurus/cssnano-preset'),
            },
            // CleanCss options
            {
                inline: false,
                level: {
                    1: {
                        all: false,
                        removeWhitespace: true,
                    },
                    2: {
                        all: true,
                        restructureRules: true,
                        removeUnusedAtRules: false,
                    },
                },
            },
        ],
        minify: [
            css_minimizer_webpack_plugin_1.default.cssnanoMinify,
            css_minimizer_webpack_plugin_1.default.cleanCssMinify,
        ],
    });
}
async function getCssMinimizer(params) {
    return params.faster.lightningCssMinimizer
        ? getLightningCssMinimizer()
        : getCssNanoMinimizer();
}
async function getWebpackMinimizers(params) {
    return Promise.all([getJsMinimizer(params), getCssMinimizer(params)]);
}
async function getRspackMinimizers({ currentBundler, }) {
    const rspack = (0, currentBundler_1.getCurrentBundlerAsRspack)({ currentBundler });
    const getBrowserslistQueries = await (0, importFaster_1.importGetBrowserslistQueries)();
    const browserslistQueries = getBrowserslistQueries({ isServer: false });
    const swcJsMinimizerOptions = await (0, importFaster_1.importSwcJsMinimizerOptions)();
    return [
        // See https://rspack.dev/plugins/rspack/swc-js-minimizer-rspack-plugin
        // See https://swc.rs/docs/configuration/minification
        new rspack.SwcJsMinimizerRspackPlugin({
            minimizerOptions: {
                minify: true,
                ...swcJsMinimizerOptions,
            },
        }),
        new rspack.LightningCssMinimizerRspackPlugin({
            minimizerOptions: {
                ...(await (0, importFaster_1.importLightningCssMinimizerOptions)()),
                // Not sure why but Rspack takes browserslist queries directly
                // While LightningCSS targets are normally not browserslist queries
                // We have to override the option to avoid errors
                // See https://rspack.dev/plugins/rspack/lightning-css-minimizer-rspack-plugin#minimizeroptions
                // See https://lightningcss.dev/transpilation.html
                targets: browserslistQueries,
            },
        }),
    ];
}
async function getMinimizers(params) {
    return params.currentBundler.name === 'rspack'
        ? getRspackMinimizers(params)
        : getWebpackMinimizers(params);
}
//# sourceMappingURL=minification.js.map