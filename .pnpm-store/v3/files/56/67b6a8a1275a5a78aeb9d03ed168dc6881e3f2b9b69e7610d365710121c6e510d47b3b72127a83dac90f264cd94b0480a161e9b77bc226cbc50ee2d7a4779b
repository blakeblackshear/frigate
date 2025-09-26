/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { AllContent, GlobalData, InitializedPlugin, LoadedPlugin, PluginIdentifier, PluginRouteConfig, RouteConfig } from '@docusaurus/types';
export declare function getPluginByIdentifier<P extends InitializedPlugin>({ plugins, pluginIdentifier, }: {
    pluginIdentifier: PluginIdentifier;
    plugins: P[];
}): P;
export declare function aggregateAllContent(loadedPlugins: LoadedPlugin[]): AllContent;
export declare function toPluginRoute({ plugin, route, }: {
    plugin: LoadedPlugin;
    route: RouteConfig;
}): PluginRouteConfig;
export declare function aggregateRoutes(loadedPlugins: LoadedPlugin[]): PluginRouteConfig[];
export declare function aggregateGlobalData(loadedPlugins: LoadedPlugin[]): GlobalData;
export declare function mergeGlobalData(...globalDataList: GlobalData[]): GlobalData;
export declare function formatPluginName(plugin: InitializedPlugin | PluginIdentifier): string;
