/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { RouteConfig } from 'react-router-config';
/**
 * Compare the 2 paths, case insensitive and ignoring trailing slash
 */
export declare function isSamePath(path1: string | undefined, path2: string | undefined): boolean;
/**
 * Note that sites don't always have a homepage in practice, so we can't assume
 * that linking to '/' is always safe.
 * @see https://github.com/facebook/docusaurus/pull/6517#issuecomment-1048709116
 */
export declare function findHomePageRoute({ baseUrl, routes: initialRoutes, }: {
    routes: RouteConfig[];
    baseUrl: string;
}): RouteConfig | undefined;
/**
 * Fetches the route that points to "/". Use this instead of the naive "/",
 * because the homepage may not exist.
 */
export declare function useHomePageRoute(): RouteConfig | undefined;
//# sourceMappingURL=routesUtils.d.ts.map