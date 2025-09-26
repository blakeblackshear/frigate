"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebpackDevServer = createWebpackDevServer;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const webpack_merge_1 = tslib_1.__importDefault(require("webpack-merge"));
const bundler_1 = require("@docusaurus/bundler");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const webpack_dev_server_1 = tslib_1.__importDefault(require("webpack-dev-server"));
const evalSourceMapMiddleware_1 = tslib_1.__importDefault(require("../utils/legacy/evalSourceMapMiddleware"));
const watcher_1 = require("./watcher");
const getHttpsConfig_1 = tslib_1.__importDefault(require("../../webpack/utils/getHttpsConfig"));
const configure_1 = require("../../webpack/configure");
const client_1 = require("../../webpack/client");
// E2E_TEST=true docusaurus start
// Makes "docusaurus start" exit immediately on success/error, for E2E test
function registerWebpackE2ETestHook(compiler) {
    compiler.hooks.done.tap('done', (stats) => {
        const errorsWarnings = stats.toJson('errors-warnings');
        const statsErrorMessage = (0, bundler_1.formatStatsErrorMessage)(errorsWarnings);
        if (statsErrorMessage) {
            console.error(statsErrorMessage);
        }
        (0, bundler_1.printStatsWarnings)(errorsWarnings);
        if (process.env.E2E_TEST) {
            if (stats.hasErrors()) {
                logger_1.default.error('E2E_TEST: Project has compiler errors.');
                process.exit(1);
            }
            logger_1.default.success('E2E_TEST: Project can compile.');
            process.exit(0);
        }
    });
}
async function createDevServerConfig({ cliOptions, props, host, port, }) {
    const { baseUrl, siteDir, siteConfig } = props;
    const pollingOptions = (0, watcher_1.createPollingOptions)(cliOptions);
    const httpsConfig = await (0, getHttpsConfig_1.default)();
    // https://webpack.js.org/configuration/dev-server
    return {
        hot: cliOptions.hotOnly ? 'only' : true,
        liveReload: false,
        client: {
            progress: true,
            overlay: {
                warnings: false,
                errors: true,
            },
            webSocketURL: {
                hostname: '0.0.0.0',
                port: 0,
            },
        },
        headers: {
            'access-control-allow-origin': '*',
        },
        devMiddleware: {
            publicPath: siteConfig.future.experimental_router === 'hash' ? 'auto' : baseUrl,
            // Reduce log verbosity, see https://github.com/facebook/docusaurus/pull/5420#issuecomment-906613105
            stats: 'summary',
        },
        static: siteConfig.staticDirectories.map((dir) => ({
            publicPath: baseUrl,
            directory: path_1.default.resolve(siteDir, dir),
            watch: {
                // Useful options for our own monorepo using symlinks!
                // See https://github.com/webpack/webpack/issues/11612#issuecomment-879259806
                followSymlinks: true,
                ignored: /node_modules\/(?!@docusaurus)/,
                ...{ pollingOptions },
            },
        })),
        ...(httpsConfig && {
            server: typeof httpsConfig === 'object'
                ? {
                    type: 'https',
                    options: httpsConfig,
                }
                : 'https',
        }),
        historyApiFallback: {
            rewrites: [{ from: /\/*/, to: baseUrl }],
        },
        allowedHosts: 'all',
        host,
        port,
        setupMiddlewares: (middlewares, devServer) => {
            // This lets us fetch source contents from webpack for the error overlay.
            middlewares.unshift((0, evalSourceMapMiddleware_1.default)(devServer));
            return middlewares;
        },
    };
}
async function getStartClientConfig({ props, minify, poll, configureWebpackUtils, }) {
    const { plugins } = props;
    let { clientConfig: config } = await (0, client_1.createStartClientConfig)({
        props,
        minify,
        faster: props.siteConfig.future.experimental_faster,
        poll,
        configureWebpackUtils,
    });
    config = (0, configure_1.executePluginsConfigureWebpack)({
        plugins,
        config,
        isServer: false,
        configureWebpackUtils,
    });
    return config;
}
async function createWebpackDevServer({ props, cliOptions, openUrlContext, }) {
    const configureWebpackUtils = await (0, configure_1.createConfigureWebpackUtils)({
        siteConfig: props.siteConfig,
    });
    const config = await getStartClientConfig({
        props,
        minify: cliOptions.minify ?? true,
        poll: cliOptions.poll,
        configureWebpackUtils,
    });
    const compiler = props.currentBundler.instance(config);
    registerWebpackE2ETestHook(compiler);
    const defaultDevServerConfig = await createDevServerConfig({
        cliOptions,
        props,
        host: openUrlContext.host,
        port: openUrlContext.port,
    });
    // Allow plugin authors to customize/override devServer config
    const devServerConfig = (0, webpack_merge_1.default)([defaultDevServerConfig, config.devServer].filter(Boolean));
    return new webpack_dev_server_1.default(devServerConfig, compiler);
}
