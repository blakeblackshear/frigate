"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlugins = loadPlugins;
exports.reloadPlugin = reloadPlugin;
const logger_1 = require("@docusaurus/logger");
const utils_1 = require("@docusaurus/utils");
const init_1 = require("./init");
const synthetic_1 = require("./synthetic");
const translations_1 = require("../translations/translations");
const routeConfig_1 = require("./routeConfig");
const actions_1 = require("./actions");
const pluginsUtils_1 = require("./pluginsUtils");
async function translatePluginContent({ plugin, content, context, }) {
    const rawTranslationFiles = (await plugin.getTranslationFiles?.({ content })) ?? [];
    const translationFiles = await Promise.all(rawTranslationFiles.map((translationFile) => (0, translations_1.localizePluginTranslationFile)({
        localizationDir: context.localizationDir,
        translationFile,
        plugin,
    })));
    const translatedContent = plugin.translateContent?.({ content, translationFiles }) ?? content;
    const translatedThemeConfigSlice = plugin.translateThemeConfig?.({
        themeConfig: context.siteConfig.themeConfig,
        translationFiles,
    });
    // TODO dangerous legacy, need to be refactored!
    // Side-effect to merge theme config translations. A plugin should only
    // translate its own slice of theme config and should make no assumptions
    // about other plugins' keys, so this is safe to run in parallel.
    Object.assign(context.siteConfig.themeConfig, translatedThemeConfigSlice);
    return translatedContent;
}
async function executePluginContentLoading({ plugin, context, }) {
    return logger_1.PerfLogger.async(`Load ${(0, pluginsUtils_1.formatPluginName)(plugin)}`, async () => {
        let content = await logger_1.PerfLogger.async('loadContent()', () => plugin.loadContent?.());
        const shouldTranslate = (0, utils_1.getLocaleConfig)(context.i18n).translate;
        if (shouldTranslate) {
            content = await logger_1.PerfLogger.async('translatePluginContent()', () => translatePluginContent({
                plugin,
                content,
                context,
            }));
        }
        // If shouldTranslate === false, we still need the code translations
        // Otherwise an unlocalized French site would show code strings in English
        const defaultCodeTranslations = (await logger_1.PerfLogger.async('getDefaultCodeTranslationMessages()', () => plugin.getDefaultCodeTranslationMessages?.())) ?? {};
        if (!plugin.contentLoaded) {
            return {
                ...plugin,
                content,
                defaultCodeTranslations,
                routes: [],
                globalData: undefined,
            };
        }
        const pluginActionsUtils = await (0, actions_1.createPluginActionsUtils)({
            plugin,
            generatedFilesDir: context.generatedFilesDir,
            baseUrl: context.siteConfig.baseUrl,
            trailingSlash: context.siteConfig.trailingSlash,
        });
        await logger_1.PerfLogger.async('contentLoaded()', () => 
        // @ts-expect-error: should autofix with TS 5.4
        plugin.contentLoaded({
            content,
            actions: pluginActionsUtils.getActions(),
        }));
        return {
            ...plugin,
            content,
            defaultCodeTranslations,
            routes: pluginActionsUtils.getRoutes(),
            globalData: pluginActionsUtils.getGlobalData(),
        };
    });
}
async function executeAllPluginsContentLoading({ plugins, context, }) {
    return logger_1.PerfLogger.async(`Load plugins content`, () => {
        return Promise.all(plugins.map((plugin) => executePluginContentLoading({ plugin, context })));
    });
}
async function executePluginAllContentLoaded({ plugin, context, allContent, }) {
    return logger_1.PerfLogger.async(`allContentLoaded() - ${(0, pluginsUtils_1.formatPluginName)(plugin)}`, async () => {
        if (!plugin.allContentLoaded) {
            return { routes: [], globalData: undefined };
        }
        const pluginActionsUtils = await (0, actions_1.createPluginActionsUtils)({
            plugin,
            generatedFilesDir: context.generatedFilesDir,
            baseUrl: context.siteConfig.baseUrl,
            trailingSlash: context.siteConfig.trailingSlash,
        });
        await plugin.allContentLoaded({
            allContent,
            actions: pluginActionsUtils.getActions(),
        });
        return {
            routes: pluginActionsUtils.getRoutes(),
            globalData: pluginActionsUtils.getGlobalData(),
        };
    });
}
async function executeAllPluginsAllContentLoaded({ plugins, context, }) {
    return logger_1.PerfLogger.async(`allContentLoaded()`, async () => {
        const allContent = (0, pluginsUtils_1.aggregateAllContent)(plugins);
        const allRoutes = [];
        const allGlobalData = {};
        await Promise.all(plugins.map(async (plugin) => {
            var _a;
            const { routes, globalData: pluginGlobalData } = await executePluginAllContentLoaded({
                plugin,
                context,
                allContent,
            });
            const pluginRoutes = routes.map((route) => (0, pluginsUtils_1.toPluginRoute)({ plugin, route }));
            allRoutes.push(...pluginRoutes);
            if (pluginGlobalData !== undefined) {
                allGlobalData[_a = plugin.name] ?? (allGlobalData[_a] = {});
                allGlobalData[plugin.name][plugin.options.id] = pluginGlobalData;
            }
        }));
        return { routes: allRoutes, globalData: allGlobalData };
    });
}
// This merges plugins routes and global data created from both lifecycles:
// - contentLoaded()
// - allContentLoaded()
function mergeResults({ baseUrl, plugins, allContentLoadedResult, }) {
    const routes = (0, routeConfig_1.sortRoutes)([...(0, pluginsUtils_1.aggregateRoutes)(plugins), ...allContentLoadedResult.routes], baseUrl);
    const globalData = (0, pluginsUtils_1.mergeGlobalData)((0, pluginsUtils_1.aggregateGlobalData)(plugins), allContentLoadedResult.globalData);
    return { routes, globalData };
}
/**
 * Initializes the plugins and run their lifecycle functions.
 */
async function loadPlugins(context) {
    return logger_1.PerfLogger.async('Load plugins', async () => {
        const initializedPlugins = await logger_1.PerfLogger.async('Init plugins', () => (0, init_1.initPlugins)(context));
        // TODO probably not the ideal place to hardcode those plugins
        initializedPlugins.push((0, synthetic_1.createBootstrapPlugin)(context), await (0, synthetic_1.createMDXFallbackPlugin)(context));
        const plugins = await executeAllPluginsContentLoading({
            plugins: initializedPlugins,
            context,
        });
        const allContentLoadedResult = await executeAllPluginsAllContentLoaded({
            plugins,
            context,
        });
        const { routes, globalData } = mergeResults({
            baseUrl: context.baseUrl,
            plugins,
            allContentLoadedResult,
        });
        return { plugins, routes, globalData };
    });
}
async function reloadPlugin({ pluginIdentifier, plugins: previousPlugins, context, }) {
    return logger_1.PerfLogger.async(`Reload plugin ${(0, pluginsUtils_1.formatPluginName)(pluginIdentifier)}`, async () => {
        const previousPlugin = (0, pluginsUtils_1.getPluginByIdentifier)({
            plugins: previousPlugins,
            pluginIdentifier,
        });
        const plugin = await executePluginContentLoading({
            plugin: previousPlugin,
            context,
        });
        /*
      // TODO Docusaurus v4 - upgrade to Node 20, use array.with()
      const plugins = previousPlugins.with(
        previousPlugins.indexOf(previousPlugin),
        plugin,
      );
       */
        const plugins = [...previousPlugins];
        plugins[previousPlugins.indexOf(previousPlugin)] = plugin;
        const allContentLoadedResult = await executeAllPluginsAllContentLoaded({
            plugins,
            context,
        });
        const { routes, globalData } = mergeResults({
            baseUrl: context.baseUrl,
            plugins,
            allContentLoadedResult,
        });
        return { plugins, routes, globalData };
    });
}
