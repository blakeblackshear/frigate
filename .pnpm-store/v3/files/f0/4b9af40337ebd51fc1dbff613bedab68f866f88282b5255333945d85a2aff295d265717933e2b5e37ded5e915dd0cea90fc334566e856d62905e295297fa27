"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importStar(require("@docusaurus/logger"));
const openBrowser_1 = tslib_1.__importDefault(require("../utils/openBrowser/openBrowser"));
const watcher_1 = require("./watcher");
const webpack_1 = require("./webpack");
const utils_1 = require("./utils");
async function doStart(siteDirParam = '.', cliOptions = {}) {
    logger_1.default.info('Starting the development server...');
    // Temporary workaround to unlock the ability to translate the site config
    // We'll remove it if a better official API can be designed
    // See https://github.com/facebook/docusaurus/issues/4542
    process.env.DOCUSAURUS_CURRENT_LOCALE = cliOptions.locale;
    const reloadableSite = await (0, utils_1.createReloadableSite)({ siteDirParam, cliOptions });
    (0, watcher_1.setupSiteFileWatchers)({ props: reloadableSite.get().props, cliOptions }, ({ plugin }) => {
        if (plugin) {
            reloadableSite.reloadPlugin(plugin);
        }
        else {
            reloadableSite.reload();
        }
    });
    const devServer = await (0, webpack_1.createWebpackDevServer)({
        props: reloadableSite.get().props,
        cliOptions,
        openUrlContext: reloadableSite.openUrlContext,
    });
    ['SIGINT', 'SIGTERM'].forEach((sig) => {
        process.on(sig, () => {
            devServer.stop();
            process.exit();
        });
    });
    await devServer.start();
    if (cliOptions.open) {
        await (0, openBrowser_1.default)(reloadableSite.getOpenUrl());
    }
}
async function start(siteDirParam = '.', cliOptions = {}) {
    return logger_1.PerfLogger.async('CLI start', () => doStart(siteDirParam, cliOptions));
}
