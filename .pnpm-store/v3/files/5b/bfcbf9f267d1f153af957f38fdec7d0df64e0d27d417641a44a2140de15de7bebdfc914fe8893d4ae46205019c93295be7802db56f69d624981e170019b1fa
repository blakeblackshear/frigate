/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadedPlugin, PluginVersionInformation, SiteMetadata } from '@docusaurus/types';
export declare function loadSiteVersion(siteDir: string): Promise<string | undefined>;
export declare function loadPluginVersion(pluginPath: string, siteDir: string): Promise<PluginVersionInformation>;
export declare function createSiteMetadata({ siteVersion, plugins, }: {
    siteVersion: string | undefined;
    plugins: LoadedPlugin[];
}): SiteMetadata;
