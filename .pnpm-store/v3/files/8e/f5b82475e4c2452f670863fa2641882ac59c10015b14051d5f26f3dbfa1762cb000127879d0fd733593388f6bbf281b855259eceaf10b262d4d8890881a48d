"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStartClientConfig = createStartClientConfig;
exports.createBuildClientConfig = createBuildClientConfig;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const webpack_merge_1 = tslib_1.__importDefault(require("webpack-merge"));
const webpack_bundle_analyzer_1 = require("webpack-bundle-analyzer");
const react_loadable_ssr_addon_v5_slorber_1 = tslib_1.__importDefault(require("react-loadable-ssr-addon-v5-slorber"));
const html_webpack_plugin_1 = tslib_1.__importDefault(require("html-webpack-plugin"));
const bundler_1 = require("@docusaurus/bundler");
const utils_1 = require("@docusaurus/utils");
const base_1 = require("./base");
const ChunkAssetPlugin_1 = tslib_1.__importDefault(require("./plugins/ChunkAssetPlugin"));
const ForceTerminatePlugin_1 = tslib_1.__importDefault(require("./plugins/ForceTerminatePlugin"));
const StaticDirectoriesCopyPlugin_1 = require("./plugins/StaticDirectoriesCopyPlugin");
async function createBaseClientConfig({ props, hydrate, minify, faster, configureWebpackUtils, }) {
    const baseConfig = await (0, base_1.createBaseConfig)({
        props,
        isServer: false,
        minify,
        faster,
        configureWebpackUtils,
    });
    const ProgressBarPlugin = await (0, bundler_1.getProgressBarPlugin)({
        currentBundler: props.currentBundler,
    });
    return (0, webpack_merge_1.default)(baseConfig, {
        // Useless, disabled on purpose (errors on existing sites with no
        // browserslist config)
        // target: 'browserslist',
        entry: path_1.default.resolve(__dirname, '../client/clientEntry.js'),
        optimization: {
            // Keep the runtime chunk separated to enable long term caching
            // https://x.com/wSokra/status/969679223278505985
            runtimeChunk: true,
        },
        plugins: [
            new props.currentBundler.instance.DefinePlugin({
                'process.env.HYDRATE_CLIENT_ENTRY': JSON.stringify(hydrate),
            }),
            new ChunkAssetPlugin_1.default(),
            new ProgressBarPlugin({
                name: 'Client',
                color: 'green',
            }),
            await (0, StaticDirectoriesCopyPlugin_1.createStaticDirectoriesCopyPlugin)({
                props,
            }),
        ].filter(Boolean),
    });
}
// client config when running "docusaurus start"
async function createStartClientConfig({ props, minify, poll, faster, configureWebpackUtils, }) {
    const { siteConfig, headTags, preBodyTags, postBodyTags } = props;
    const clientConfig = (0, webpack_merge_1.default)(await createBaseClientConfig({
        props,
        minify,
        hydrate: false,
        faster,
        configureWebpackUtils,
    }), {
        watchOptions: {
            ignored: /node_modules\/(?!@docusaurus)/,
            poll,
        },
        infrastructureLogging: {
            // Reduce log verbosity, see https://github.com/facebook/docusaurus/pull/5420#issuecomment-906613105
            level: 'warn',
        },
        plugins: [
            // Generates an `index.html` file with the <script> injected.
            new html_webpack_plugin_1.default({
                template: path_1.default.join(__dirname, './templates/dev.html.template.ejs'),
                // So we can define the position where the scripts are injected.
                inject: false,
                filename: 'index.html',
                title: siteConfig.title,
                headTags,
                preBodyTags,
                postBodyTags,
                lang: (0, utils_1.getLocaleConfig)(props.i18n).htmlLang,
            }),
        ],
    });
    return { clientConfig };
}
// client config when running "docusaurus build"
async function createBuildClientConfig({ props, minify, faster, configureWebpackUtils, bundleAnalyzer, }) {
    // Apply user webpack config.
    const { generatedFilesDir, siteConfig } = props;
    const router = siteConfig.future.experimental_router;
    // With the hash router, we don't hydrate the React app, even in build mode!
    // This is because it will always be a client-rendered React app
    const hydrate = router !== 'hash';
    const clientManifestPath = path_1.default.join(generatedFilesDir, 'client-manifest.json');
    const config = (0, webpack_merge_1.default)(await createBaseClientConfig({
        props,
        minify,
        faster,
        configureWebpackUtils,
        hydrate,
    }), {
        plugins: [
            new ForceTerminatePlugin_1.default(),
            // Visualize size of webpack output files with an interactive zoomable
            // tree map.
            bundleAnalyzer && new webpack_bundle_analyzer_1.BundleAnalyzerPlugin(),
            // Generate client manifests file that will be used for server bundle.
            new react_loadable_ssr_addon_v5_slorber_1.default({
                filename: clientManifestPath,
            }),
        ],
    });
    return { config, clientManifestPath };
}
