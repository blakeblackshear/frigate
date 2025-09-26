"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createSitemap;
const utils_1 = require("@docusaurus/utils");
const xml_1 = require("./xml");
const createSitemapItem_1 = require("./createSitemapItem");
const head_1 = require("./head");
// Not all routes should appear in the sitemap, and we should filter:
// - parent routes, used for layouts
// - routes matching options.ignorePatterns
// - routes with no index metadata
function getSitemapRoutes({ routes, routesBuildMetadata, options, }) {
    const { ignorePatterns } = options;
    const ignoreMatcher = (0, utils_1.createMatcher)(ignorePatterns);
    function isRouteExcluded(route) {
        return (ignoreMatcher(route.path) ||
            (0, head_1.isNoIndexMetaRoute)({ routesBuildMetadata, route: route.path }));
    }
    return (0, utils_1.flattenRoutes)(routes).filter((route) => !isRouteExcluded(route));
}
// Our default implementation receives some additional parameters on purpose
function createDefaultCreateSitemapItems(internalParams) {
    return async (params) => {
        const sitemapRoutes = getSitemapRoutes({ ...params, ...internalParams });
        if (sitemapRoutes.length === 0) {
            return [];
        }
        return Promise.all(sitemapRoutes.map((route) => (0, createSitemapItem_1.createSitemapItem)({
            route,
            siteConfig: params.siteConfig,
            options: internalParams.options,
        })));
    };
}
async function createSitemap(params) {
    const { routesBuildMetadata, options, routes, siteConfig } = params;
    const defaultCreateSitemapItems = createDefaultCreateSitemapItems({ routesBuildMetadata, options });
    const sitemapItems = params.options.createSitemapItems
        ? await params.options.createSitemapItems({
            routes,
            siteConfig,
            defaultCreateSitemapItems,
        })
        : await defaultCreateSitemapItems({
            routes,
            siteConfig,
        });
    if (sitemapItems.length === 0) {
        return null;
    }
    const xmlString = await (0, xml_1.sitemapItemsToXmlString)(sitemapItems, {
        lastmod: params.options.lastmod,
    });
    return xmlString;
}
