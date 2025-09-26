"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sitemapItemsToXmlString = sitemapItemsToXmlString;
const sitemap_1 = require("sitemap");
async function sitemapItemsToXmlString(items, options) {
    if (items.length === 0) {
        // Note: technically we could, but there is a bug in the lib code
        // and the code below would never resolve, so it's better to fail fast
        throw new Error("Can't generate a sitemap with no items");
    }
    // TODO remove sitemap lib dependency?
    //  https://github.com/ekalinin/sitemap.js
    //  it looks like an outdated confusion super old lib
    //  we might as well achieve the same result with a pure xml lib
    const sitemapStream = new sitemap_1.SitemapStream({
        // WTF is this lib reformatting the string YYYY-MM-DD to datetime...
        lastmodDateOnly: options?.lastmod === 'date',
    });
    items.forEach((item) => sitemapStream.write(item));
    sitemapStream.end();
    const buffer = await (0, sitemap_1.streamToPromise)(sitemapStream);
    return buffer.toString();
}
