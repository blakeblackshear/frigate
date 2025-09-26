"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionDocsDirPath = getVersionDocsDirPath;
exports.getVersionSidebarsPath = getVersionSidebarsPath;
exports.getDocsDirPathLocalized = getDocsDirPathLocalized;
exports.getPluginDirPathLocalized = getPluginDirPathLocalized;
exports.getVersionsFilePath = getVersionsFilePath;
exports.readVersionsFile = readVersionsFile;
exports.readVersionNames = readVersionNames;
exports.getVersionMetadataPaths = getVersionMetadataPaths;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const utils_1 = require("@docusaurus/utils");
const constants_1 = require("../constants");
const validation_1 = require("./validation");
/** Add a prefix like `community_version-1.0.0`. No-op for default instance. */
function addPluginIdPrefix(fileOrDir, pluginId) {
    return pluginId === utils_1.DEFAULT_PLUGIN_ID
        ? fileOrDir
        : `${pluginId}_${fileOrDir}`;
}
/** `[siteDir]/community_versioned_docs/version-1.0.0` */
function getVersionDocsDirPath(siteDir, pluginId, versionName) {
    return path_1.default.join(siteDir, addPluginIdPrefix(constants_1.VERSIONED_DOCS_DIR, pluginId), `version-${versionName}`);
}
/** `[siteDir]/community_versioned_sidebars/version-1.0.0-sidebars.json` */
function getVersionSidebarsPath(siteDir, pluginId, versionName) {
    return path_1.default.join(siteDir, addPluginIdPrefix(constants_1.VERSIONED_SIDEBARS_DIR, pluginId), `version-${versionName}-sidebars.json`);
}
function getDocsDirPathLocalized({ localizationDir, pluginId, versionName, }) {
    return (0, utils_1.getPluginI18nPath)({
        localizationDir,
        pluginName: 'docusaurus-plugin-content-docs',
        pluginId,
        subPaths: [
            versionName === constants_1.CURRENT_VERSION_NAME
                ? constants_1.CURRENT_VERSION_NAME
                : `version-${versionName}`,
        ],
    });
}
function getPluginDirPathLocalized({ localizationDir, pluginId, }) {
    return (0, utils_1.getPluginI18nPath)({
        localizationDir,
        pluginName: 'docusaurus-plugin-content-docs',
        pluginId,
        subPaths: [],
    });
}
/** `community` => `[siteDir]/community_versions.json` */
function getVersionsFilePath(siteDir, pluginId) {
    return path_1.default.join(siteDir, addPluginIdPrefix(constants_1.VERSIONS_JSON_FILE, pluginId));
}
/**
 * Reads the plugin's respective `versions.json` file, and returns its content.
 *
 * @throws Throws if validation fails, i.e. `versions.json` doesn't contain an
 * array of valid version names.
 */
async function readVersionsFile(siteDir, pluginId) {
    const versionsFilePath = getVersionsFilePath(siteDir, pluginId);
    if (await fs_extra_1.default.pathExists(versionsFilePath)) {
        const content = await fs_extra_1.default.readJSON(versionsFilePath);
        (0, validation_1.validateVersionNames)(content);
        return content;
    }
    return null;
}
/**
 * Reads the `versions.json` file, and returns an ordered list of version names.
 *
 * - If `disableVersioning` is turned on, it will return `["current"]` (requires
 * `includeCurrentVersion` to be true);
 * - If `includeCurrentVersion` is turned on, "current" will be inserted at the
 * beginning, if not already there.
 *
 * You need to use {@link filterVersions} after this.
 *
 * @throws Throws an error if `disableVersioning: true` but `versions.json`
 * doesn't exist (i.e. site is not versioned)
 * @throws Throws an error if versions list is empty (empty `versions.json` or
 * `disableVersioning` is true, and not including current version)
 */
async function readVersionNames(siteDir, options) {
    const versionFileContent = await readVersionsFile(siteDir, options.id);
    if (!versionFileContent && options.disableVersioning) {
        throw new Error(`Docs: using "disableVersioning: true" option on a non-versioned site does not make sense.`);
    }
    const versions = options.disableVersioning ? [] : versionFileContent ?? [];
    // We add the current version at the beginning, unless:
    // - user don't want to; or
    // - it's already been explicitly added to versions.json
    if (options.includeCurrentVersion &&
        !versions.includes(constants_1.CURRENT_VERSION_NAME)) {
        versions.unshift(constants_1.CURRENT_VERSION_NAME);
    }
    if (versions.length === 0) {
        throw new Error(`It is not possible to use docs without any version. No version is included because you have requested to not include ${path_1.default.resolve(options.path)} through "includeCurrentVersion: false", while ${options.disableVersioning
            ? 'versioning is disabled with "disableVersioning: true"'
            : `the versions file is empty/non-existent`}.`);
    }
    return versions;
}
/**
 * Gets the path-related version metadata.
 *
 * @throws Throws if the resolved docs folder or sidebars file doesn't exist.
 * Does not throw if a versioned sidebar is missing (since we don't create empty
 * files).
 */
async function getVersionMetadataPaths({ versionName, context, options, }) {
    const isCurrent = versionName === constants_1.CURRENT_VERSION_NAME;
    const shouldTranslate = (0, utils_1.getLocaleConfig)(context.i18n).translate;
    const contentPathLocalized = shouldTranslate
        ? getDocsDirPathLocalized({
            localizationDir: context.localizationDir,
            pluginId: options.id,
            versionName,
        })
        : undefined;
    const contentPath = isCurrent
        ? path_1.default.resolve(context.siteDir, options.path)
        : getVersionDocsDirPath(context.siteDir, options.id, versionName);
    const sidebarFilePath = isCurrent
        ? options.sidebarPath
        : getVersionSidebarsPath(context.siteDir, options.id, versionName);
    if (!(await fs_extra_1.default.pathExists(contentPath))) {
        throw new Error(`The docs folder does not exist for version "${versionName}". A docs folder is expected to be found at ${path_1.default.relative(context.siteDir, contentPath)}.`);
    }
    // If the current version defines a path to a sidebar file that does not
    // exist, we throw! Note: for versioned sidebars, the file may not exist (as
    // we prefer to not create it rather than to create an empty file)
    // See https://github.com/facebook/docusaurus/issues/3366
    // See https://github.com/facebook/docusaurus/pull/4775
    if (versionName === constants_1.CURRENT_VERSION_NAME &&
        typeof sidebarFilePath === 'string' &&
        !(await fs_extra_1.default.pathExists(sidebarFilePath))) {
        throw new Error(`The path to the sidebar file does not exist at "${path_1.default.relative(context.siteDir, sidebarFilePath)}".
Please set the docs "sidebarPath" field in your config file to:
- a sidebars path that exists
- false: to disable the sidebar
- undefined: for Docusaurus to generate it automatically`);
    }
    return { contentPath, contentPathLocalized, sidebarFilePath };
}
