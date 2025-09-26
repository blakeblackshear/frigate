"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadContext = loadContext;
exports.loadSite = loadSite;
exports.reloadSite = reloadSite;
exports.reloadSitePlugin = reloadSitePlugin;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const logger_1 = require("@docusaurus/logger");
const combine_promises_1 = tslib_1.__importDefault(require("combine-promises"));
const bundler_1 = require("@docusaurus/bundler");
const config_1 = require("./config");
const clientModules_1 = require("./clientModules");
const plugins_1 = require("./plugins/plugins");
const htmlTags_1 = require("./htmlTags");
const siteMetadata_1 = require("./siteMetadata");
const i18n_1 = require("./i18n");
const translations_1 = require("./translations/translations");
const codegen_1 = require("./codegen/codegen");
const routes_1 = require("./routes");
const storage_1 = require("./storage");
const siteMessages_1 = require("./siteMessages");
/**
 * Loading context is the very first step in site building. Its params are
 * directly acquired from CLI options. It mainly loads `siteConfig` and the i18n
 * context (which includes code translations). The `LoadContext` will be passed
 * to plugin constructors.
 */
async function loadContext(params) {
    const { siteDir, outDir: baseOutDir = utils_1.DEFAULT_BUILD_DIR_NAME, locale, config: customConfigFilePath, automaticBaseUrlLocalizationDisabled, } = params;
    const generatedFilesDir = path_1.default.resolve(siteDir, utils_1.GENERATED_FILES_DIR_NAME);
    const { siteVersion, loadSiteConfig: { siteConfig: initialSiteConfig, siteConfigPath }, } = await (0, combine_promises_1.default)({
        siteVersion: (0, siteMetadata_1.loadSiteVersion)(siteDir),
        loadSiteConfig: (0, config_1.loadSiteConfig)({
            siteDir,
            customConfigFilePath,
        }),
    });
    const currentBundler = await (0, bundler_1.getCurrentBundler)({
        siteConfig: initialSiteConfig,
    });
    const i18n = await (0, i18n_1.loadI18n)({
        siteDir,
        config: initialSiteConfig,
        currentLocale: locale ?? initialSiteConfig.i18n.defaultLocale,
        automaticBaseUrlLocalizationDisabled: automaticBaseUrlLocalizationDisabled ?? false,
    });
    const localeConfig = (0, utils_1.getLocaleConfig)(i18n);
    // We use the baseUrl from the locale config.
    // By default, it is inferred as /<siteConfig.baseUrl>/
    // eventually including the /<locale>/ suffix
    const baseUrl = localeConfig.baseUrl;
    // TODO not ideal: we should allow configuring a custom outDir for each locale
    // The site baseUrl should be 100% decoupled from the file system output shape
    // We added this logic to restore v3 retro-compatibility, because by default
    // Docusaurus always wrote to ./build for sites having a baseUrl
    // See also https://github.com/facebook/docusaurus/issues/11433
    // This logic assumes the locale baseUrl will start with the site baseUrl
    // which is the case if an explicit locale baseUrl is not provided
    // but in practice a custom locale baseUrl could be anything now
    const outDirBaseUrl = baseUrl.replace(initialSiteConfig.baseUrl, '/');
    const outDir = path_1.default.join(path_1.default.resolve(siteDir, baseOutDir), outDirBaseUrl);
    const localizationDir = path_1.default.resolve(siteDir, i18n.path, (0, utils_1.getLocaleConfig)(i18n).path);
    const siteConfig = {
        ...initialSiteConfig,
        baseUrl,
    };
    const codeTranslations = await (0, translations_1.loadSiteCodeTranslations)({ localizationDir });
    const siteStorage = (0, storage_1.createSiteStorage)(siteConfig);
    return {
        siteDir,
        siteVersion,
        siteStorage,
        generatedFilesDir,
        localizationDir,
        siteConfig,
        siteConfigPath,
        outDir,
        baseUrl,
        i18n,
        codeTranslations,
        currentBundler,
    };
}
function createSiteProps(params) {
    const { plugins, routes, context } = params;
    const { generatedFilesDir, siteDir, siteVersion, siteConfig, siteConfigPath, siteStorage, outDir, baseUrl, i18n, localizationDir, codeTranslations: siteCodeTranslations, currentBundler, } = context;
    const { headTags, preBodyTags, postBodyTags } = (0, htmlTags_1.loadHtmlTags)({
        plugins,
        router: siteConfig.future.experimental_router,
    });
    const siteMetadata = (0, siteMetadata_1.createSiteMetadata)({ plugins, siteVersion });
    const codeTranslations = {
        ...(0, translations_1.getPluginsDefaultCodeTranslations)({ plugins }),
        ...siteCodeTranslations,
    };
    (0, routes_1.handleDuplicateRoutes)(routes, siteConfig.onDuplicateRoutes);
    const routesPaths = (0, routes_1.getRoutesPaths)(routes, baseUrl);
    return {
        siteConfig,
        siteConfigPath,
        siteMetadata,
        siteVersion,
        siteStorage,
        siteDir,
        outDir,
        baseUrl,
        i18n,
        localizationDir,
        generatedFilesDir,
        routes,
        routesPaths,
        plugins,
        headTags,
        preBodyTags,
        postBodyTags,
        codeTranslations,
        currentBundler,
    };
}
// TODO global data should be part of site props?
async function createSiteFiles({ site, globalData, }) {
    return logger_1.PerfLogger.async('Create site files', async () => {
        const { props: { plugins, generatedFilesDir, siteConfig, siteMetadata, siteStorage, i18n, codeTranslations, routes, baseUrl, }, } = site;
        const clientModules = (0, clientModules_1.getAllClientModules)(plugins);
        await (0, codegen_1.generateSiteFiles)({
            generatedFilesDir,
            clientModules,
            siteConfig,
            siteMetadata,
            siteStorage,
            i18n,
            codeTranslations,
            globalData,
            routes,
            baseUrl,
        });
    });
}
/**
 * This is the crux of the Docusaurus server-side. It reads everything it needs—
 * code translations, config file, plugin modules... Plugins then use their
 * lifecycles to generate content and other data. It is side-effect-ful because
 * it generates temp files in the `.docusaurus` folder for the bundler.
 */
async function loadSite(params) {
    const context = await logger_1.PerfLogger.async('Load context', () => loadContext(params));
    const { plugins, routes, globalData } = await (0, plugins_1.loadPlugins)(context);
    const props = createSiteProps({ plugins, routes, globalData, context });
    const site = { props, params };
    await createSiteFiles({
        site,
        globalData,
    });
    // For now, we don't re-emit messages on site reloads, it's too verbose
    if (!params.isReload) {
        await (0, siteMessages_1.emitSiteMessages)({ site });
    }
    return site;
}
async function reloadSite(site) {
    // TODO this can be optimized, for example:
    //  - plugins loading same data as before should not recreate routes/bundles
    //  - codegen does not need to re-run if nothing changed
    return loadSite({
        ...site.params,
        isReload: true,
    });
}
async function reloadSitePlugin(site, pluginIdentifier) {
    const { plugins, routes, globalData } = await (0, plugins_1.reloadPlugin)({
        pluginIdentifier,
        plugins: site.props.plugins,
        context: site.props,
    });
    const newProps = createSiteProps({
        plugins,
        routes,
        globalData,
        context: site.props, // Props extends Context
    });
    const newSite = {
        props: newProps,
        params: site.params,
    };
    // TODO optimize, bypass useless codegen if new site is similar to old site
    await createSiteFiles({ site: newSite, globalData });
    return newSite;
}
