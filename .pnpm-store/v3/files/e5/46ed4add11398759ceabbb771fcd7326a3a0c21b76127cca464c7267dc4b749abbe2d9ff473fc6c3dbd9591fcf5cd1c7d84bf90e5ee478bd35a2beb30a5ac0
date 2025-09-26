"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPluginConfigs = loadPluginConfigs;
const module_1 = require("module");
const utils_1 = require("@docusaurus/utils");
const presets_1 = require("./presets");
const moduleShorthand_1 = require("./moduleShorthand");
async function normalizePluginConfig(pluginConfig, configPath, pluginRequire) {
    // plugins: ["./plugin"]
    if (typeof pluginConfig === 'string') {
        const pluginModuleImport = pluginConfig;
        const pluginPath = pluginRequire.resolve(pluginModuleImport);
        const pluginModule = (await (0, utils_1.loadFreshModule)(pluginPath));
        return {
            plugin: pluginModule.default ?? pluginModule,
            options: {},
            pluginModule: {
                path: pluginModuleImport,
                module: pluginModule,
            },
            entryPath: pluginPath,
        };
    }
    // plugins: [() => {...}]
    if (typeof pluginConfig === 'function') {
        return {
            plugin: pluginConfig,
            options: {},
            entryPath: configPath,
        };
    }
    // plugins: [
    //   ["./plugin",options],
    // ]
    if (typeof pluginConfig[0] === 'string') {
        const pluginModuleImport = pluginConfig[0];
        const pluginPath = pluginRequire.resolve(pluginModuleImport);
        const pluginModule = (await (0, utils_1.loadFreshModule)(pluginPath));
        return {
            plugin: pluginModule.default ?? pluginModule,
            options: pluginConfig[1],
            pluginModule: {
                path: pluginModuleImport,
                module: pluginModule,
            },
            entryPath: pluginPath,
        };
    }
    // plugins: [
    //   [() => {...}, options],
    // ]
    return {
        plugin: pluginConfig[0],
        options: pluginConfig[1],
        entryPath: configPath,
    };
}
/**
 * Reads the site config's `presets`, `themes`, and `plugins`, imports them, and
 * normalizes the return value. Plugin configs are ordered, mostly for theme
 * alias shadowing. Site themes have the highest priority, and preset plugins
 * are the lowest.
 */
async function loadPluginConfigs(context) {
    const preset = await (0, presets_1.loadPresets)(context);
    const { siteConfig, siteConfigPath } = context;
    const pluginRequire = (0, module_1.createRequire)(siteConfigPath);
    function normalizeShorthand(pluginConfig, pluginType) {
        if (typeof pluginConfig === 'string') {
            return (0, moduleShorthand_1.resolveModuleName)(pluginConfig, pluginRequire, pluginType);
        }
        else if (Array.isArray(pluginConfig) &&
            typeof pluginConfig[0] === 'string') {
            return [
                (0, moduleShorthand_1.resolveModuleName)(pluginConfig[0], pluginRequire, pluginType),
                pluginConfig[1] ?? {},
            ];
        }
        return pluginConfig;
    }
    preset.plugins = preset.plugins.map((plugin) => normalizeShorthand(plugin, 'plugin'));
    preset.themes = preset.themes.map((theme) => normalizeShorthand(theme, 'theme'));
    const standalonePlugins = siteConfig.plugins.map((plugin) => normalizeShorthand(plugin, 'plugin'));
    const standaloneThemes = siteConfig.themes.map((theme) => normalizeShorthand(theme, 'theme'));
    const pluginConfigs = [
        ...preset.plugins,
        ...preset.themes,
        // Site config should be the highest priority.
        ...standalonePlugins,
        ...standaloneThemes,
    ].filter((x) => Boolean(x));
    return Promise.all(pluginConfigs.map((pluginConfig) => normalizePluginConfig(pluginConfig, context.siteConfigPath, pluginRequire)));
}
