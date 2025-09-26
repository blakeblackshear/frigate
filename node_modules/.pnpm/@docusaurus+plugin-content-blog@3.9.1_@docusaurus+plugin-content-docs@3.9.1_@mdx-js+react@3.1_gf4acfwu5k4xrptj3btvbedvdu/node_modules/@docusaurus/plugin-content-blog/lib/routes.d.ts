/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { PluginContentLoadedActions, RouteConfig } from '@docusaurus/types';
import type { BlogContent, PluginOptions } from '@docusaurus/plugin-content-blog';
type CreateAllRoutesParam = {
    baseUrl: string;
    content: BlogContent;
    options: PluginOptions;
    actions: PluginContentLoadedActions;
    aliasedSource: (str: string) => string;
};
export declare function createAllRoutes(param: CreateAllRoutesParam): Promise<void>;
export declare function buildAllRoutes({ baseUrl, content, actions, options, aliasedSource, }: CreateAllRoutesParam): Promise<RouteConfig[]>;
export {};
