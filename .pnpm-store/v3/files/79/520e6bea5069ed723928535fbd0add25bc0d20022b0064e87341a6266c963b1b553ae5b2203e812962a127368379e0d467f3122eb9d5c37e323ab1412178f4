/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { FullVersion } from '../types';
import type { LoadContext } from '@docusaurus/types';
import type { LoadedVersion, PluginOptions, VersionBanner, VersionMetadata } from '@docusaurus/plugin-content-docs';
export type VersionContext = {
    /** The version name to get banner of. */
    versionName: string;
    /** All versions, ordered from newest to oldest. */
    versionNames: string[];
    lastVersionName: string;
    context: LoadContext;
    options: PluginOptions;
};
/**
 * The default version banner depends on the version's relative position to the
 * latest version. More recent ones are "unreleased", and older ones are
 * "unmaintained".
 */
export declare function getDefaultVersionBanner({ versionName, versionNames, lastVersionName, }: VersionContext): VersionBanner | null;
export declare function getVersionBanner(context: VersionContext): VersionMetadata['banner'];
export declare function getVersionBadge({ versionName, versionNames, options, }: VersionContext): VersionMetadata['badge'];
export declare function getVersionNoIndex({ versionName, options, }: VersionContext): VersionMetadata['noIndex'];
/**
 * Filter versions according to provided options (i.e. `onlyIncludeVersions`).
 *
 * Note: we preserve the order in which versions are provided; the order of the
 * `onlyIncludeVersions` array does not matter
 */
export declare function filterVersions(versionNamesUnfiltered: string[], options: PluginOptions): string[];
export declare function readVersionsMetadata({ context, options, }: {
    context: LoadContext;
    options: PluginOptions;
}): Promise<VersionMetadata[]>;
export declare function toFullVersion(version: LoadedVersion): FullVersion;
export declare function getVersionFromSourceFilePath(filePath: string, versionsMetadata: VersionMetadata[]): VersionMetadata;
