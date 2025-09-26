"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDuplicateRoutes = handleDuplicateRoutes;
exports.getRoutesPaths = getRoutesPaths;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
function handleDuplicateRoutes(routes, onDuplicateRoutes) {
    if (onDuplicateRoutes === 'ignore') {
        return;
    }
    const allRoutes = (0, utils_1.flattenRoutes)(routes).map((routeConfig) => routeConfig.path);
    const seenRoutes = new Set();
    const duplicatePaths = allRoutes.filter((route) => {
        if (seenRoutes.has(route)) {
            return true;
        }
        seenRoutes.add(route);
        return false;
    });
    if (duplicatePaths.length > 0) {
        logger_1.default.report(onDuplicateRoutes) `Duplicate routes found!${duplicatePaths.map((duplicateRoute) => logger_1.default.interpolate `Attempting to create page at url=${duplicateRoute}, but a page already exists at this route.`)}
This could lead to non-deterministic routing behavior.`;
    }
}
/**
 * Old stuff
 * As far as I understand, this is what permits to SSG the 404.html file
 * This is rendered through the catch-all ComponentCreator("*") route
 * Note CDNs only understand the 404.html file by convention
 * The extension probably permits to avoid emitting "/404/index.html"
 *
 * TODO we should probably deprecate/remove "postBuild({routesPaths})
 *  The 404 generation handling can be moved to the SSG code
 *  We only need getAllFinalRoutes() utils IMHO
 *  This would be a plugin lifecycle breaking change :/
 *  Although not many plugins probably use this
 *
 */
const NotFoundRoutePath = '/404.html';
function getRoutesPaths(routeConfigs, baseUrl) {
    return [
        (0, utils_1.normalizeUrl)([baseUrl, NotFoundRoutePath]),
        ...(0, utils_1.flattenRoutes)(routeConfigs).map((r) => r.path),
    ];
}
