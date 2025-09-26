"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPollingOptions = createPollingOptions;
exports.watch = watch;
exports.getSitePathsToWatch = getSitePathsToWatch;
exports.getPluginPathsToWatch = getPluginPathsToWatch;
exports.setupSiteFileWatchers = setupSiteFileWatchers;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const chokidar_1 = tslib_1.__importDefault(require("chokidar"));
const utils_1 = require("@docusaurus/utils");
function createPollingOptions(cliOptions) {
    return {
        usePolling: !!cliOptions.poll,
        interval: Number.isInteger(cliOptions.poll)
            ? cliOptions.poll
            : undefined,
    };
}
/**
 * Watch file system paths for changes and emit events
 * Returns an async handle to stop watching
 */
function watch(params, callback) {
    const { pathsToWatch, siteDir, ...options } = params;
    const fsWatcher = chokidar_1.default.watch(pathsToWatch, {
        cwd: siteDir,
        ignoreInitial: true,
        ...options,
    });
    fsWatcher.on('all', (name, eventPath) => callback({ name, path: eventPath }));
    return () => fsWatcher.close();
}
function getSitePathsToWatch({ props }) {
    return [
        // TODO we should also watch all imported modules!
        //  Use https://github.com/vercel/nft ?
        props.siteConfigPath,
        props.localizationDir,
    ];
}
function getPluginPathsToWatch({ siteDir, plugin, }) {
    const normalizeToSiteDir = (filepath) => {
        if (filepath && path_1.default.isAbsolute(filepath)) {
            return (0, utils_1.posixPath)(path_1.default.relative(siteDir, filepath));
        }
        return (0, utils_1.posixPath)(filepath);
    };
    return (plugin.getPathsToWatch?.() ?? [])
        .filter(Boolean)
        .map(normalizeToSiteDir);
}
function setupSiteFileWatchers({ props, cliOptions, }, callback) {
    const { siteDir } = props;
    const pollingOptions = createPollingOptions(cliOptions);
    // TODO on config / or local plugin updates,
    //  the getFilePathsToWatch lifecycle code might get updated
    //  so we should probably reset the watchers?
    watch({
        pathsToWatch: getSitePathsToWatch({ props }),
        siteDir: props.siteDir,
        ...pollingOptions,
    }, (event) => callback({ plugin: null, event }));
    props.plugins.forEach((plugin) => {
        watch({
            pathsToWatch: getPluginPathsToWatch({ plugin, siteDir }),
            siteDir,
            ...pollingOptions,
        }, (event) => callback({ plugin, event }));
    });
}
