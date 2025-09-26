"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRouteTrailingSlash = applyRouteTrailingSlash;
exports.sortRoutes = sortRoutes;
const utils_common_1 = require("@docusaurus/utils-common");
/** Recursively applies trailing slash config to all nested routes. */
function applyRouteTrailingSlash(route, params) {
    return {
        ...route,
        path: (0, utils_common_1.applyTrailingSlash)(route.path, params),
        ...(route.routes && {
            routes: route.routes.map((subroute) => applyRouteTrailingSlash(subroute, params)),
        }),
    };
}
function sortRoutes(routesToSort, baseUrl) {
    const routeConfigs = [...routesToSort];
    // Sort the route config. This ensures that route with nested
    // routes is always placed last.
    routeConfigs.sort((a, b) => {
        // Root route should get placed last.
        if (a.path === baseUrl && b.path !== baseUrl) {
            return 1;
        }
        if (a.path !== baseUrl && b.path === baseUrl) {
            return -1;
        }
        if (a.routes && !b.routes) {
            return 1;
        }
        if (!a.routes && b.routes) {
            return -1;
        }
        // If both are parent routes (for example routeBasePath: "/" and "/docs/"
        // We must order them carefully in case of overlapping paths
        if (a.routes && b.routes) {
            if (a.path === b.path) {
                // We don't really support that kind of routing ATM
                // React-Router by default will only "enter" a single parent route
            }
            else {
                if (a.path.includes(b.path)) {
                    return -1;
                }
                if (b.path.includes(a.path)) {
                    return 1;
                }
            }
        }
        // Higher priority get placed first.
        if (a.priority || b.priority) {
            const priorityA = a.priority ?? 0;
            const priorityB = b.priority ?? 0;
            const score = priorityB - priorityA;
            if (score !== 0) {
                return score;
            }
        }
        return a.path.localeCompare(b.path);
    });
    routeConfigs.forEach((routeConfig) => {
        if (routeConfig.routes) {
            routeConfig.routes = sortRoutes(routeConfig.routes, baseUrl);
        }
    });
    return routeConfigs;
}
