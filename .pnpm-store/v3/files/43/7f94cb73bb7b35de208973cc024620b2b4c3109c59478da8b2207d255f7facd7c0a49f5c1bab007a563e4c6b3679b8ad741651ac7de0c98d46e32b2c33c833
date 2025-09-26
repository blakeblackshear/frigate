"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPluginsConfigs = initPluginsConfigs;
exports.initPlugins = initPlugins;
const tslib_1 = require("tslib");
const module_1 = require("module");
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
const utils_validation_1 = require("@docusaurus/utils-validation");
const siteMetadata_1 = require("../siteMetadata");
const pluginIds_1 = require("./pluginIds");
const configs_1 = require("./configs");
function getOptionValidationFunction(normalizedPluginConfig) {
    if (normalizedPluginConfig.pluginModule) {
        // Support both CommonJS and ES modules
        return (normalizedPluginConfig.pluginModule.module.default?.validateOptions ??
            normalizedPluginConfig.pluginModule.module.validateOptions);
    }
    return normalizedPluginConfig.plugin.validateOptions;
}
function getThemeValidationFunction(normalizedPluginConfig) {
    if (normalizedPluginConfig.pluginModule) {
        // Support both CommonJS and ES modules
        return (normalizedPluginConfig.pluginModule.module.default?.validateThemeConfig ??
            normalizedPluginConfig.pluginModule.module.validateThemeConfig);
    }
    return normalizedPluginConfig.plugin.validateThemeConfig;
}
// This filters self-disabling plugins and returns only the initialized ones
function onlyInitializedPlugins(initPluginsConfigsResults) {
    return initPluginsConfigsResults
        .map((results) => results.plugin)
        .filter((p) => p !== null);
}
/**
 * Runs the plugin constructors and returns their return values. It would load
 * plugin configs from `plugins`, `themes`, and `presets`.
 */
async function initPluginsConfigs(context, pluginConfigs) {
    // We need to resolve plugins from the perspective of the site config, as if
    // we are using `require.resolve` on those module names.
    const pluginRequire = (0, module_1.createRequire)(context.siteConfigPath);
    async function doLoadPluginVersion(normalizedPluginConfig) {
        if (normalizedPluginConfig.pluginModule?.path) {
            const pluginPath = pluginRequire.resolve(normalizedPluginConfig.pluginModule.path);
            return (0, siteMetadata_1.loadPluginVersion)(pluginPath, context.siteDir);
        }
        return { type: 'local' };
    }
    function doValidateThemeConfig(normalizedPluginConfig) {
        const validateThemeConfig = getThemeValidationFunction(normalizedPluginConfig);
        if (validateThemeConfig) {
            return validateThemeConfig({
                validate: utils_validation_1.normalizeThemeConfig,
                themeConfig: context.siteConfig.themeConfig,
            });
        }
        return context.siteConfig.themeConfig;
    }
    function doValidatePluginOptions(normalizedPluginConfig) {
        const validateOptions = getOptionValidationFunction(normalizedPluginConfig);
        if (validateOptions) {
            return validateOptions({
                validate: utils_validation_1.normalizePluginOptions,
                options: normalizedPluginConfig.options,
            });
        }
        // Important to ensure all plugins have an id
        // as we don't go through the Joi schema that adds it
        return {
            ...normalizedPluginConfig.options,
            id: normalizedPluginConfig.options.id ?? utils_1.DEFAULT_PLUGIN_ID,
        };
    }
    async function initializePlugin(normalizedPluginConfig) {
        const pluginVersion = await doLoadPluginVersion(normalizedPluginConfig);
        const pluginOptions = doValidatePluginOptions(normalizedPluginConfig);
        // Side-effect: merge the normalized theme config in the original one
        // Note: it's important to do this before calling the plugin constructor
        // Example: the theme classic plugin will read siteConfig.themeConfig
        context.siteConfig.themeConfig = {
            ...context.siteConfig.themeConfig,
            ...doValidateThemeConfig(normalizedPluginConfig),
        };
        const pluginInstance = await normalizedPluginConfig.plugin(context, pluginOptions);
        // Returning null has been explicitly allowed
        // It's a way for plugins to self-disable depending on context
        // See https://github.com/facebook/docusaurus/pull/10286
        if (pluginInstance === null) {
            return { config: normalizedPluginConfig, plugin: null };
        }
        if (pluginInstance === undefined) {
            throw new Error(`A Docusaurus plugin returned 'undefined', which is forbidden.
A plugin is expected to return an object having at least a 'name' property.
If you want a plugin to self-disable depending on context/options, you can explicitly return 'null' instead of 'undefined'`);
        }
        if (!pluginInstance?.name) {
            throw new Error(`A Docusaurus plugin is missing a 'name' property.
Note that even inline/anonymous plugin functions require a 'name' property.`);
        }
        const plugin = {
            ...pluginInstance,
            options: pluginOptions,
            version: pluginVersion,
            path: path_1.default.dirname(normalizedPluginConfig.entryPath),
        };
        return {
            config: normalizedPluginConfig,
            plugin,
        };
    }
    const plugins = (await Promise.all(pluginConfigs.map(initializePlugin))).filter((p) => p !== null);
    (0, pluginIds_1.ensureUniquePluginInstanceIds)(onlyInitializedPlugins(plugins));
    return plugins;
}
/**
 * Runs the plugin constructors and returns their return values
 * for all the site context plugins that do not return null to self-disable.
 */
async function initPlugins(context) {
    const pluginConfigs = await (0, configs_1.loadPluginConfigs)(context);
    const initPluginsConfigsResults = await initPluginsConfigs(context, pluginConfigs);
    return onlyInitializedPlugins(initPluginsConfigsResults);
}
