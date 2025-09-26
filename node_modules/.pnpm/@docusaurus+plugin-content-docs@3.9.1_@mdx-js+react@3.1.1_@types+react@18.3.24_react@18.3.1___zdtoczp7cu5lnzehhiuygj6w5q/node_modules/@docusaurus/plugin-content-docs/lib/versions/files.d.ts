/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { PluginOptions, VersionMetadata } from '@docusaurus/plugin-content-docs';
import type { VersionContext } from './version';
/** `[siteDir]/community_versioned_docs/version-1.0.0` */
export declare function getVersionDocsDirPath(siteDir: string, pluginId: string, versionName: string): string;
/** `[siteDir]/community_versioned_sidebars/version-1.0.0-sidebars.json` */
export declare function getVersionSidebarsPath(siteDir: string, pluginId: string, versionName: string): string;
export declare function getDocsDirPathLocalized({ localizationDir, pluginId, versionName, }: {
    localizationDir: string;
    pluginId: string;
    versionName: string;
}): string;
export declare function getPluginDirPathLocalized({ localizationDir, pluginId, }: {
    localizationDir: string;
    pluginId: string;
}): string;
/** `community` => `[siteDir]/community_versions.json` */
export declare function getVersionsFilePath(siteDir: string, pluginId: string): string;
/**
 * Reads the plugin's respective `versions.json` file, and returns its content.
 *
 * @throws Throws if validation fails, i.e. `versions.json` doesn't contain an
 * array of valid version names.
 */
export declare function readVersionsFile(siteDir: string, pluginId: string): Promise<string[] | null>;
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
export declare function readVersionNames(siteDir: string, options: PluginOptions): Promise<string[]>;
/**
 * Gets the path-related version metadata.
 *
 * @throws Throws if the resolved docs folder or sidebars file doesn't exist.
 * Does not throw if a versioned sidebar is missing (since we don't create empty
 * files).
 */
export declare function getVersionMetadataPaths({ versionName, context, options, }: VersionContext): Promise<Pick<VersionMetadata, 'contentPath' | 'contentPathLocalized' | 'sidebarFilePath'>>;
