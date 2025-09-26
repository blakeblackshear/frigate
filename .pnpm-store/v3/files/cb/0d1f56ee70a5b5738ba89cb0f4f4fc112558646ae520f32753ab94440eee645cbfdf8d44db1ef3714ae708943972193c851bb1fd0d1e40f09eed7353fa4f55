"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenUrlContext = createOpenUrlContext;
exports.createReloadableSite = createReloadableSite;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const url_1 = tslib_1.__importDefault(require("url"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
const logger_1 = tslib_1.__importStar(require("@docusaurus/logger"));
const getHostPort_1 = require("../../server/getHostPort");
const site_1 = require("../../server/site");
const pluginsUtils_1 = require("../../server/plugins/pluginsUtils");
// This code was historically in CRA/react-dev-utils (deprecated in 2025)
// We internalized it, refactored and removed useless code paths
// See https://github.com/facebook/docusaurus/pull/10956
// See https://github.com/facebook/create-react-app/blob/main/packages/react-dev-utils/WebpackDevServerUtils.js
function getOpenUrlOrigin(protocol, host, port) {
    const isUnspecifiedHost = host === '0.0.0.0' || host === '::';
    const prettyHost = isUnspecifiedHost ? 'localhost' : host;
    const localUrlForBrowser = url_1.default.format({
        protocol,
        hostname: prettyHost,
        port,
        pathname: '/',
    });
    return localUrlForBrowser;
}
async function createOpenUrlContext({ cliOptions, }) {
    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    const { host, port } = await (0, getHostPort_1.getHostPort)(cliOptions);
    if (port === null) {
        return process.exit();
    }
    const getOpenUrl = ({ baseUrl, router }) => {
        return (0, utils_1.normalizeUrl)([
            getOpenUrlOrigin(protocol, host, port),
            router === 'hash' ? '/#/' : '',
            baseUrl,
        ]);
    };
    return { host, port, getOpenUrl };
}
async function createLoadSiteParams({ siteDirParam, cliOptions, }) {
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    return {
        siteDir,
        config: cliOptions.config,
        locale: cliOptions.locale,
    };
}
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
async function createReloadableSite(startParams) {
    const openUrlContext = await createOpenUrlContext(startParams);
    const loadSiteParams = await logger_1.PerfLogger.async('createLoadSiteParams', () => createLoadSiteParams(startParams));
    let site = await logger_1.PerfLogger.async('Load site', () => (0, site_1.loadSite)(loadSiteParams));
    const get = () => site;
    const getOpenUrl = () => openUrlContext.getOpenUrl({
        baseUrl: site.props.baseUrl,
        router: site.props.siteConfig.future.experimental_router,
    });
    const printOpenUrlMessage = () => {
        logger_1.default.success `Docusaurus website is running at: url=${getOpenUrl()}`;
    };
    printOpenUrlMessage();
    const reloadBase = async () => {
        try {
            const oldSite = site;
            site = await logger_1.PerfLogger.async('Reload site', () => (0, site_1.reloadSite)(site));
            if (oldSite.props.baseUrl !== site.props.baseUrl) {
                printOpenUrlMessage();
            }
        }
        catch (e) {
            logger_1.default.error('Site reload failure');
            console.error(e);
        }
    };
    // TODO instead of debouncing we should rather add AbortController support?
    const reload = lodash_1.default.debounce(reloadBase, 500);
    // TODO this could be subject to plugin reloads race conditions
    //  In practice, it is not likely the user will hot reload 2 plugins at once
    //  but we should still support it and probably use a task queuing system
    const reloadPlugin = async (plugin) => {
        try {
            site = await logger_1.PerfLogger.async(`Reload site plugin ${(0, pluginsUtils_1.formatPluginName)(plugin)}`, () => {
                const pluginIdentifier = { name: plugin.name, id: plugin.options.id };
                return (0, site_1.reloadSitePlugin)(site, pluginIdentifier);
            });
        }
        catch (e) {
            logger_1.default.error(`Site plugin reload failure - Plugin ${(0, pluginsUtils_1.formatPluginName)(plugin)}`);
            console.error(e);
        }
    };
    return { get, getOpenUrl, reload, reloadPlugin, openUrlContext };
}
