"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pluginToThemeName = pluginToThemeName;
exports.getPluginByThemeName = getPluginByThemeName;
exports.getThemeNames = getThemeNames;
exports.getThemeName = getThemeName;
exports.getThemePath = getThemePath;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const leven_1 = tslib_1.__importDefault(require("leven"));
const prompts_1 = require("./prompts");
const common_1 = require("./common");
function pluginToThemeName(plugin) {
    if (plugin.instance.getThemePath) {
        return (plugin.instance.version.name ?? plugin.instance.name);
    }
    return undefined;
}
function getPluginByThemeName(plugins, themeName) {
    const plugin = plugins.find((p) => pluginToThemeName(p) === themeName);
    if (!plugin) {
        throw new Error(`Theme ${themeName} not found`);
    }
    return plugin;
}
function getThemeNames(plugins) {
    const themeNames = lodash_1.default.uniq(
    // The fact that getThemePath is attached to the plugin instance makes
    // this code impossible to optimize. If this is a static method, we don't
    // need to initialize all plugins just to filter which are themes
    // Benchmark: loadContext-58ms; initPlugins-323ms
    plugins.map((plugin) => pluginToThemeName(plugin)).filter(Boolean));
    // Opinionated ordering: user is most likely to swizzle:
    // - the classic theme
    // - official themes
    // - official plugins
    return lodash_1.default.orderBy(themeNames, [
        (t) => t === '@docusaurus/theme-classic',
        (t) => t.includes('@docusaurus/theme'),
        (t) => t.includes('@docusaurus'),
    ], ['desc', 'desc', 'desc']);
}
// Returns a valid value if recovering is possible
function handleInvalidThemeName({ themeNameParam, themeNames, }) {
    // Trying to recover invalid value
    // We look for potential matches that only differ in casing.
    const differentCaseMatch = (0, common_1.findStringIgnoringCase)(themeNameParam, themeNames);
    if (differentCaseMatch) {
        logger_1.default.warn `Theme name=${themeNameParam} doesn't exist.`;
        logger_1.default.info `name=${differentCaseMatch} will be used instead of name=${themeNameParam}.`;
        return differentCaseMatch;
    }
    // TODO recover from short theme-names here: "classic" => "@docusaurus/theme-classic"
    // No recovery value is possible: print error
    const suggestion = themeNames.find((name) => (0, leven_1.default)(name, themeNameParam) < 4);
    logger_1.default.error `Theme name=${themeNameParam} not found. ${suggestion
        ? logger_1.default.interpolate `Did you mean name=${suggestion}?`
        : logger_1.default.interpolate `Themes available for swizzle: ${themeNames}`}`;
    return process.exit(1);
}
function validateThemeName({ themeNameParam, themeNames, }) {
    const isValidName = themeNames.includes(themeNameParam);
    if (!isValidName) {
        return handleInvalidThemeName({
            themeNameParam,
            themeNames,
        });
    }
    return themeNameParam;
}
async function getThemeName({ themeNameParam, themeNames, list, }) {
    if (list && !themeNameParam) {
        logger_1.default.info `Themes available for swizzle: name=${themeNames}`;
        return process.exit(0);
    }
    return themeNameParam
        ? validateThemeName({ themeNameParam, themeNames })
        : (0, prompts_1.askThemeName)(themeNames);
}
function getThemePath({ plugins, themeName, typescript, }) {
    const pluginInstance = getPluginByThemeName(plugins, themeName);
    const themePath = typescript
        ? pluginInstance.instance.getTypeScriptThemePath &&
            path_1.default.resolve(pluginInstance.instance.path, pluginInstance.instance.getTypeScriptThemePath())
        : pluginInstance.instance.getThemePath &&
            path_1.default.resolve(pluginInstance.instance.path, pluginInstance.instance.getThemePath());
    if (!themePath) {
        logger_1.default.warn(typescript
            ? logger_1.default.interpolate `name=${themeName} does not provide TypeScript theme code via ${'getTypeScriptThemePath()'}.`
            : // This is... technically possible to happen, e.g. returning undefined
                // from getThemePath. Plugins may intentionally or unintentionally
                // disguise as themes?
                logger_1.default.interpolate `name=${themeName} does not provide any theme code.`);
        return process.exit(1);
    }
    return themePath;
}
