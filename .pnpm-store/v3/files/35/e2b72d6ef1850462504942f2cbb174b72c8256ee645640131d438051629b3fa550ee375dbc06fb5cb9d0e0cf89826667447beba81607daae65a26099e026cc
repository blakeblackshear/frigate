/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { InitializedPlugin, PluginContentLoadedActions, RouteConfig } from '@docusaurus/types';
type PluginActionUtils = {
    getRoutes: () => RouteConfig[];
    getGlobalData: () => unknown;
    getActions: () => PluginContentLoadedActions;
};
export declare function createPluginActionsUtils({ plugin, generatedFilesDir, baseUrl, trailingSlash, }: {
    plugin: InitializedPlugin;
    generatedFilesDir: string;
    baseUrl: string;
    trailingSlash: boolean | undefined;
}): Promise<PluginActionUtils>;
export {};
