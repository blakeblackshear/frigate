/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { RouteConfig, RouteChunkNames, PluginRouteConfig } from '@docusaurus/types';
type RoutesCode = {
    /** Serialized routes config that can be directly emitted into temp file. */
    routesConfig: string;
    /** @see {ChunkNames} */
    routesChunkNames: RouteChunkNames;
    /**
     * A map from chunk name to module paths. Module paths would have backslash
     * escaped already, so they can be directly printed.
     */
    registry: {
        [chunkName: string]: string;
    };
};
/**
 * Generates a unique chunk name that can be used in the chunk registry.
 *
 * @param modulePath A path to generate chunk name from. The actual value has no
 * semantic significance.
 * @param prefix A prefix to append to the chunk name, to avoid name clash.
 * @param preferredName Chunk names default to `modulePath`, and this can supply
 * a more human-readable name.
 * @param shortId When `true`, the chunk name would only be a hash without any
 * other characters. Useful for bundle size. Defaults to `true` in production.
 */
export declare function genChunkName(modulePath: string, prefix?: string, preferredName?: string, shortId?: boolean): string;
/**
 * Routes are prepared into three temp files:
 *
 * - `routesConfig`, the route config passed to react-router. This file is kept
 * minimal, because it can't be code-splitted.
 * - `routesChunkNames`, a mapping from route paths (hashed) to code-splitted
 * chunk names.
 * - `registry`, a mapping from chunk names to options for react-loadable.
 */
export declare function generateRoutesCode(routeConfigs: RouteConfig[]): RoutesCode;
type GenerateRouteFilesParams = {
    generatedFilesDir: string;
    routes: PluginRouteConfig[];
    baseUrl: string;
};
export declare function generateRoutePropFilename(route: RouteConfig): string;
export declare function generateRouteFiles({ generatedFilesDir, routes: initialRoutes, }: GenerateRouteFilesParams): Promise<void>;
export {};
