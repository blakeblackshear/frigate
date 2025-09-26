"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSiteSourceCodeTranslations = extractSiteSourceCodeTranslations;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const babel_1 = require("@docusaurus/babel");
function getSiteSourceCodeFilePaths(siteDir) {
    return [path_1.default.join(siteDir, utils_1.SRC_DIR_NAME)];
}
function getPluginSourceCodeFilePaths(plugin) {
    // The getPathsToWatch() generally returns the js/jsx/ts/tsx/md/mdx file paths
    // We can use this method as well to know which folders we should try to
    // extract translations from. Hacky/implicit, but do we want to introduce a
    // new lifecycle method just for that???
    const codePaths = plugin.getPathsToWatch?.() ?? [];
    // We also include theme code
    const themePath = plugin.getThemePath?.();
    if (themePath) {
        codePaths.push(themePath);
    }
    return codePaths.map((p) => path_1.default.resolve(plugin.path, p));
}
async function getSourceCodeFilePaths(siteDir, plugins) {
    const sitePaths = getSiteSourceCodeFilePaths(siteDir);
    // The getPathsToWatch() generally returns the js/jsx/ts/tsx/md/mdx file paths
    // We can use this method as well to know which folders we should try to
    // extract translations from. Hacky/implicit, but do we want to introduce a
    // new lifecycle method for that???
    const pluginsPaths = plugins.flatMap(getPluginSourceCodeFilePaths);
    const allPaths = [...sitePaths, ...pluginsPaths];
    return (0, utils_1.globTranslatableSourceFiles)(allPaths);
}
async function extractSiteSourceCodeTranslations({ siteDir, plugins, extraSourceCodeFilePaths = [], }) {
    const babelOptions = (0, babel_1.getBabelOptions)({
        isServer: true,
        babelOptions: await (0, babel_1.getCustomBabelConfigFilePath)(siteDir),
    });
    // Should we warn here if the same translation "key" is found in multiple
    // source code files?
    function toTranslationFileContent(sourceCodeFileTranslations) {
        return sourceCodeFileTranslations.reduce((acc, item) => ({ ...acc, ...item.translations }), {});
    }
    const sourceCodeFilePaths = await getSourceCodeFilePaths(siteDir, plugins);
    const allSourceCodeFilePaths = [
        ...sourceCodeFilePaths,
        ...extraSourceCodeFilePaths,
    ];
    const sourceCodeFilesTranslations = await (0, babel_1.extractAllSourceCodeFileTranslations)(allSourceCodeFilePaths, babelOptions);
    logSourceCodeFileTranslationsWarnings(sourceCodeFilesTranslations);
    return toTranslationFileContent(sourceCodeFilesTranslations);
}
function logSourceCodeFileTranslationsWarnings(sourceCodeFilesTranslations) {
    sourceCodeFilesTranslations.forEach(({ sourceCodeFilePath, warnings }) => {
        if (warnings.length > 0) {
            logger_1.default.warn `Translation extraction warnings for file path=${sourceCodeFilePath}: ${warnings}`;
        }
    });
}
