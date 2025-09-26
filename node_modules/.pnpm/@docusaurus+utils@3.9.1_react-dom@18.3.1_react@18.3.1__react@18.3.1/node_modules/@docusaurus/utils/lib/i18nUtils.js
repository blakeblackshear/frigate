"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeTranslations = mergeTranslations;
exports.updateTranslationFileMessages = updateTranslationFileMessages;
exports.getPluginI18nPath = getPluginI18nPath;
exports.getLocaleConfig = getLocaleConfig;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const constants_1 = require("./constants");
/**
 * Takes a list of translation file contents, and shallow-merges them into one.
 */
function mergeTranslations(contents) {
    return contents.reduce((acc, content) => ({ ...acc, ...content }), {});
}
/**
 * Useful to update all the messages of a translation file. Used in tests to
 * simulate translations.
 */
function updateTranslationFileMessages(translationFile, updateMessage) {
    return {
        ...translationFile,
        content: lodash_1.default.mapValues(translationFile.content, (translation) => ({
            ...translation,
            message: updateMessage(translation.message),
        })),
    };
}
/**
 * Takes everything needed and constructs a plugin i18n path. Plugins should
 * expect everything it needs for translations to be found under this path.
 */
function getPluginI18nPath({ localizationDir, pluginName, pluginId = constants_1.DEFAULT_PLUGIN_ID, subPaths = [], }) {
    return path_1.default.join(localizationDir, 
    // Make it convenient to use for single-instance
    // ie: return "docs", not "docs-default" nor "docs/default"
    `${pluginName}${pluginId === constants_1.DEFAULT_PLUGIN_ID ? '' : `-${pluginId}`}`, ...subPaths);
}
// TODO we may extract this to a separate package
//  we want to use it on the frontend too
//  but "docusaurus-utils-common" (agnostic utils) is not an ideal place since
function getLocaleConfig(i18n, locale) {
    const localeToLookFor = locale ?? i18n.currentLocale;
    const localeConfig = i18n.localeConfigs[localeToLookFor];
    if (!localeConfig) {
        throw new Error(`Can't find locale config for locale ${logger_1.default.code(localeToLookFor)}`);
    }
    return localeConfig;
}
//# sourceMappingURL=i18nUtils.js.map