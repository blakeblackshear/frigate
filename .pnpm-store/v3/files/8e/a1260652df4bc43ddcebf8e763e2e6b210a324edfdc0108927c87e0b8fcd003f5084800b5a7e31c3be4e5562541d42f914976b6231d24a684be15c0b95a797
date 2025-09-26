"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSiteVersion = loadSiteVersion;
exports.loadPluginVersion = loadPluginVersion;
exports.createSiteMetadata = createSiteMetadata;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const utils_1 = require("@docusaurus/utils");
async function loadPackageJsonVersion(packageJsonPath) {
    if (await fs_extra_1.default.pathExists(packageJsonPath)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-dynamic-require, global-require
        return require(packageJsonPath).version;
    }
    return undefined;
}
async function loadPackageJsonName(packageJsonPath) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-dynamic-require, global-require
    return require(packageJsonPath).name;
}
async function loadSiteVersion(siteDir) {
    return loadPackageJsonVersion(path_1.default.join(siteDir, 'package.json'));
}
async function loadPluginVersion(pluginPath, siteDir) {
    let potentialPluginPackageJsonDirectory = path_1.default.dirname(pluginPath);
    while (potentialPluginPackageJsonDirectory !== '/') {
        const packageJsonPath = path_1.default.join(potentialPluginPackageJsonDirectory, 'package.json');
        if ((await fs_extra_1.default.pathExists(packageJsonPath)) &&
            (await fs_extra_1.default.lstat(packageJsonPath)).isFile()) {
            if (potentialPluginPackageJsonDirectory === siteDir) {
                // If the plugin belongs to the same docusaurus project, we classify it
                // as local plugin.
                return { type: 'project' };
            }
            return {
                type: 'package',
                name: await loadPackageJsonName(packageJsonPath),
                version: await loadPackageJsonVersion(packageJsonPath),
            };
        }
        potentialPluginPackageJsonDirectory = path_1.default.dirname(potentialPluginPackageJsonDirectory);
    }
    // In the case where a plugin is a path where no parent directory contains
    // package.json, we can only classify it as local. Could happen if one puts a
    // script in the parent directory of the site.
    return { type: 'local' };
}
/**
 * We want all `@docusaurus/*` packages to have the exact same version!
 * @see https://github.com/facebook/docusaurus/issues/3371
 * @see https://github.com/facebook/docusaurus/pull/3386
 */
function checkDocusaurusPackagesVersion(siteMetadata) {
    const { docusaurusVersion } = siteMetadata;
    Object.entries(siteMetadata.pluginVersions).forEach(([plugin, versionInfo]) => {
        if (versionInfo.type === 'package' &&
            versionInfo.name?.startsWith('@docusaurus/') &&
            versionInfo.version &&
            versionInfo.version !== docusaurusVersion) {
            throw new Error(`Invalid name=${plugin} version number=${versionInfo.version}.
All official @docusaurus/* packages should have the exact same version as @docusaurus/core (number=${docusaurusVersion}).
Maybe you want to check, or regenerate your yarn.lock or package-lock.json file?`);
        }
    });
}
function createSiteMetadata({ siteVersion, plugins, }) {
    const siteMetadata = {
        docusaurusVersion: utils_1.DOCUSAURUS_VERSION,
        siteVersion,
        pluginVersions: Object.fromEntries(plugins
            .filter(({ version: { type } }) => type !== 'synthetic')
            .map(({ name, version }) => [name, version])),
    };
    checkDocusaurusPackagesVersion(siteMetadata);
    return siteMetadata;
}
