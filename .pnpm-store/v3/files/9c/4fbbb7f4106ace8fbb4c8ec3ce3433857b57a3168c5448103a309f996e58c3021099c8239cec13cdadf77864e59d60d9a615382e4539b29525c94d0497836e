/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { PluginContentLoadedActions, RouteConfig } from '@docusaurus/types';
import type { FullVersion } from './types';
import type { PluginOptions } from '@docusaurus/plugin-content-docs';
type BuildAllRoutesParam = Omit<CreateAllRoutesParam, 'actions'> & {
    actions: Omit<PluginContentLoadedActions, 'addRoute' | 'setGlobalData'>;
};
export declare function buildAllRoutes(param: BuildAllRoutesParam): Promise<RouteConfig[]>;
type CreateAllRoutesParam = {
    baseUrl: string;
    versions: FullVersion[];
    options: PluginOptions;
    actions: PluginContentLoadedActions;
    aliasedSource: (str: string) => string;
};
export declare function createAllRoutes(param: CreateAllRoutesParam): Promise<void>;
export {};
