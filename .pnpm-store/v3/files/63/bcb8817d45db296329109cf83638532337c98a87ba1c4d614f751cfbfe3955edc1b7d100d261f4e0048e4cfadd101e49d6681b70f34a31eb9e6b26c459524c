"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createServerConfig;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const webpack_merge_1 = tslib_1.__importDefault(require("webpack-merge"));
const utils_1 = require("@docusaurus/utils");
const bundler_1 = require("@docusaurus/bundler");
const base_1 = require("./base");
async function createServerConfig({ props, configureWebpackUtils, }) {
    const baseConfig = await (0, base_1.createBaseConfig)({
        props,
        isServer: true,
        minify: false,
        faster: props.siteConfig.future.experimental_faster,
        configureWebpackUtils,
    });
    const ProgressBarPlugin = await (0, bundler_1.getProgressBarPlugin)({
        currentBundler: props.currentBundler,
    });
    const outputFilename = 'server.bundle.js';
    const outputDir = path_1.default.join(props.outDir, '__server');
    const serverBundlePath = path_1.default.join(outputDir, outputFilename);
    const config = (0, webpack_merge_1.default)(baseConfig, {
        target: `node${utils_1.NODE_MAJOR_VERSION}.${utils_1.NODE_MINOR_VERSION}`,
        entry: {
            main: path_1.default.resolve(__dirname, '../client/serverEntry.js'),
        },
        output: {
            path: outputDir,
            filename: outputFilename,
            libraryTarget: 'commonjs2',
        },
        plugins: [
            new ProgressBarPlugin({
                name: 'Server',
                color: 'yellow',
            }),
        ],
        optimization: {
            // The optimization.concatenateModules is expensive
            // - On the server, it's not useful to run it at all
            // - On the client, it leads to a ~3% JS assets total size decrease
            //   Let's keep it by default, but large sites may prefer faster builds
            // See also https://github.com/facebook/docusaurus/pull/11176
            // Note: we don't want to enable it on the client for "docusaurus start"
            // See also https://github.com/facebook/docusaurus/pull/11222
            concatenateModules: false,
        },
    });
    return { config, serverBundlePath };
}
