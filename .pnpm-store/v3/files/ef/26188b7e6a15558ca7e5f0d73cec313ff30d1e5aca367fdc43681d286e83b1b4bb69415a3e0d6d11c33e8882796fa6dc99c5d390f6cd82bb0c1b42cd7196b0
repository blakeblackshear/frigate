"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocale = buildLocale;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const bundler_1 = require("@docusaurus/bundler");
const logger_1 = tslib_1.__importStar(require("@docusaurus/logger"));
const site_1 = require("../../server/site");
const brokenLinks_1 = require("../../server/brokenLinks");
const client_1 = require("../../webpack/client");
const server_1 = tslib_1.__importDefault(require("../../webpack/server"));
const configure_1 = require("../../webpack/configure");
const ssgExecutor_1 = require("../../ssg/ssgExecutor");
const clearPath_1 = tslib_1.__importDefault(require("../utils/clearPath"));
const buildUtils_1 = require("./buildUtils");
const SkipBundling = process.env.DOCUSAURUS_SKIP_BUNDLING === 'true';
const ExitAfterLoading = process.env.DOCUSAURUS_EXIT_AFTER_LOADING === 'true';
const ExitAfterBundling = process.env.DOCUSAURUS_EXIT_AFTER_BUNDLING === 'true';
async function buildLocale({ siteDir, locale, cliOptions, }) {
    // Temporary workaround to unlock the ability to translate the site config
    // We'll remove it if a better official API can be designed
    // See https://github.com/facebook/docusaurus/issues/4542
    process.env.DOCUSAURUS_CURRENT_LOCALE = locale;
    logger_1.default.info `name=${`[${locale}]`} Creating an optimized production build...`;
    const site = await logger_1.PerfLogger.async('Load site', () => (0, site_1.loadSite)({
        siteDir,
        outDir: cliOptions.outDir,
        config: cliOptions.config,
        locale,
        automaticBaseUrlLocalizationDisabled: (0, buildUtils_1.isAutomaticBaseUrlLocalizationDisabled)(cliOptions),
    }));
    if (ExitAfterLoading) {
        return process.exit(0);
    }
    const { props } = site;
    const { outDir, plugins, siteConfig } = props;
    const router = siteConfig.future.experimental_router;
    const configureWebpackUtils = await (0, configure_1.createConfigureWebpackUtils)({ siteConfig });
    // We can build the 2 configs in parallel
    const [{ clientConfig, clientManifestPath }, { serverConfig, serverBundlePath }] = await logger_1.PerfLogger.async(`Creating ${props.currentBundler.name} bundler configs`, () => Promise.all([
        getBuildClientConfig({
            props,
            cliOptions,
            configureWebpackUtils,
        }),
        getBuildServerConfig({
            props,
            configureWebpackUtils,
        }),
        // We also clear website/build dir
        // returns void, no useful result needed before compilation
        // See also https://github.com/facebook/docusaurus/pull/11037
        SkipBundling ? undefined : (0, clearPath_1.default)(outDir),
    ]));
    if (SkipBundling) {
        console.warn(`Skipping the Docusaurus bundling step because DOCUSAURUS_SKIP_BUNDLING='true'`);
    }
    else {
        const cleanupBundlerTracing = await (0, bundler_1.registerBundlerTracing)({
            currentBundler: props.currentBundler,
        });
        // Run webpack to build JS bundle (client) and static html files (server).
        await logger_1.PerfLogger.async(`Bundling with ${props.currentBundler.name}`, () => {
            return (0, bundler_1.compile)({
                configs: 
                // For hash router we don't do SSG and can skip the server bundle
                router === 'hash' ? [clientConfig] : [clientConfig, serverConfig],
                currentBundler: configureWebpackUtils.currentBundler,
            });
        });
        await cleanupBundlerTracing();
    }
    if (ExitAfterBundling) {
        return process.exit(0);
    }
    const { collectedData } = await logger_1.PerfLogger.async('SSG', () => (0, ssgExecutor_1.executeSSG)({
        props,
        serverBundlePath,
        clientManifestPath,
        router,
    }));
    await cleanupServerBundle(serverBundlePath);
    // Plugin Lifecycle - postBuild.
    await logger_1.PerfLogger.async('postBuild()', () => executePluginsPostBuild({ plugins, props, collectedData }));
    // TODO execute this in parallel to postBuild?
    await logger_1.PerfLogger.async('Broken links checker', () => executeBrokenLinksCheck({ props, collectedData }));
    logger_1.default.success `Generated static files in path=${path_1.default.relative(process.cwd(), outDir)}.`;
}
async function executePluginsPostBuild({ plugins, props, collectedData, }) {
    const head = props.siteConfig.future.v4.removeLegacyPostBuildHeadAttribute
        ? {}
        : lodash_1.default.mapValues(collectedData, (d) => d.metadata.helmet);
    const routesBuildMetadata = lodash_1.default.mapValues(collectedData, (d) => d.metadata.public);
    await Promise.all(plugins.map(async (plugin) => {
        if (!plugin.postBuild) {
            return;
        }
        await plugin.postBuild({
            ...props,
            head,
            routesBuildMetadata,
            content: plugin.content,
        });
    }));
}
async function executeBrokenLinksCheck({ props: { routes, siteConfig: { onBrokenLinks, onBrokenAnchors }, }, collectedData, }) {
    const collectedLinks = lodash_1.default.mapValues(collectedData, (d) => ({
        links: d.links,
        anchors: d.anchors,
    }));
    await (0, brokenLinks_1.handleBrokenLinks)({
        collectedLinks,
        routes,
        onBrokenLinks,
        onBrokenAnchors,
    });
}
async function getBuildClientConfig({ props, cliOptions, configureWebpackUtils, }) {
    const { plugins } = props;
    const result = await (0, client_1.createBuildClientConfig)({
        props,
        minify: cliOptions.minify ?? true,
        faster: props.siteConfig.future.experimental_faster,
        configureWebpackUtils,
        bundleAnalyzer: cliOptions.bundleAnalyzer ?? false,
    });
    let { config } = result;
    config = (0, configure_1.executePluginsConfigureWebpack)({
        plugins,
        config,
        isServer: false,
        configureWebpackUtils,
    });
    return { clientConfig: config, clientManifestPath: result.clientManifestPath };
}
async function getBuildServerConfig({ props, configureWebpackUtils, }) {
    const { plugins } = props;
    const result = await (0, server_1.default)({
        props,
        configureWebpackUtils,
    });
    let { config } = result;
    config = (0, configure_1.executePluginsConfigureWebpack)({
        plugins,
        config,
        isServer: true,
        configureWebpackUtils,
    });
    return { serverConfig: config, serverBundlePath: result.serverBundlePath };
}
// Remove /build/server server.bundle.js because it is not needed.
async function cleanupServerBundle(serverBundlePath) {
    if (process.env.DOCUSAURUS_KEEP_SERVER_BUNDLE === 'true') {
        logger_1.default.warn("Will NOT delete server bundle because DOCUSAURUS_KEEP_SERVER_BUNDLE='true'");
    }
    else {
        await logger_1.PerfLogger.async('Deleting server bundle', async () => {
            // For now we assume server entry is at the root of the server out dir
            const serverDir = path_1.default.dirname(serverBundlePath);
            await fs_extra_1.default.rm(serverDir, { recursive: true, force: true });
        });
    }
}
