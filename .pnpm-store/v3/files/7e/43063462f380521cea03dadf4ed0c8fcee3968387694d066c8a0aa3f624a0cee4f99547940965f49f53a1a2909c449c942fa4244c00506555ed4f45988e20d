"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigureWebpackUtils = createConfigureWebpackUtils;
exports.applyConfigureWebpack = applyConfigureWebpack;
exports.applyConfigurePostCss = applyConfigurePostCss;
exports.executePluginsConfigureWebpack = executePluginsConfigureWebpack;
const webpack_merge_1 = require("webpack-merge");
const bundler_1 = require("@docusaurus/bundler");
/**
 * Creates convenient utils to inject into the configureWebpack() lifecycle
 * @param config the Docusaurus config
 */
async function createConfigureWebpackUtils({ siteConfig, }) {
    const currentBundler = await (0, bundler_1.getCurrentBundler)({ siteConfig });
    const getStyleLoaders = await (0, bundler_1.createStyleLoadersFactory)({ currentBundler });
    const getJSLoader = await (0, bundler_1.createJsLoaderFactory)({ siteConfig });
    return {
        currentBundler,
        getStyleLoaders,
        getJSLoader,
    };
}
/**
 * Helper function to modify webpack config
 * @param configureWebpack a webpack config or a function to modify config
 * @param config initial webpack config
 * @param isServer indicates if this is a server webpack configuration
 * @param utils the <code>ConfigureWebpackUtils</code> utils to inject into the configureWebpack() lifecycle
 * @param content content loaded by the plugin
 * @returns final/ modified webpack config
 */
function applyConfigureWebpack({ configureWebpack, config, isServer, configureWebpackUtils, content, }) {
    if (typeof configureWebpack === 'function') {
        const { mergeStrategy, ...res } = configureWebpack(config, isServer, configureWebpackUtils, content) ?? {};
        const customizeRules = mergeStrategy ?? {};
        return (0, webpack_merge_1.mergeWithCustomize)({
            customizeArray: (0, webpack_merge_1.customizeArray)(customizeRules),
            customizeObject: (0, webpack_merge_1.customizeObject)(customizeRules),
        })(config, res);
    }
    return config;
}
function applyConfigurePostCss(configurePostCss, config) {
    // Not ideal heuristic but good enough for our use-case?
    function isPostCssLoader(loader) {
        return !!loader?.options?.postcssOptions;
    }
    // Does not handle all edge cases, but good enough for now
    function overridePostCssOptions(entry) {
        if (isPostCssLoader(entry)) {
            entry.options.postcssOptions = configurePostCss(entry.options.postcssOptions);
        }
        else if (Array.isArray(entry.oneOf)) {
            entry.oneOf.forEach((r) => {
                if (r) {
                    overridePostCssOptions(r);
                }
            });
        }
        else if (Array.isArray(entry.use)) {
            entry.use
                .filter((u) => typeof u === 'object')
                .forEach((rule) => overridePostCssOptions(rule));
        }
    }
    config.module?.rules?.forEach((rule) => overridePostCssOptions(rule));
    return config;
}
// Plugin Lifecycle - configurePostCss()
function executePluginsConfigurePostCss({ plugins, config, }) {
    let resultConfig = config;
    plugins.forEach((plugin) => {
        const { configurePostCss } = plugin;
        if (configurePostCss) {
            resultConfig = applyConfigurePostCss(configurePostCss.bind(plugin), resultConfig);
        }
    });
    return resultConfig;
}
// Plugin Lifecycle - configureWebpack()
function executePluginsConfigureWebpack({ plugins, config: configInput, isServer, configureWebpackUtils, }) {
    let config = configInput;
    // Step1 - Configure Webpack
    plugins.forEach((plugin) => {
        const { configureWebpack } = plugin;
        if (configureWebpack) {
            config = applyConfigureWebpack({
                configureWebpack: configureWebpack.bind(plugin), // The plugin lifecycle may reference `this`.
                config,
                isServer,
                configureWebpackUtils,
                content: plugin.content,
            });
        }
    });
    // Step2 - For client code, configure PostCSS
    // The order matters! We want to configure PostCSS on loaders
    // that were potentially added by configureWebpack
    // See https://github.com/facebook/docusaurus/issues/10106
    // Note: it's useless to configure postCSS for the server
    if (!isServer) {
        config = executePluginsConfigurePostCss({
            plugins,
            config,
        });
    }
    return config;
}
