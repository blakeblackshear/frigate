"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSitemapItem = createSitemapItem;
const utils_common_1 = require("@docusaurus/utils-common");
const utils_1 = require("@docusaurus/utils");
async function getRouteLastUpdatedAt(route) {
    // Important to bail-out early here
    // This can lead to duplicated getLastUpdate() calls and performance problems
    // See https://github.com/facebook/docusaurus/pull/11211
    if (route.metadata?.lastUpdatedAt === null) {
        return null;
    }
    if (route.metadata?.lastUpdatedAt) {
        return route.metadata?.lastUpdatedAt;
    }
    if (route.metadata?.sourceFilePath) {
        const lastUpdate = await (0, utils_1.getLastUpdate)(route.metadata?.sourceFilePath);
        return lastUpdate?.lastUpdatedAt ?? null;
    }
    return undefined;
}
const LastmodFormatters = {
    date: (timestamp) => new Date(timestamp).toISOString().split('T')[0],
    datetime: (timestamp) => new Date(timestamp).toISOString(),
};
function formatLastmod(timestamp, lastmodOption) {
    const format = LastmodFormatters[lastmodOption];
    return format(timestamp);
}
async function getRouteLastmod({ route, lastmod, }) {
    if (lastmod === null) {
        return null;
    }
    const lastUpdatedAt = (await getRouteLastUpdatedAt(route)) ?? null;
    return lastUpdatedAt ? formatLastmod(lastUpdatedAt, lastmod) : null;
}
async function createSitemapItem({ route, siteConfig, options, }) {
    const { changefreq, priority, lastmod } = options;
    return {
        url: (0, utils_1.normalizeUrl)([
            siteConfig.url,
            (0, utils_common_1.applyTrailingSlash)(route.path, {
                trailingSlash: siteConfig.trailingSlash,
                baseUrl: siteConfig.baseUrl,
            }),
        ]),
        changefreq,
        priority,
        lastmod: await getRouteLastmod({ route, lastmod }),
    };
}
