/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { LoadContext, GlobalData, PluginIdentifier, LoadedPlugin, PluginRouteConfig } from '@docusaurus/types';
export type LoadPluginsResult = {
    plugins: LoadedPlugin[];
    routes: PluginRouteConfig[];
    globalData: GlobalData;
};
/**
 * Initializes the plugins and run their lifecycle functions.
 */
export declare function loadPlugins(context: LoadContext): Promise<LoadPluginsResult>;
export declare function reloadPlugin({ pluginIdentifier, plugins: previousPlugins, context, }: {
    pluginIdentifier: PluginIdentifier;
    plugins: LoadedPlugin[];
    context: LoadContext;
}): Promise<LoadPluginsResult>;
