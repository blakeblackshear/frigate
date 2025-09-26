"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenRoutes = flattenRoutes;
/**
 * Recursively flatten routes and only return the "leaf routes"
 * Parent routes are filtered out
 */
function flattenRoutes(routeConfig) {
    function flatten(route) {
        return route.routes ? route.routes.flatMap(flatten) : [route];
    }
    return routeConfig.flatMap(flatten);
}
//# sourceMappingURL=routeUtils.js.map